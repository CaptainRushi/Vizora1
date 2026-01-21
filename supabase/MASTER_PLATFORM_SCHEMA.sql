-- ==============================================================================
-- VIZORA MASTER PLATFORM SCHEMA (UPDATED 2026-01-21)
-- ==============================================================================
-- 🚨 INSTRUCTIONS:
-- 1. Run this ENTIRE script in the Supabase SQL Editor.
-- 2. It will FIX permissions, ENFORCE hierarchy, and UPDATE limits.
-- ==============================================================================

-- 1. SETUP & PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 2. IDENTITY (Universal Users)
CREATE TABLE IF NOT EXISTS universal_users (
    universal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    display_name TEXT,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Force enable RLS
ALTER TABLE universal_users ENABLE ROW LEVEL SECURITY;

-- 3. WORKSPACES
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('personal', 'team')),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- 4. WORKSPACE MEMBERS
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- 5. PROJECTS (The Critical Fix)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    schema_type TEXT NOT NULL, -- sql | prisma | drizzle
    current_step TEXT DEFAULT 'schema',
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- Constraint enforced below
    owner_id UUID REFERENCES auth.users(id),
    universal_id UUID REFERENCES universal_users(universal_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 🧹 CLEANUP: Remove orphan projects before enforcing strictness
DELETE FROM projects WHERE workspace_id IS NULL;

-- 🔒 ENFORCE STRICT HIERARCHY
ALTER TABLE projects ALTER COLUMN workspace_id SET NOT NULL;

-- 6. SUPPORTING TABLES (Versioning, Billing)
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
ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;

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

-- 7. FUNCTIONS & TRIGGERS

-- Helper: Member Check
CREATE OR REPLACE FUNCTION public.is_member_of(_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = _workspace_id AND user_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid) TO authenticated, anon;

-- Auto-User Setup
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

-- Project Limit (100)
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

-- 8. RLS POLICIES (Fresh & Permissive)

-- Universal Users
DROP POLICY IF EXISTS "Universal - View All" ON universal_users;
CREATE POLICY "Universal - View All" ON universal_users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Universal - Modify Self" ON universal_users;
CREATE POLICY "Universal - Modify Self" ON universal_users FOR ALL USING (auth_user_id = auth.uid());

-- Workspaces
DROP POLICY IF EXISTS "Workspaces - View All" ON workspaces;
CREATE POLICY "Workspaces - View All" ON workspaces FOR SELECT USING (true); -- Allow listing to find your own
DROP POLICY IF EXISTS "Workspaces - Manage Own" ON workspaces;
CREATE POLICY "Workspaces - Manage Own" ON workspaces FOR ALL USING (owner_id = auth.uid());

-- Workspace Members
DROP POLICY IF EXISTS "Members - View All" ON workspace_members;
CREATE POLICY "Members - View All" ON workspace_members FOR SELECT USING (true);

-- Projects (Strict Workspace Scoping)
DROP POLICY IF EXISTS "Projects - View" ON projects;
DROP POLICY IF EXISTS "Projects - Manage" ON projects;

CREATE POLICY "Projects - View Workspace" ON projects FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Projects - Manage Workspace" ON projects FOR ALL USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

-- 9. RETROACTIVE DATA REPAIR
-- Ensure all existing auth users have a universal_user record
INSERT INTO public.universal_users (auth_user_id, email, username)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)) 
FROM auth.users
ON CONFLICT (auth_user_id) DO NOTHING;

-- Seed Plans
INSERT INTO billing_plans (id, price_inr, project_limit, version_limit, ai_limit, validity_days, allow_exports, allow_designer, allow_team, ai_level)
VALUES 
  ('free', 0, 100, 10, 5, 0, false, false, false, 'db')
ON CONFLICT (id) DO UPDATE SET project_limit = 100;
