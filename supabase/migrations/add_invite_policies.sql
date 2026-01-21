-- Workspace Members
DROP POLICY IF EXISTS "View Members" ON workspace_members;
CREATE POLICY "View Members" ON workspace_members FOR SELECT USING (
    public.is_member_of(workspace_id) OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Manage Members" ON workspace_members;
CREATE POLICY "Manage Members" ON workspace_members FOR ALL USING (
    public.is_admin_of(workspace_id)
);

-- Workspace Invites
DROP POLICY IF EXISTS "Invites - View Workspace" ON workspace_invites; -- Cleanup old if exists
DROP POLICY IF EXISTS "View Invites" ON workspace_invites;
CREATE POLICY "View Invites" ON workspace_invites FOR SELECT USING (
    public.is_member_of(workspace_id)
);

DROP POLICY IF EXISTS "Invites - Manage Workspace" ON workspace_invites; -- Cleanup old if exists
DROP POLICY IF EXISTS "Manage Invites" ON workspace_invites;
CREATE POLICY "Manage Invites" ON workspace_invites FOR ALL USING (
    public.is_admin_of(workspace_id)
);

-- Grant simple permissions to be sure
GRANT ALL ON TABLE workspace_members TO authenticated;
GRANT ALL ON TABLE workspace_members TO service_role;
GRANT ALL ON TABLE workspace_invites TO authenticated;
GRANT ALL ON TABLE workspace_invites TO service_role;
