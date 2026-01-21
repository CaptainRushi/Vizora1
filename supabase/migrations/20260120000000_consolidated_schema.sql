
-- VIZORA PLATFORM - SINGLE CONSOLIDATED SCHEMA (2026-01-20)
-- This file represents the complete, single source of truth for the database.
-- Includes: Extensions, Tables, Enums, RLS, Functions, Triggers, and Seed Data.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES (Defined BEFORE functions that reference them)

-- 2.1 USERS (Canonical User Table - formerly profiles)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    display_name TEXT,
    role TEXT,
    workspace_id UUID, -- References workspaces(id) - Added via ALTER later
    onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('personal', 'team')),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resolve cyclic dependency for users -> workspaces
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_workspace') THEN
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_workspace 
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
    END IF;
END $$;

-- 2.3 WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- 2.4 BILLING PLANS (Static Definitions)
CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY,
  price_inr INT NOT NULL,
  project_limit INT NOT NULL,
  version_limit INT NOT NULL, -- -1 for unlimited
  ai_limit INT DEFAULT -1, -- -1 for unlimited
  validity_days INT NOT NULL DEFAULT 30,
  allow_exports BOOLEAN NOT NULL DEFAULT FALSE,
  allow_designer BOOLEAN NOT NULL DEFAULT FALSE,
  allow_team BOOLEAN NOT NULL DEFAULT FALSE,
  ai_level TEXT NOT NULL CHECK (ai_level IN ('none', 'db', 'table', 'full'))
);

-- 2.5 PAYMENTS
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

-- 2.6 WORKSPACE BILLING
CREATE TABLE IF NOT EXISTS workspace_billing (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES billing_plans(id) DEFAULT 'free',
    status TEXT CHECK (status IN ('active', 'expired')) DEFAULT 'active',
    start_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Null for free plan
    last_payment_id UUID REFERENCES payments(id)
);

-- 2.7 WORKSPACE USAGE
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
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  schema_type TEXT NOT NULL, -- sql | prisma | drizzle
  current_step TEXT DEFAULT 'schema',
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id), 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9 SCHEMA VERSIONS
CREATE TABLE IF NOT EXISTS schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  version_number INT,
  raw_schema TEXT NOT NULL,
  normalized_schema JSONB NOT NULL,
  schema_hash TEXT,
  code TEXT,
  message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_by_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.10 FEATURE TABLES

-- Schema Version Diffs (Attribution)
CREATE TABLE IF NOT EXISTS schema_version_diffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    from_version INT NOT NULL,
    to_version INT NOT NULL,
    block_index INT NOT NULL,
    block_start INT NOT NULL,
    block_end INT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('added', 'modified', 'removed')),
    before_text TEXT,
    after_text TEXT,
    edited_by_user_id UUID REFERENCES auth.users(id),
    edited_by_username TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, from_version, to_version, block_index)
);

-- Real-time Code Block Attributions
CREATE TABLE IF NOT EXISTS code_block_attributions (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    block_id TEXT NOT NULL,
    start_line INT NOT NULL,
    end_line INT NOT NULL,
    last_editor_id UUID REFERENCES auth.users(id),
    last_editor_name TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, block_id)
);

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

CREATE TABLE IF NOT EXISTS schema_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    findings JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, version_number)
);

CREATE TABLE IF NOT EXISTS onboarding_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, version_number)
);

CREATE TABLE IF NOT EXISTS ask_schema_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    schema_version INT,
    question TEXT NOT NULL,
    referenced_tables TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    entity_name TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, entity_name)
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
  context TEXT,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  answer_confusing TEXT,
  answer_helpful TEXT,
  answer_missing TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.12 WORKSPACE INVITES
CREATE TABLE IF NOT EXISTS workspace_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_count INT DEFAULT 0,
  max_uses INT DEFAULT 50,
  revoked BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.13 ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  entity_type TEXT,
  entity_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.14 LEGACY PROJECT TABLES (Keep for compatibility if needed, else optional)
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

