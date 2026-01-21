-- ==============================================================================
-- VIZORA MASTER PLATFORM SCHEMA (2026-01-21)
-- ==============================================================================
-- This file is the SINGLE SOURCE OF TRUTH for the entire Vizora Platform.
-- It enforces:
-- 1. Unified Identity (universal_users)
-- 2. Strict Project-Workspace Hierarchy (Projects MUST belong to a Workspace)
-- 3. High Beta Limits (100 Projects)
-- 4. Correct Permissions & RLS (No 403 Errors)

-- ⚠️ WARNING: TO START FRESH, UNCOMMENT THE FOLLOWING LINES:
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;

-- ==============================================================================
-- 1. EXTENSIONS & BASICS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant usage immediately to avoid basic permission errors
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- 2. IDENTITY & WORKSPACES (The Core Hierarchy)
-- ==============================================================================

-- 2.1 Universal Users (The "Real" User Record)
CREATE TABLE IF NOT EXISTS universal_users (
    universal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Workspaces (The Parent Container)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('personal', 'team')),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Workspace Members (Access Control)
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- 2.4 Projects (The Child - STRICTLY LINKED)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    schema_type TEXT NOT NULL, -- sql | prisma | drizzle
    current_step TEXT DEFAULT 'schema',
    
    -- 🚨 CRITICAL: STRICT PARENT-CHILD RELATIONSHIP
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    owner_id UUID REFERENCES auth.users(id), -- Denormalized for convenience, but workspace_id is the authority
    universal_id UUID REFERENCES universal_users(universal_id), -- Optional link to universal identity
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. SCHEMA VERSIONING & INTELLIGENCE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS schema_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS schema_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_name TEXT,
    mode TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentation_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version INT NOT NULL,
    pdf_url TEXT, 
    markdown TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 4. BILLING & USAGE
-- ==============================================================================

CREATE TABLE IF NOT EXISTS billing_plans (
    id TEXT PRIMARY KEY,
    price_inr INT NOT NULL,
    project_limit INT NOT NULL,
    version_limit INT NOT NULL,
    ai_limit INT DEFAULT -1,
    validity_days INT NOT NULL DEFAULT 30,
    allow_exports BOOLEAN NOT NULL DEFAULT FALSE,
    allow_designer BOOLEAN NOT NULL DEFAULT FALSE,
    allow_team BOOLEAN NOT NULL DEFAULT FALSE,
    ai_level TEXT NOT NULL CHECK (ai_level IN ('none', 'db', 'table', 'full'))
);

CREATE TABLE IF NOT EXISTS workspace_billing (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES billing_plans(id) DEFAULT 'free',
    status TEXT CHECK (status IN ('active', 'expired')) DEFAULT 'active',
    start_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_payment_id UUID -- References payments(id)
);

CREATE TABLE IF NOT EXISTS workspace_usage (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    projects_count INT DEFAULT 0,
    storage_bytes BIGINT DEFAULT 0,
    ai_tokens_used BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS beta_usage (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    projects_created INT DEFAULT 0,
    versions_created INT DEFAULT 0,
    diagrams_viewed INT DEFAULT 0,
    docs_generated INT DEFAULT 0,
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. FUNCTIONS
-- ==============================================================================

-- Security Helper
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

-- Setup New User
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.universal_users (auth_user_id, email, username, display_name)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)), 
        NEW.raw_user_meta_data->>'full_name'
    )
    ON CONFLICT (auth_user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER tr_new_user_setup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- BETA LIMIT (Set to 100)
CREATE OR REPLACE FUNCTION public.prevent_extra_projects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM projects WHERE owner_id = NEW.owner_id) >= 100 THEN
    RAISE EXCEPTION 'Beta Limit Reached: You cannot create more than 100 projects.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_beta_project_limit ON projects;
CREATE TRIGGER tr_beta_project_limit
  BEFORE INSERT ON projects
  FOR EACH ROW EXECUTE FUNCTION prevent_extra_projects();

-- ==============================================================================
-- 6. SECURITY & RLS (Unified Policies)
-- ==============================================================================

-- Enable RLS
ALTER TABLE universal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;

-- 6.1 Users (See Self + Public Profiles)
CREATE POLICY "Users - View All" ON universal_users FOR SELECT USING (true);
CREATE POLICY "Users - Manage Self" ON universal_users FOR ALL USING (auth_user_id = auth.uid());

-- 6.2 Workspaces (Member Access)
CREATE POLICY "Workspaces - View Members" ON workspaces FOR SELECT USING (
    owner_id = auth.uid() OR public.is_member_of(id)
);
CREATE POLICY "Workspaces - Manage Own" ON workspaces FOR ALL USING (owner_id = auth.uid());

-- 6.3 Projects (Strict Workspace Scoping)
CREATE POLICY "Projects - Workspace Members" ON projects FOR ALL USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

-- 6.4 Schema Artifacts (Workspace Scoping)
CREATE POLICY "Versions - Workspace Access" ON schema_versions FOR ALL USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

-- ==============================================================================
-- 7. GRANTS (Fixing ALL 403s)
-- ==============================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT EXECUTE ON FUNCTION public.is_member_of(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_of(uuid) TO authenticated, anon;

-- ==============================================================================
-- 8. SEED DATA
-- ==============================================================================
INSERT INTO billing_plans (id, price_inr, project_limit, version_limit, ai_limit, validity_days, allow_exports, allow_designer, allow_team, ai_level)
VALUES 
  ('free', 0, 100, 10, 5, 0, false, false, false, 'db'),
  ('pro', 1499, 500, 30, 100, 30, true, true, false, 'table')
ON CONFLICT (id) DO UPDATE SET project_limit = EXCLUDED.project_limit;

-- End of Master Schema
