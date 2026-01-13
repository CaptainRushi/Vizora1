
-- VIZORA PLATFORM - CONSOLIDATED SCHEMA (2026-01-12)
-- This file represents the complete, single source of truth for the database.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    role_title TEXT,
    onboarded BOOLEAN DEFAULT FALSE,
    default_workspace_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('personal', 'team')),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cyclic dependency for profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profiles_default_workspace') THEN
        ALTER TABLE profiles ADD CONSTRAINT fk_profiles_default_workspace FOREIGN KEY (default_workspace_id) REFERENCES workspaces(id);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer', 'member')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY,
  price_inr INT NOT NULL,
  project_limit INT NOT NULL,
  version_limit INT NOT NULL,
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
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workspace_usage (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  projects_count INT DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  ai_tokens_used BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  schema_type TEXT NOT NULL,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id), 
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  raw_schema TEXT NOT NULL,
  normalized_schema JSONB NOT NULL,
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

-- 3. FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_member_of(_workspace_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = _workspace_id AND user_id = auth.uid());
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin_of(_workspace_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = _workspace_id AND user_id = auth.uid() AND role = 'admin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 4. TRIGGERS
CREATE OR REPLACE FUNCTION handle_new_workspace() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_billing (workspace_id) VALUES (NEW.id) ON CONFLICT (workspace_id) DO NOTHING;
  INSERT INTO workspace_usage (workspace_id) VALUES (NEW.id) ON CONFLICT (workspace_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Consolidate trigger naming to prevent duplicates
DROP TRIGGER IF EXISTS tr_new_workspace ON workspaces;
DROP TRIGGER IF EXISTS tr_init_workspace_billing ON workspaces;
CREATE TRIGGER tr_new_workspace AFTER INSERT ON workspaces FOR EACH ROW EXECUTE FUNCTION handle_new_workspace();

-- 5. SEED DATA
INSERT INTO billing_plans (id, price_inr, project_limit, version_limit, ai_level) VALUES 
('free', 0, 1, 2, 'db'), ('pro', 1499, 5, 30, 'table'), ('teams', 4999, 20, -1, 'full')
ON CONFLICT (id) DO NOTHING;

-- 6. RLS POLICIES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_schema_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_comments ENABLE ROW LEVEL SECURITY;

-- Workspaces
CREATE POLICY "Workspaces - View" ON workspaces FOR SELECT USING (owner_id = auth.uid() OR public.is_member_of(id));
CREATE POLICY "Workspaces - Create" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Workspaces - Manage" ON workspaces FOR ALL USING (owner_id = auth.uid() OR public.is_admin_of(id));

-- Members
CREATE POLICY "Members - View" ON workspace_members FOR SELECT USING (public.is_member_of(workspace_id));
CREATE POLICY "Members - Admin" ON workspace_members FOR ALL USING (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());

-- Profiles
CREATE POLICY "Profiles - Self" ON profiles FOR ALL USING (id = auth.uid());

-- Projects (Table with workspace_id)
CREATE POLICY "Projects - Access" ON projects FOR ALL USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid() 
        UNION 
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

-- Child Tables (Tables with project_id)
DO $$ 
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
           AND table_name IN ('schema_versions', 'schema_reviews', 'onboarding_guides', 'ask_schema_logs', 'schema_comments')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "Project Child Access" ON ' || t;
    EXECUTE 'CREATE POLICY "Project Child Access" ON ' || t || ' FOR ALL USING (
      project_id IN (
        SELECT id FROM projects WHERE workspace_id IN (
          SELECT id FROM workspaces WHERE owner_id = auth.uid() 
          UNION 
          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
      )
    )';
  END LOOP;
END $$;

-- 7. GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
