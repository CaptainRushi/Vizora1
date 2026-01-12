
-- Final RLS & Trigger Fixes
-- This migration ensures that users can create their own workspaces and join them.
-- It also fixes the 23505 (Duplicate Key) error during onboarding.

-- 1. CLEAN UP PREVIOUS TRIGGERS (Fixes 23505 error)
CREATE OR REPLACE FUNCTION handle_new_workspace() RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO workspace_billing (workspace_id) VALUES (NEW.id) ON CONFLICT (workspace_id) DO NOTHING;
    INSERT INTO workspace_usage (workspace_id) VALUES (NEW.id) ON CONFLICT (workspace_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_new_workspace ON workspaces;
DROP TRIGGER IF EXISTS tr_init_workspace_billing ON workspaces;
CREATE TRIGGER tr_new_workspace AFTER INSERT ON workspaces FOR EACH ROW EXECUTE FUNCTION handle_new_workspace();

-- 2. WORKSPACES
DROP POLICY IF EXISTS "Workspaces - Create" ON workspaces;
DROP POLICY IF EXISTS "Workspaces - Create own" ON workspaces;
CREATE POLICY "Workspaces - Create" ON workspaces 
FOR INSERT 
TO authenticated 
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Workspaces - View" ON workspaces;
DROP POLICY IF EXISTS "Workspaces - View owned or member" ON workspaces;
CREATE POLICY "Workspaces - View" ON workspaces 
FOR SELECT 
TO authenticated 
USING (owner_id = auth.uid() OR public.is_member_of(id));

DROP POLICY IF EXISTS "Workspaces - Manage" ON workspaces;
CREATE POLICY "Workspaces - Manage" ON workspaces 
FOR ALL 
TO authenticated 
USING (owner_id = auth.uid() OR public.is_admin_of(id));

-- 3. WORKSPACE MEMBERS (Allow joining own workspace)
DROP POLICY IF EXISTS "Members - Admin" ON workspace_members;
DROP POLICY IF EXISTS "Members - Admins manage" ON workspace_members;
CREATE POLICY "Members - Admin" ON workspace_members 
FOR ALL 
TO authenticated 
USING (
    public.is_admin_of(workspace_id) OR 
    (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);

-- 4. PROFILES
DROP POLICY IF EXISTS "Profiles - Self" ON profiles;
DROP POLICY IF EXISTS "Profiles - Insert self" ON profiles;
CREATE POLICY "Profiles - Self" ON profiles 
FOR ALL 
TO authenticated 
USING (id = auth.uid());

-- 5. RE-GRANT PERMISSIONS
GRANT ALL ON TABLE workspaces TO authenticated;
GRANT ALL ON TABLE workspace_members TO authenticated;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
