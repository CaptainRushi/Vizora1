# ONE-TIME PAYMENT BILLING SYSTEM
## Razorpay Integration (No Subscriptions, No Webhooks)

This document explains the one-time payment billing system implemented for Vizora.

---

## CORE PHILOSOPHY

- **No subscriptions**: Every payment is a one-time transaction
- **No auto-renew**: Users must manually pay again after 30 days
- **No webhooks**: Payment verification uses cryptographic signatures
- **Fixed validity**: Each payment gives exactly 30 days of access
- **Auto-fallback**: Expired plans automatically revert to Free tier

---

## ARCHITECTURE

```
Frontend (UPI Payment)
   ↓
POST /billing/create-order
   ↓
Razorpay Order Created
   ↓
User Pays (UPI/Card/Wallet)
   ↓
POST /billing/verify (with signature)
   ↓
Plan Activated (30 days)
```

---

## DATABASE SCHEMA

### 1. `billing_plans` (Static)
```sql
id          | price_inr | validity_days | limits...
------------|-----------|---------------|----------
free        | 0         | 0             | 1 project, 2 versions
pro         | 1499      | 30            | 5 projects, 30 versions
teams       | 4999      | 30            | 20 projects, unlimited
business    | 9999      | 30            | unlimited everything
```

### 2. `payments` (Payment Log)
```sql
id                  | workspace_id | plan_id | razorpay_order_id | razorpay_payment_id | amount | status  | created_at
--------------------|--------------|---------|-------------------|---------------------|--------|---------|------------
uuid                | uuid         | text    | text              | text                | int    | paid    | timestamp
```

### 3. `workspace_billing` (Active Plan)
```sql
workspace_id | plan_id | status  | start_at  | expires_at | last_payment_id
-------------|---------|---------|-----------|------------|----------------
uuid         | pro     | active  | 2026-01-03| 2026-02-02 | uuid
```

**Access Control Logic:**
- If `expires_at` is NULL → Free plan (never expires)
- If `expires_at > now()` → Plan is active
- If `expires_at < now()` → Plan expired, fallback to Free

---

## BACKEND API ROUTES

### 1. Create Payment Order
```typescript
POST /billing/create-order
Body: { workspaceId, planId }
Response: { order: { id, amount, currency }, razorpayKeyId }
```

### 2. Verify Payment
```typescript
POST /billing/verify
Body: {
  workspaceId,
  planId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature
}
Response: { success: true, expiresAt: Date }
```

### 3. Get Active Plan
```typescript
GET /billing/active-plan/:workspaceId
Response: {
  plan: 'pro',
  expired: false,
  limits: { ... },
  expiresAt: Date
}
```

### 4. Get Payment History
```typescript
GET /billing/history/:workspaceId
Response: { payments: [...] }
```

---

## RAZORPAY SETUP

### 1. Create Razorpay Account
1. Go to https://razorpay.com/
2. Sign up and complete KYC
3. Get API keys from Dashboard → Settings → API Keys

### 2. Environment Variables
Add to `server/.env`:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
```

### 3. Test Mode vs Live Mode
- **Test Mode**: Use `rzp_test_*` keys (for development)
- **Live Mode**: Use `rzp_live_*` keys (for production)

---

## FRONTEND INTEGRATION

### 1. Install Razorpay Checkout
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### 2. Payment Flow
```typescript
// Step 1: Create order
const { order, razorpayKeyId } = await fetch('/billing/create-order', {
  method: 'POST',
  body: JSON.stringify({ workspaceId, planId })
});

// Step 2: Open Razorpay Checkout
const options = {
  key: razorpayKeyId,
  amount: order.amount,
  currency: order.currency,
  order_id: order.id,
  name: 'Vizora',
  description: `${planId.toUpperCase()} Plan - 30 days`,
  handler: async (response) => {
    // Step 3: Verify payment
    await fetch('/billing/verify', {
      method: 'POST',
      body: JSON.stringify({
        workspaceId,
        planId,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature
      })
    });
  }
};

const rzp = new Razorpay(options);
rzp.open();
```

---

## SECURITY

### 1. Signature Verification
```typescript
const body = `${orderId}|${paymentId}`;
const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_KEY_SECRET)
  .update(body)
  .digest('hex');

return expectedSignature === receivedSignature;
```

This ensures:
- Payment is genuine (not forged)
- Amount hasn't been tampered with
- Order belongs to Razorpay

### 2. No Trust in Frontend
- All verification happens on backend
- Supabase service key used (not anon key)
- Frontend cannot activate plans directly

---

## EXPIRY HANDLING

### Automatic Fallback
```typescript
// When checking plan access
const activePlan = await getActivePlan(workspaceId);

if (activePlan.expired) {
  // User sees Free tier limits
  // Projects over limit become read-only
  // Exports blocked
  // AI limited to DB-level only
}
```

### Grace Period (Optional)
You can add a 3-day grace period:
```typescript
const gracePeriod = 3 * 24 * 60 * 60 * 1000; // 3 days
const isExpired = expiresAt < (now - gracePeriod);
```

---

## PAYMENT METHODS SUPPORTED

Razorpay supports:
- ✅ UPI (Google Pay, PhonePe, Paytm)
- ✅ Credit/Debit Cards
- ✅ Net Banking
- ✅ Wallets (Paytm, PhonePe, Amazon Pay)

**Recommended for India**: UPI (instant, no fees, high success rate)

---

## TESTING

### Test Cards (Razorpay Test Mode)
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
```

### Test UPI
```
UPI ID: success@razorpay
```

---

## PRODUCTION CHECKLIST

- [ ] Complete Razorpay KYC
- [ ] Switch to Live API keys
- [ ] Update `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- [ ] Test live payment with ₹1
- [ ] Set up email notifications for successful payments
- [ ] Add payment receipt generation
- [ ] Implement refund policy (if needed)

---

## WHY THIS APPROACH WORKS

1. **Simple**: No complex subscription management
2. **Transparent**: Users know exactly what they're paying for
3. **Flexible**: Users can skip months without penalty
4. **Reliable**: No webhook failures
5. **Indian-friendly**: UPI is the preferred payment method
6. **No lock-in**: Users can downgrade anytime (just don't renew)

---

## MIGRATION FROM OLD SYSTEM

If you have existing `workspace_billing` records:
```sql
-- Set free plans to never expire
UPDATE workspace_billing 
SET expires_at = NULL 
WHERE plan_id = 'free';

-- Set paid plans to expire in 30 days from now
UPDATE workspace_billing 
SET 
  start_at = NOW(),
  expires_at = NOW() + INTERVAL '30 days'
WHERE plan_id != 'free' AND expires_at IS NULL;
```

---

## SUPPORT

For Razorpay issues:
- Dashboard: https://dashboard.razorpay.com/
- Docs: https://razorpay.com/docs/
- Support: support@razorpay.com

For implementation questions:
- Check `server/razorpay.ts` for payment logic
- Check `server/index.ts` for API routes
- Check `supabase/migrations/20260103230000_onetime_payment_billing.sql` for schema
