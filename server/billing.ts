import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';

dotenv.config();

const sanitize = (val: string) => val.trim().replace(/^["']|["']$/g, '');
const supabaseUrl = sanitize(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
const supabaseKey = sanitize(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '');
const supabase = createClient(supabaseUrl, supabaseKey);

export interface BillingPlan {
    id: string;
    price_inr: number;
    project_limit: number;
    version_limit: number;
    allow_exports: boolean;
    allow_designer: boolean;
    allow_team: boolean;
    ai_level: 'none' | 'db' | 'table' | 'full';
}

export interface WorkspaceUsage {
    project_count: number;
    version_count_per_project: Record<string, number>;
}

// Cache plans in memory for performance (they are static)
let PLANS_CACHE: Record<string, BillingPlan> | null = null;

async function getPlans(): Promise<Record<string, BillingPlan>> {
    if (PLANS_CACHE) return PLANS_CACHE;

    const { data, error } = await supabase.from('billing_plans').select('*');
    if (error || !data) {
        console.error("Failed to load plans", error);
        // Fallback to strict code defaults if DB fails
        return {
            free: { id: 'free', price_inr: 0, project_limit: 2, version_limit: 2, allow_exports: false, allow_designer: false, allow_team: false, ai_level: 'db' },
            pro: { id: 'pro', price_inr: 1499, project_limit: 5, version_limit: 30, allow_exports: true, allow_designer: true, allow_team: false, ai_level: 'table' },
            teams: { id: 'teams', price_inr: 4999, project_limit: 20, version_limit: -1, allow_exports: true, allow_designer: true, allow_team: true, ai_level: 'full' },
            business: { id: 'business', price_inr: 9999, project_limit: -1, version_limit: -1, allow_exports: true, allow_designer: true, allow_team: true, ai_level: 'full' }
        };
    }

    const map: Record<string, BillingPlan> = {};
    data.forEach((p: any) => map[p.id] = p);
    PLANS_CACHE = map;
    return map;
}

export async function getWorkspacePlan(workspaceId: string): Promise<BillingPlan> {
    const plans = await getPlans();

    // Hardcoded fallback in case plans object is malformed
    const freePlanFallback: BillingPlan = {
        id: 'free',
        price_inr: 0,
        project_limit: 2,
        version_limit: 2,
        allow_exports: false,
        allow_designer: false,
        allow_team: false,
        ai_level: 'db'
    };

    // Get active subscription
    const { data: billing } = await supabase
        .from('workspace_billing')
        .select('plan_id, status')
        .eq('workspace_id', workspaceId)
        .single();

    if (!billing || billing.status !== 'active') {
        return plans['free'] || plans.free || freePlanFallback;
    }

    return plans[billing.plan_id] || plans['free'] || plans.free || freePlanFallback;
}

export async function checkProjectLimit(workspaceId: string): Promise<{ allowed: boolean; message?: string }> {
    // BETA OVERRIDE: Disable billing limits during beta
    // The user explicitly requested to "not run the billing system in beta version"
    return { allowed: true };

    /*
    const plan = await getWorkspacePlan(workspaceId);


    // Count existing projects (Live count)
    const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId);

    if (error) {
        console.error("Error checking project limit:", error);
        return { allowed: false, message: "System error checking limits." };
    }

    const currentCount = count || 0;

    if (currentCount >= plan.project_limit) {
        return {
            allowed: false,
            message: `Project limit reached (${currentCount}/${plan.project_limit}). Upgrade to ${plan.id === 'free' ? 'Pro' : 'Teams'} to create more.`
        };
    }

    return { allowed: true };
    */
}

export async function checkVersionLimit(workspaceId: string, projectId: string): Promise<{ allowed: boolean; message?: string }> {
    return { allowed: true }; // Beta Override
}

export async function checkFeatureAccess(workspaceId: string, feature: 'exports' | 'designer' | 'team'): Promise<boolean> {
    return true; // Beta Override: Enable all features
}

export async function getAiAccessLevel(workspaceId: string) {
    return 'full'; // Beta Override: Give full AI access
}

// --- BILLING MUTATIONS ---

export async function upgradeWorkspace(workspaceId: string, targetPlanId: string) {
    // In a real app, this would verify payment via Stripe
    // For this implementation, we assume successful "payment" and just update the DB

    // Verify plan validity
    const plans = await getPlans();
    if (!plans[targetPlanId]) throw new Error("Invalid plan ID");

    // "Charge" the card...
    console.log(`[Billing] Charging workspace ${workspaceId} for plan ${targetPlanId}`);

    // Update DB
    const { error } = await supabase
        .from('workspace_billing')
        .upsert({
            workspace_id: workspaceId,
            plan_id: targetPlanId,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 days
        });

    if (error) throw error;

    // If upgrading to Team, we might need to update workspace type?
    // The spec says: "if (plan.allow_team) { workspace.type = 'team' }"
    // Let's enforce that.
    if (plans[targetPlanId].allow_team) {
        await supabase.from('workspaces').update({ type: 'team' }).eq('id', workspaceId);
    }

    return { success: true, plan: targetPlanId };
}
