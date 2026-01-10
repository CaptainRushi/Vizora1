import { createClient } from '@supabase/supabase-js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const sanitize = (val: string) => val.trim().replace(/^[\"']|[\"']$/g, '');
const supabaseUrl = sanitize(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
const supabaseKey = sanitize(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '');
const supabase = createClient(supabaseUrl, supabaseKey);

// Razorpay client (one-time payments only)
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';

if (!razorpayKeyId) {
    console.warn('[Razorpay] RAZORPAY_KEY_ID is missing. Payments will fail.');
}

const razorpay = new Razorpay({
    key_id: razorpayKeyId || 'rzp_test_dummy',
    key_secret: razorpayKeySecret || 'dummy_secret'
});

export interface PaymentOrder {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
}

/**
 * Create a one-time Razorpay order for workspace upgrade
 * No subscriptions, no auto-renew
 */
export async function createPaymentOrder(
    workspaceId: string,
    planId: string
): Promise<PaymentOrder> {
    // Get plan details
    const { data: plan, error: planError } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('id', planId)
        .single();

    if (planError || !plan) {
        throw new Error('Invalid plan selected');
    }

    if (plan.price_inr === 0) {
        throw new Error('Cannot create payment for free plan');
    }

    // Create Razorpay order (one-time payment)
    const order: any = await razorpay.orders.create({
        amount: plan.price_inr * 100, // Convert to paise
        currency: 'INR',
        receipt: `ws_${workspaceId}_${Date.now()}`
    });

    // Log payment in database
    const { error: paymentError } = await supabase
        .from('payments')
        .insert({
            workspace_id: workspaceId,
            plan_id: planId,
            razorpay_order_id: order.id,
            amount: plan.price_inr,
            status: 'created'
        });

    if (paymentError) {
        console.error('Failed to log payment:', paymentError);
        throw new Error('Failed to create payment record');
    }

    return {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
    };
}

/**
 * Verify Razorpay payment signature
 * Cryptographic verification - no webhook needed
 */
export function verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string
): boolean {
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(body)
        .digest('hex');

    return expectedSignature === signature;
}

/**
 * Activate plan after successful payment verification
 * Sets fixed 30-day validity (no auto-renew)
 */
export async function activatePlan(
    workspaceId: string,
    planId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
): Promise<{ success: boolean; expiresAt: Date }> {
    // Verify signature
    const isValid = verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
    );

    if (!isValid) {
        throw new Error('Payment verification failed');
    }

    // Get plan details
    const { data: plan } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('id', planId)
        .single();

    if (!plan) {
        throw new Error('Plan not found');
    }

    // Calculate expiry (fixed validity, no auto-renew)
    const startAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(startAt.getDate() + plan.validity_days);

    // Update payment record
    const { data: payment } = await supabase
        .from('payments')
        .update({
            razorpay_payment_id: razorpayPaymentId,
            status: 'paid'
        })
        .eq('razorpay_order_id', razorpayOrderId)
        .select()
        .single();

    if (!payment) {
        throw new Error('Payment record not found');
    }

    // Activate plan (upsert workspace_billing)
    const { error: billingError } = await supabase
        .from('workspace_billing')
        .upsert({
            workspace_id: workspaceId,
            plan_id: planId,
            status: 'active',
            start_at: startAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            last_payment_id: payment.id
        });

    if (billingError) {
        console.error('Failed to activate plan:', billingError);
        throw new Error('Failed to activate plan');
    }

    // If upgrading to team plan, update workspace type
    if (plan.allow_team) {
        await supabase
            .from('workspaces')
            .update({ type: 'team' })
            .eq('id', workspaceId);
    }

    console.log(`[Billing] Plan ${planId} activated for workspace ${workspaceId} until ${expiresAt.toISOString()}`);

    return { success: true, expiresAt };
}

/**
 * Get active plan for workspace (with expiry check)
 * This is the central authority for plan access
 */
export async function getActivePlan(workspaceId: string) {
    const { data } = await supabase
        .from('workspace_billing')
        .select('*, billing_plans(*)')
        .eq('workspace_id', workspaceId)
        .single();

    // No billing record = free plan
    if (!data) {
        const { data: freePlan } = await supabase
            .from('billing_plans')
            .select('*')
            .eq('id', 'free')
            .single();

        return {
            plan: 'free',
            expired: false,
            limits: freePlan,
            expiresAt: null
        };
    }

    // Check if plan is expired
    const now = new Date();
    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
    const isExpired = expiresAt ? expiresAt < now : false;

    // If expired, return free plan limits
    if (isExpired) {
        const { data: freePlan } = await supabase
            .from('billing_plans')
            .select('*')
            .eq('id', 'free')
            .single();

        // Mark as expired in database
        await supabase
            .from('workspace_billing')
            .update({ status: 'expired' })
            .eq('workspace_id', workspaceId);

        return {
            plan: 'free',
            expired: true,
            limits: freePlan,
            expiresAt: expiresAt
        };
    }

    // Active paid plan
    return {
        plan: data.plan_id,
        expired: false,
        limits: data.billing_plans,
        expiresAt: expiresAt
    };
}

/**
 * Get payment history for workspace
 */
export async function getPaymentHistory(workspaceId: string) {
    const { data, error } = await supabase
        .from('payments')
        .select('*, billing_plans(id, price_inr)')
        .eq('workspace_id', workspaceId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch payment history:', error);
        return [];
    }

    return data || [];
}
