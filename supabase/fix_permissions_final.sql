-- ==============================================================================
-- FIX: PERMISSION DENIED (42501) ON WORKSPACES
-- ==============================================================================
-- Run this script in Supabase SQL Editor to unblock Workspace Creation
-- ==============================================================================

-- 1. Ensure the "authenticated" role (logged in users) can actually MODIFY the table
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.workspaces TO authenticated;
GRANT ALL ON TABLE public.workspace_members TO authenticated;
GRANT ALL ON TABLE public.workspace_billing TO authenticated;
GRANT ALL ON TABLE public.workspace_usage TO authenticated;

-- 2. Reset RLS Policy for Workspace Creation to be more permissive for debugging
--    (It ensures you are logged in, and if you supply an owner_id, it must be yours)
DROP POLICY IF EXISTS "Workspaces - Create own" ON workspaces;
DROP POLICY IF EXISTS "Workspaces - Insert" ON workspaces;

CREATE POLICY "Workspaces - Insert" ON workspaces 
FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' 
    AND (owner_id IS NULL OR owner_id = auth.uid())
);

-- 3. Ensure other operations work
DROP POLICY IF EXISTS "Workspaces - Select" ON workspaces;
CREATE POLICY "Workspaces - Select" ON workspaces FOR SELECT USING (true);

DROP POLICY IF EXISTS "Workspaces - Update" ON workspaces;
CREATE POLICY "Workspaces - Update" ON workspaces FOR UPDATE USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Workspaces - Delete" ON workspaces;
CREATE POLICY "Workspaces - Delete" ON workspaces FOR DELETE USING (owner_id = auth.uid());

-- 4. Grants for Sequences (often overlooked)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
