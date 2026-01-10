
-- VIZORA PLATFORM - SINGLE CONSOLIDATED SCHEMA
-- This file represents the complete, single source of truth for the database.
-- Includes: Extensions, Tables, Enums, RLS, Functions, Triggers, and Seed Data.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES (Defined BEFORE functions that reference them)

-- 2.1 PROFILES (Extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    role_title TEXT,
    onboarded BOOLEAN DEFAULT FALSE,
    default_workspace_id UUID, -- References workspaces(id) - Added via ALTER later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('personal', 'team')),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resolve cyclic dependency for profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_default_workspace') THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT fk_profiles_default_workspace 
        FOREIGN KEY (default_workspace_id) REFERENCES workspaces(id);
    END IF;
END $$;

-- 2.3 WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- 2.4 BILLING PLANS (Static Definitions)
CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY,
  price_inr INT NOT NULL,
  project_limit INT NOT NULL,
  version_limit INT NOT NULL, -- -1 for unlimited
  validity_days INT NOT NULL DEFAULT 30,
  allow_exports BOOLEAN NOT NULL DEFAULT FALSE,
  allow_designer BOOLEAN NOT NULL DEFAULT FALSE,
  allow_team BOOLEAN NOT NULL DEFAULT FALSE,
  ai_level TEXT NOT NULL CHECK (ai_level IN ('none', 'db', 'table', 'full'))
);

-- 2.5 PAYMENTS (Log)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES billing_plans(id),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  amount INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'paid', 'failed')) DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 WORKSPACE BILLING (Active State)
CREATE TABLE IF NOT EXISTS workspace_billing (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES billing_plans(id) DEFAULT 'free',
    status TEXT CHECK (status IN ('active', 'expired')) DEFAULT 'active',
    start_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Null for free plan (never expires)
    last_payment_id UUID REFERENCES payments(id)
);

-- 2.7 WORKSPACE USAGE (Counters)
CREATE TABLE IF NOT EXISTS workspace_usage (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  projects_count INT DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  ai_tokens_used BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 PROJECTS
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  schema_type TEXT NOT NULL, -- sql | prisma | drizzle
  current_step TEXT DEFAULT 'schema',
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id), 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9 SCHEMA VERSIONS
CREATE TABLE IF NOT EXISTS schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  raw_schema TEXT NOT NULL,
  normalized_schema JSONB NOT NULL,
  schema_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.10 FEATURE TABLES