-- 2.15 PROJECT SUB-SETTINGS
CREATE TABLE IF NOT EXISTS project_schema_settings (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  input_mode TEXT DEFAULT 'mixed' CHECK (input_mode IN ('sql', 'prisma', 'mixed')),
  auto_version BOOLEAN DEFAULT TRUE,
  version_naming TEXT DEFAULT 'auto' CHECK (version_naming IN ('auto', 'timestamp', 'custom')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_intelligence_settings (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  explanation_depth TEXT DEFAULT 'concise' CHECK (explanation_depth IN ('concise', 'detailed')),
  evidence_strict BOOLEAN DEFAULT TRUE,
  auto_review BOOLEAN DEFAULT TRUE,
  auto_onboarding BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_members (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'editor' CHECK (role IN ('viewer', 'editor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- 2.16 USER SETTINGS
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  color_mode TEXT NOT NULL DEFAULT 'light' CHECK (color_mode IN ('light', 'dark', 'system')),
  diagram_theme TEXT NOT NULL DEFAULT 'auto' CHECK (diagram_theme IN ('light', 'dark', 'auto')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interaction_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,
  auto_focus_schema BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intelligence_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  explanation_mode TEXT NOT NULL DEFAULT 'developer' CHECK (explanation_mode IN ('developer', 'pm', 'onboarding')),
  evidence_strict BOOLEAN NOT NULL DEFAULT TRUE,
  auto_schema_review BOOLEAN NOT NULL DEFAULT TRUE,
  auto_onboarding BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_schema_changes BOOLEAN NOT NULL DEFAULT TRUE,
  email_team_activity BOOLEAN NOT NULL DEFAULT FALSE,
  email_ai_summary BOOLEAN NOT NULL DEFAULT FALSE,
  inapp_schema BOOLEAN NOT NULL DEFAULT TRUE,
  inapp_team BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS privacy_settings (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  retain_all_versions BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FUNCTIONS & TRIGGERS

-- 3.1 Security Helpers
CREATE OR REPLACE FUNCTION public.is_member_of(_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of(_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid() AND role = 'admin'
  );
$$;

-- 3.2 User Email Sync Trigger
CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_sync_user_email
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_sync();

-- 3.3 New User Setup Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, username, display_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), 
        NEW.raw_user_meta_data->>'full_name'
    )
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_new_user_setup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- 3.4 Handle New Project (Settings & Usage)
CREATE OR REPLACE FUNCTION handle_new_project() 
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO project_settings (project_id) VALUES (NEW.id);
  PERFORM public.increment_beta_usage(NEW.owner_id, 'project');
  UPDATE workspace_usage SET projects_count = projects_count + 1, updated_at = NOW() WHERE workspace_id = NEW.workspace_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tr_new_project_settings
  AFTER INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION handle_new_project();

-- 3.5 Prevent Extra Projects (Beta)
CREATE OR REPLACE FUNCTION public.prevent_extra_projects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM projects WHERE owner_id = NEW.owner_id) >= 2 THEN
    RAISE EXCEPTION 'You can''t create more than 2 projects during the private beta.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tr_beta_project_limit
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION prevent_extra_projects();

-- 3.6 Initialize Workspace Billing
CREATE OR REPLACE FUNCTION handle_new_workspace_billing()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO workspace_billing (workspace_id, plan_id, start_at, expires_at) VALUES (NEW.id, 'free', NOW(), NULL);
  INSERT INTO workspace_usage (workspace_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER tr_init_workspace_billing
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION handle_new_workspace_billing();

-- 3.7 Increment Beta Usage
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

-- 3.8 Account Deletion (Updated for users table)
CREATE OR REPLACE FUNCTION public.delete_account_completely(
    target_user_id UUID,
    target_workspace_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    UPDATE users SET workspace_id = NULL WHERE workspace_id = target_workspace_id;
    DELETE FROM workspaces WHERE id = target_workspace_id;
    DELETE FROM users WHERE id = target_user_id;
END;
$$;

-- 4. RLS POLICIES

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users - View all" ON users;
CREATE POLICY "Users - View all" ON users FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users - Update self" ON users;
CREATE POLICY "Users - Update self" ON users FOR UPDATE USING (id = auth.uid());
DROP POLICY IF EXISTS "Users - Insert self" ON users;
CREATE POLICY "Users - Insert self" ON users FOR INSERT WITH CHECK (id = auth.uid());

-- WORKSPACES
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspaces - View owned or member" ON workspaces;
CREATE POLICY "Workspaces - View owned or member" ON workspaces FOR SELECT USING (owner_id = auth.uid() OR public.is_member_of(id));
DROP POLICY IF EXISTS "Workspaces - Create own" ON workspaces;
CREATE POLICY "Workspaces - Create own" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "Workspaces - Update own" ON workspaces;
CREATE POLICY "Workspaces - Update own" ON workspaces FOR UPDATE USING (owner_id = auth.uid() OR public.is_admin_of(id));
DROP POLICY IF EXISTS "Workspaces - Delete own" ON workspaces;
CREATE POLICY "Workspaces - Delete own" ON workspaces FOR DELETE USING (owner_id = auth.uid());

-- MEMBERS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members - View workspace colleagues" ON workspace_members;
CREATE POLICY "Members - View workspace colleagues" ON workspace_members FOR SELECT USING (public.is_member_of(workspace_id));
DROP POLICY IF EXISTS "Members - Insert" ON workspace_members;
CREATE POLICY "Members - Insert" ON workspace_members FOR INSERT WITH CHECK (
    (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()) OR
    (user_id = auth.uid() AND EXISTS (SELECT 1 FROM workspace_invites WHERE workspace_id = workspace_members.workspace_id AND is_active = TRUE AND revoked = FALSE AND expires_at > NOW() AND used_count < max_uses))
);
DROP POLICY IF EXISTS "Members - Admins manage" ON workspace_members;
CREATE POLICY "Members - Admins manage" ON workspace_members FOR UPDATE USING (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
DROP POLICY IF EXISTS "Members - Admins delete" ON workspace_members;
CREATE POLICY "Members - Admins delete" ON workspace_members FOR DELETE USING (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());

-- SETTINGS & DATA
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY; ALTER TABLE team_members ENABLE ROW LEVEL SECURITY; ALTER TABLE project_schema_settings ENABLE ROW LEVEL SECURITY; ALTER TABLE project_intelligence_settings ENABLE ROW LEVEL SECURITY; ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
DO $$ 
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('schema_versions', 'diagram_states', 'generated_code', 'schema_explanations', 'documentation_outputs', 'project_settings', 'schema_changes', 'schema_reviews', 'onboarding_guides', 'ask_schema_logs', 'schema_comments')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "Project Data Access" ON ' || t;
    EXECUTE 'CREATE POLICY "Project Data Access" ON ' || t || ' FOR ALL USING (project_id IN (SELECT id FROM projects WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid() UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())))';
    EXECUTE 'ALTER TABLE ' || t || ' ENABLE ROW LEVEL SECURITY';
  END LOOP;
END $$;

-- CODE BLOCK ATTRIBUTIONS (Workspace Scoped)
ALTER TABLE code_block_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attributions - View workspace" ON code_block_attributions FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR
    public.is_member_of(workspace_id)
);
CREATE POLICY "Attributions - Manage workspace" ON code_block_attributions FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR
    public.is_member_of(workspace_id)
);

-- SCHEMA VERSION DIFFS (Workspace Scoped)
ALTER TABLE schema_version_diffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Version Diffs - View workspace" ON schema_version_diffs FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);
CREATE POLICY "Version Diffs - Create workspace" ON schema_version_diffs FOR INSERT WITH CHECK (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);
CREATE POLICY "Version Diffs - Delete workspace" ON schema_version_diffs FOR DELETE USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
    OR public.is_admin_of(workspace_id)
);

-- INVITES
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Invites - Validate by token" ON workspace_invites FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = TRUE AND revoked = FALSE AND expires_at > NOW());
CREATE POLICY "Invites - Admin full access" ON workspace_invites FOR ALL USING (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Invites - Update used count" ON workspace_invites FOR UPDATE USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- ACTIVITY LOGS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activity Logs - View workspace" ON activity_logs FOR SELECT USING (public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Activity Logs - Insert" ON activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- BILLING & USAGE
ALTER TABLE workspace_billing ENABLE ROW LEVEL SECURITY; ALTER TABLE workspace_usage ENABLE ROW LEVEL SECURITY; ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY; ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Billing - View own" ON workspace_billing FOR SELECT USING (public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Usage - View own" ON workspace_usage FOR SELECT USING (public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Plans - Public read" ON billing_plans FOR SELECT USING (TRUE);

-- PROJECTS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects - View workspace" ON projects FOR SELECT USING (public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Projects - Create" ON projects FOR INSERT WITH CHECK (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Projects - Manage" ON projects FOR ALL USING (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());

-- SCHEMA VERSIONS SPECIFIC
CREATE POLICY "Schema Versions - Delete" ON schema_versions FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR public.is_admin_of(workspace_id));

-- 5. INDEXES (Optimized)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_schema_versions_project ON schema_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_schema_versions_created_at ON schema_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_time ON activity_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_active ON workspace_invites(workspace_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_documentation_outputs_project ON documentation_outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_ask_schema_logs_project ON ask_schema_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_version_diffs_lookup ON schema_version_diffs(workspace_id, from_version, to_version);

-- 6. SEED DATA
INSERT INTO billing_plans (id, price_inr, project_limit, version_limit, ai_limit, validity_days, allow_exports, allow_designer, allow_team, ai_level)
VALUES 
  ('free', 0, 1, 2, 5, 0, false, false, false, 'db'),
  ('pro', 1499, 5, 30, 100, 30, true, true, false, 'table'),
  ('teams', 4999, 20, -1, 500, 30, true, true, true, 'full'),
  ('business', 9999, -1, -1, -1, 30, true, true, true, 'full')
ON CONFLICT (id) DO NOTHING;