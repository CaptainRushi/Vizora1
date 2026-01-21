-- ==============================================================================
-- NUCLEAR PERMISSION REPAIR (Run this to fix 403/Permission Denied)
-- ==============================================================================

-- 1. Grant usage on the schema itself
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Grant CRUD on ALL tables (Existing)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Grant CRUD on ALL tables (Future)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 4. Explicitly fix the problematic tables just in case
GRANT ALL ON TABLE public.workspaces TO authenticated;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.schema_versions TO authenticated;
GRANT ALL ON TABLE public.universal_users TO authenticated;
GRANT ALL ON TABLE public.users TO authenticated;

-- 5. RELAX RLS POLICIES FOR INSERT (To allow creation)
-- Workspaces
DROP POLICY IF EXISTS "Workspaces - Insert" ON workspaces;
DROP POLICY IF EXISTS "Workspaces - Create own" ON workspaces;
CREATE POLICY "Workspaces - Insert Open" ON workspaces FOR INSERT WITH CHECK (true);

-- Projects
DROP POLICY IF EXISTS "Projects - Create" ON projects;
DROP POLICY IF EXISTS "Projects - Manage Workspace" ON projects;
CREATE POLICY "Projects - Insert Open" ON projects FOR INSERT WITH CHECK (true);

-- Users
DROP POLICY IF EXISTS "Universal - Insert" ON universal_users;
CREATE POLICY "Universal - Insert" ON universal_users FOR INSERT WITH CHECK (true);