CREATE TABLE IF NOT EXISTS diagram_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  diagram_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_code (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  language TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_name TEXT,
  mode TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentation_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version INT NOT NULL,
  pdf_url TEXT, 
  markdown TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_settings (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  explanation_mode TEXT DEFAULT 'developer',
  auto_generate_docs BOOLEAN DEFAULT TRUE,
  retain_all_versions BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  from_version INT,
  to_version INT NOT NULL,
  change_type TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.11 PRIVATE BETA SYSTEM
CREATE TABLE IF NOT EXISTS beta_usage (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  projects_created INT DEFAULT 0,
  versions_created INT DEFAULT 0,
  diagrams_viewed INT DEFAULT 0,
  docs_generated INT DEFAULT 0,
  beta_ends_at TIMESTAMPTZ,
  first_used_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  context TEXT, -- dashboard | diagram | docs | schema_paste | limit_hit
  rating INT CHECK (rating >= 1 AND rating <= 5),
  answer_confusing TEXT,
  answer_helpful TEXT,
  answer_missing TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.12 WORKSPACE & TEAM COLLABORATION
CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'member')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_count INT DEFAULT 0,
  max_uses INT DEFAULT 1,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy/Project-level invites support
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  invite_token TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, email, status)
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. SECURITY HELPER FUNCTIONS (After tables are defined)

CREATE OR REPLACE FUNCTION public.is_member_of(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = _workspace_id
    AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of(_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = _workspace_id
    AND user_id = auth.uid()
    AND role = 'admin'
  );
$$;

-- 4. OTHER FUNCTIONS & TRIGGERS

-- 4.1 Handle New Project
CREATE OR REPLACE FUNCTION handle_new_project() 
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Initialize settings
  INSERT INTO project_settings (project_id) VALUES (NEW.id);
  
  -- Track Beta Usage
  PERFORM public.increment_beta_usage(NEW.owner_id, 'project');
  
  -- Update workspace usage counter
  UPDATE workspace_usage 
  SET projects_count = projects_count + 1, 
      updated_at = NOW()
  WHERE workspace_id = NEW.workspace_id;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tr_new_project_settings
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_new_project();

-- 4.2 Enforce Beta Limits
CREATE OR REPLACE FUNCTION public.prevent_extra_projects()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM projects WHERE owner_id = NEW.owner_id) >= 2 THEN
    RAISE EXCEPTION 'You can''t create more than 2 projects during the private beta.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_beta_project_limit ON projects;
CREATE TRIGGER tr_beta_project_limit
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION prevent_extra_projects();

-- 4.2 Initialize Workspace Billing & Usage
CREATE OR REPLACE FUNCTION handle_new_workspace_billing()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO workspace_billing (workspace_id, plan_id, start_at, expires_at) 
  VALUES (NEW.id, 'free', NOW(), NULL);
  
  INSERT INTO workspace_usage (workspace_id) 
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tr_init_workspace_billing
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION handle_new_workspace_billing();

-- 4.3 Increment Beta Usage
CREATE OR REPLACE FUNCTION public.increment_beta_usage(u_id UUID, field TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO beta_usage (user_id, first_used_at, last_used_at)
  VALUES (u_id, NOW(), NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    projects_created = CASE WHEN field = 'project' THEN beta_usage.projects_created + 1 ELSE beta_usage.projects_created END,
    versions_created = CASE WHEN field = 'version' THEN beta_usage.versions_created + 1 ELSE beta_usage.versions_created END,
    diagrams_viewed = CASE WHEN field = 'diagram' THEN beta_usage.diagrams_viewed + 1 ELSE beta_usage.diagrams_viewed END,
    docs_generated = CASE WHEN field = 'docs' THEN beta_usage.docs_generated + 1 ELSE beta_usage.docs_generated END,
    last_used_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.4 Account Deletion Transaction
CREATE OR REPLACE FUNCTION public.delete_account_completely(
    target_user_id UUID,
    target_workspace_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ws_type TEXT;
    user_role TEXT;
BEGIN
    SELECT type INTO ws_type FROM workspaces WHERE id = target_workspace_id;
    SELECT role INTO user_role FROM workspace_members WHERE workspace_id = target_workspace_id AND user_id = target_user_id;

    IF ws_type = 'team' AND user_role != 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only admins can delete team workspaces.';
    END IF;

    DELETE FROM projects WHERE workspace_id = target_workspace_id;
    DELETE FROM workspace_invites WHERE workspace_id = target_workspace_id;
    DELETE FROM workspace_members WHERE workspace_id = target_workspace_id;
    DELETE FROM workspace_billing WHERE workspace_id = target_workspace_id;
    DELETE FROM workspace_usage WHERE workspace_id = target_workspace_id;
    UPDATE profiles SET default_workspace_id = NULL WHERE default_workspace_id = target_workspace_id;
    DELETE FROM workspaces WHERE id = target_workspace_id;
    DELETE FROM profiles WHERE id = target_user_id;
END;
$$;

-- 5. VIEWS
CREATE OR REPLACE VIEW workspace_active_plans AS
SELECT 
  wb.workspace_id,
  CASE 
    WHEN wb.expires_at IS NULL THEN wb.plan_id
    WHEN wb.expires_at > NOW() THEN wb.plan_id
    ELSE 'free'
  END AS active_plan_id,
  wb.expires_at,
  CASE
    WHEN wb.expires_at IS NULL THEN FALSE
    WHEN wb.expires_at > NOW() THEN FALSE
    ELSE TRUE
  END AS is_expired,
  bp.*
FROM workspace_billing wb
JOIN billing_plans bp ON bp.id = (
  CASE 
    WHEN wb.expires_at IS NULL THEN wb.plan_id
    WHEN wb.expires_at > NOW() THEN wb.plan_id
    ELSE 'free'
  END
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_schema_versions_lookup ON schema_versions(project_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_payments_workspace ON payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- 7. SEED DATA (Billing Plans)
INSERT INTO billing_plans (id, price_inr, project_limit, version_limit, validity_days, allow_exports, allow_designer, allow_team, ai_level)
VALUES 
  ('free', 0, 1, 2, 0, false, false, false, 'db'),
  ('pro', 1499, 5, 30, 30, true, true, false, 'table'),
  ('teams', 4999, 20, -1, 30, true, true, true, 'full'),
  ('business', 9999, -1, -1, 30, true, true, true, 'full')
ON CONFLICT (id) DO UPDATE SET
  price_inr = excluded.price_inr,
  project_limit = excluded.project_limit,
  version_limit = excluded.version_limit,
  validity_days = excluded.validity_days,
  allow_exports = excluded.allow_exports,
  allow_designer = excluded.allow_designer,
  allow_team = excluded.allow_team,
  ai_level = excluded.ai_level;

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- 8.1 POLICIES

-- PROFILES
DROP POLICY IF EXISTS "Profiles - View self" ON profiles;
CREATE POLICY "Profiles - View self" ON profiles FOR SELECT USING (id = auth.uid());
DROP POLICY IF EXISTS "Profiles - Update self" ON profiles;
CREATE POLICY "Profiles - Update self" ON profiles FOR UPDATE USING (id = auth.uid());
DROP POLICY IF EXISTS "Profiles - Insert self" ON profiles;
CREATE POLICY "Profiles - Insert self" ON profiles FOR INSERT WITH CHECK (id = auth.uid());

-- WORKSPACES
DROP POLICY IF EXISTS "Workspaces - View owned or member" ON workspaces;
CREATE POLICY "Workspaces - View owned or member" ON workspaces FOR SELECT USING (
    owner_id = auth.uid() OR public.is_member_of(id)
);

DROP POLICY IF EXISTS "Workspaces - Create own" ON workspaces;
CREATE POLICY "Workspaces - Create own" ON workspaces FOR INSERT WITH CHECK (
    owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Workspaces - Update own" ON workspaces;
CREATE POLICY "Workspaces - Update own" ON workspaces FOR UPDATE USING (
    owner_id = auth.uid() OR public.is_admin_of(id)
);

DROP POLICY IF EXISTS "Workspaces - Delete own" ON workspaces;
CREATE POLICY "Workspaces - Delete own" ON workspaces FOR DELETE USING (
    owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Workspaces - Manage own" ON workspaces;

-- WORKSPACE MEMBERS
DROP POLICY IF EXISTS "Members - View workspace colleagues" ON workspace_members;
CREATE POLICY "Members - View workspace colleagues" ON workspace_members FOR SELECT USING (
    public.is_member_of(workspace_id)
);
DROP POLICY IF EXISTS "Members - Admins manage" ON workspace_members;
CREATE POLICY "Members - Admins manage" ON workspace_members FOR ALL USING (
    public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);

-- BILLING & USAGE
DROP POLICY IF EXISTS "Billing - View own workspace" ON workspace_billing;
CREATE POLICY "Billing - View own workspace" ON workspace_billing FOR SELECT TO authenticated USING (
    public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);
DROP POLICY IF EXISTS "Usage - View own workspace" ON workspace_usage;
CREATE POLICY "Usage - View own workspace" ON workspace_usage FOR SELECT TO authenticated USING (
    public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);
DROP POLICY IF EXISTS "Plans - Public read" ON billing_plans;
CREATE POLICY "Plans - Public read" ON billing_plans FOR SELECT USING (TRUE);

-- PROJECTS
DROP POLICY IF EXISTS "Projects - View workspace projects" ON projects;
CREATE POLICY "Projects - View workspace projects" ON projects FOR SELECT USING (
    public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);
DROP POLICY IF EXISTS "Projects - Create in workspace" ON projects;
CREATE POLICY "Projects - Create in workspace" ON projects FOR INSERT WITH CHECK (
    public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);
DROP POLICY IF EXISTS "Projects - Manage in workspace" ON projects;
CREATE POLICY "Projects - Manage in workspace" ON projects FOR ALL USING (
    public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);

-- FEATURE TABLES (Common policy for all project-scoped data)
DO $$ 
DECLARE 
  t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_name IN ('schema_versions', 'diagram_states', 'generated_code', 'schema_explanations', 'documentation_outputs', 'project_settings', 'schema_changes')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "Project Data Access" ON ' || t;
    EXECUTE 'CREATE POLICY "Project Data Access" ON ' || t || ' FOR ALL USING (
      project_id IN (SELECT id FROM projects WHERE workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid() UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      ))
    )';
  END LOOP;
END $$;

-- BETA TABLES
DROP POLICY IF EXISTS "Beta Usage - View self" ON beta_usage;
CREATE POLICY "Beta Usage - View self" ON beta_usage FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Beta Usage - Manage self" ON beta_usage;
CREATE POLICY "Beta Usage - Manage self" ON beta_usage FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Feedback - Insert self" ON user_feedback;
CREATE POLICY "Feedback - Insert self" ON user_feedback FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Feedback - View self" ON user_feedback;
CREATE POLICY "Feedback - View self" ON user_feedback FOR SELECT USING (user_id = auth.uid());

-- INVITES
DROP POLICY IF EXISTS "Invites - Admins manage" ON workspace_invites;
CREATE POLICY "Invites - Admins manage" ON workspace_invites FOR ALL USING (
    public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);

-- GRANT PERMISSIONS
GRANT SELECT ON workspace_active_plans TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Allow anon to read plans
GRANT SELECT ON billing_plans TO anon;

-- ENSURE PUBLIC SCHEMA ACCESS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
