-- Fix Workspace Usage Policies to allow updates
-- Run this in Supabase SQL Editor

-- 1. Ensure permissions
GRANT ALL ON TABLE public.workspace_usage TO authenticated, anon, service_role;

-- 2. Update RLS Policies
ALTER TABLE public.workspace_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usage - View own" ON workspace_usage;
DROP POLICY IF EXISTS "Usage - Update own" ON workspace_usage;

-- Allow viewing usage for members and owners
CREATE POLICY "Usage - View own" ON workspace_usage 
FOR SELECT USING (
    public.is_member_of(workspace_id) OR 
    (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);

-- Allow updating usage (The Trigger runs as Security Definer, but good to have fallback)
-- Limiting update to "own" workspace usage makes sense.
CREATE POLICY "Usage - Update own" ON workspace_usage 
FOR UPDATE USING (
    public.is_member_of(workspace_id) OR 
    (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);

-- Also ensure project_settings policy is definitely correct (re-applying in case previous run failed/missed)
DROP POLICY IF EXISTS "Project Settings - Manage" ON project_settings;
CREATE POLICY "Project Settings - Manage" ON project_settings 
FOR ALL USING (
    project_id IN (
        SELECT id FROM projects 
        WHERE 
            workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid() UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
            OR
            universal_id IN (SELECT universal_id FROM universal_users WHERE auth_user_id = auth.uid())
    )
);
