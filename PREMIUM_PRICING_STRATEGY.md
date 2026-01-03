# VIZORA PREMIUM PRICING IMPLEMENTATION

## STRATEGIC POSITIONING
**Philosophy**: Schema Intelligence Platform, not a commodity diagram tool
**Target**: $10K MRR through higher ARPU, not volume
**Market**: Developers who pay for operational ROI, not design tooling

---

## PRICING TIERS

### 1. FREE (Lead Funnel)
**Price**: ₹0/month
**Purpose**: Evaluation only - intentionally limited

**Limits**:
- 1 project
- 2 schema versions
- ER diagram (view-only)
- DB-level AI summary only
- Docs preview only
- ❌ No exports
- ❌ No designer
- ❌ No team

**Strategy**: Keep free tier limited to drive upgrades

---

### 2. PRO (Solo Devs & Freelancers)
**Price**: ₹1,499/month (~$18/month)
**Tagline**: "Solo devs & freelancers"
**CTA**: "Unlock Pro"

**Why This Works**:
- Prisma, DB tools, and codegen already charge $19-$29
- You provide diagram + docs + AI + history
- Globally reasonable price point

**Features**:
- 5 projects
- 30 schema versions per project
- Full ER diagrams
- Table-level AI explanations
- Full Markdown docs
- PNG / SVG / MD exports
- SQL Designer
- ❌ No team collaboration

**MRR Math**:
- 150 users × ₹1,499 = ₹2.25L/month (~$2.7K)

---

### 3. TEAMS (Startups & Agencies) — CORE REVENUE
**Price**: ₹4,999/month (~$60/month)
**Tagline**: "Startups & agencies"
**CTA**: "Unlock Teams"

**Why This Is Your $10K Engine**:
- ₹4,999/month is less than 1 engineer hour
- Easy company card expense
- Easy agency pass-through billing
- This is where volume × price = $10K MRR

**Features**:
- 20 projects
- **Unlimited** schema versions
- Full AI (DB + tables + relations)
- Schema comments & notes
- High-resolution exports
- **Team collaboration**
- Priority rendering
- Team-ready workspace structure

**MRR Math**:
- 120 teams × ₹4,999 = ₹6L/month (~$7.2K)

---

### 4. BUSINESS (Optional High-Leverage Tier)
**Price**: ₹9,999/month (~$120/month)
**Tagline**: "Enterprise & white-label"
**CTA**: "Unlock Business"

**Why This Exists**:
- You don't need many customers here
- High leverage for agencies and consultancies
- White-label capability is a premium feature

**Features**:
- **Unlimited** projects
- **Unlimited** versions
- **Unlimited** team members
- White-label exports (no Vizora branding)
- Dedicated priority queue
- Early feature access

**MRR Math**:
- 20 customers × ₹9,999 = ₹2L/month (~$2.4K)

---

## TOTAL MRR TARGET (REALISTIC MIX)

| Plan     | Users | Price    | MRR          |
|----------|-------|----------|--------------|
| Pro      | 150   | ₹1,499   | ₹2.25L       |
| Teams    | 120   | ₹4,999   | ₹6.0L        |
| Business | 20    | ₹9,999   | ₹2.0L        |
| **TOTAL**| —     | —        | **₹10.25L/month** (~$12K MRR) |

**You cross $10K MRR without hype, ads, or scale.**

---

## WHY THIS PRICING CONVERTS

### 1. You Are Not a "Diagram Tool"
You are:
- Documentation generator
- Onboarding accelerator
- Schema intelligence layer
- **This is operational ROI, not design tooling**

### 2. Teams Pay Easily
₹4,999/month is:
- Less than 1 engineer hour
- Easy company card expense
- Easy agency pass-through

### 3. Solo Devs Feel It's Fair
₹1,499/month:
- Comparable to Prisma Pro, Postman, etc.
- Justified by AI + docs + history
- Saves hours of manual documentation

---

## IMPLEMENTATION DETAILS

### Database Schema
- **Migration**: `20260103220000_premium_pricing.sql`
- **Plans Table**: `billing_plans`
  - Added `display_name`, `tagline`, `cta_text` columns
  - Updated pricing for all tiers
  - Added new `business` tier

### Backend Logic (`server/billing.ts`)
- Updated fallback defaults to match new pricing
- No enforcement logic changes needed
- Limits enforced at workspace level:
  ```typescript
  if (plan === "pro") projectLimit = 5;
  if (plan === "teams") projectLimit = 20;
  if (plan === "business") projectLimit = Infinity;
  ```

### Feature Enforcement
- **Projects**: Enforced via `checkProjectLimit()`
- **Versions**: Enforced via `checkVersionLimit()`
- **Exports**: Enforced via `checkFeatureAccess('exports')`
- **Designer**: Enforced via `checkFeatureAccess('designer')`
- **Team**: Enforced via `checkFeatureAccess('team')`
- **AI Level**: Enforced via `getAiAccessLevel()`

---

## UI/UX CHANGES NEEDED

### 1. Copy Changes
- Change "Upgrade" → "Unlock" everywhere
- Examples:
  - "Unlock Pro"
  - "Unlock Teams"
  - "Unlock Business"

### 2. Pricing Page
- Show value proposition, not just features
- Emphasize time saved, not feature count
- Show "Popular" badge on Teams tier
- Show ROI calculator (hours saved × hourly rate)

### 3. Upgrade Prompts
- When hitting limits, show:
  - Current usage vs limit
  - What unlocking the next tier gives
  - Clear CTA with "Unlock [Plan]" button

---

## PSYCHOLOGY & POSITIONING

### DO NOT:
- ❌ Underprice
- ❌ Chase volume
- ❌ Add discounts early
- ❌ Position as a "cheap alternative"

### DO THIS INSTEAD:
- ✅ Charge confidently
- ✅ Target teams and agencies
- ✅ Show real schema value
- ✅ Sell time saved, not features
- ✅ Emphasize operational ROI

---

## NEXT STEPS

1. **Apply Migration**:
   ```bash
   npx supabase migration up
   ```

2. **Update Frontend**:
   - Pricing page with new tiers
   - Upgrade modals with "Unlock" copy
   - Billing dashboard to show current plan

3. **Marketing Copy**:
   - Landing page: Emphasize "schema intelligence"
   - Case studies: Show time saved
   - Testimonials: Focus on ROI

4. **Payment Integration**:
   - Integrate Razorpay for INR
   - Add Stripe for international
   - Set up webhook handlers

---

## SUCCESS METRICS

### Month 1-3 (Validation)
- 10 Pro users
- 5 Teams customers
- $500 MRR

### Month 4-6 (Growth)
- 50 Pro users
- 20 Teams customers
- $2K MRR

### Month 7-12 (Scale)
- 150 Pro users
- 120 Teams customers
- 20 Business customers
- **$10K+ MRR**

---

## COMPETITIVE POSITIONING

**vs Prisma Studio**: You have AI + docs + history
**vs dbdiagram.io**: You have AI + exports + team
**vs Lucidchart**: You have schema-specific intelligence
**vs Manual docs**: You save 10+ hours per project

**Your moat**: Schema intelligence, not just visualization

---

*This is not a race to the bottom. This is premium positioning for a premium product.*
