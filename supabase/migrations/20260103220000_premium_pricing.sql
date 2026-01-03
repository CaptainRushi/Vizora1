-- UPDATE PRICING TO PREMIUM TIER STRATEGY
-- Goal: $10K MRR through higher ARPU, not volume
-- Philosophy: Schema intelligence platform, not commodity tool

-- Update existing plans with new pricing
update billing_plans set
  price_inr = 1499,
  project_limit = 5,
  version_limit = 30,
  allow_exports = true,
  allow_designer = true,
  allow_team = false,
  ai_level = 'table'
where id = 'pro';

update billing_plans set
  price_inr = 4999,
  project_limit = 20,
  version_limit = -1,  -- unlimited
  allow_exports = true,
  allow_designer = true,
  allow_team = true,
  ai_level = 'full'
where id = 'teams';

-- Add new Business tier (optional high-leverage tier)
insert into billing_plans (id, price_inr, project_limit, version_limit, allow_exports, allow_designer, allow_team, ai_level)
values ('business', 9999, -1, -1, true, true, true, 'full')
on conflict (id) do update set
  price_inr = 9999,
  project_limit = -1,  -- unlimited
  version_limit = -1,  -- unlimited
  allow_exports = excluded.allow_exports,
  allow_designer = excluded.allow_designer,
  allow_team = excluded.allow_team,
  ai_level = excluded.ai_level;

-- Add display metadata columns for better UI presentation
alter table billing_plans add column if not exists display_name text;
alter table billing_plans add column if not exists tagline text;
alter table billing_plans add column if not exists cta_text text default 'Unlock';

-- Update display metadata
update billing_plans set
  display_name = 'Free',
  tagline = 'Evaluation only',
  cta_text = 'Get Started'
where id = 'free';

update billing_plans set
  display_name = 'Pro',
  tagline = 'Solo devs & freelancers',
  cta_text = 'Unlock Pro'
where id = 'pro';

update billing_plans set
  display_name = 'Teams',
  tagline = 'Startups & agencies',
  cta_text = 'Unlock Teams'
where id = 'teams';

update billing_plans set
  display_name = 'Business',
  tagline = 'Enterprise & white-label',
  cta_text = 'Unlock Business'
where id = 'business';
