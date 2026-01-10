-- Bump Free Tier Limit to 2 Projects (BETA ADJUSTMENT)
-- This ensures the billing plan aligns with the Beta promise of 2 projects.
INSERT INTO billing_plans (id, price_inr, project_limit, version_limit, validity_days, allow_exports, allow_designer, allow_team, ai_level)
VALUES 
  ('free', 0, 2, 2, 0, false, false, false, 'db')
ON CONFLICT (id) DO UPDATE SET
  project_limit = 2;
