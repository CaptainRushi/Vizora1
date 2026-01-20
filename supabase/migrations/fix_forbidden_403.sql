-- Fix 403 Forbidden errors by ensuring correct Grants and RLS policies
-- Run this in your Supabase SQL Editor

-- 1. Ensure 'authenticated' and 'anon' roles have Usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant Table Permissions (Crucial for avoiding 403 IF RLS is enabled but no table access)
-- Note: 'service_role' has full access by default.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 3. Grant Function Execute Permissions (Crucial for security definer functions used in RLS)
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_of(uuid) TO authenticated, anon;

-- 4. Relax Policies to ensure visibility (matching schema.sql permissive design)
-- WORKSPACES
DROP POLICY IF EXISTS "Workspaces - View owned or member" ON workspaces;
DROP POLICY IF EXISTS "Workspaces - View all" ON workspaces;
CREATE POLICY "Workspaces - View all" ON workspaces FOR SELECT USING (true);

-- WORKSPACE MEMBERS
DROP POLICY IF EXISTS "Members - View workspace colleagues" ON workspace_members;
DROP POLICY IF EXISTS "Members - View all" ON workspace_members;
CREATE POLICY "Members - View all" ON workspace_members FOR SELECT USING (true);

-- WORKSPACE INVITES
DROP POLICY IF EXISTS "Invites - Validate by token" ON workspace_invites;
DROP POLICY IF EXISTS "Invites - View all" ON workspace_invites;
CREATE POLICY "Invites - View all" ON workspace_invites FOR SELECT USING (true);
