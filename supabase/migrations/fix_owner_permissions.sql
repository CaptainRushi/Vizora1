-- Update helper functions to include owner logic
CREATE OR REPLACE FUNCTION public.is_member_of(_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = _workspace_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = _workspace_id AND owner_id = auth.uid()
    );
$$;
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.is_admin_of(_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = _workspace_id AND user_id = auth.uid() AND role = 'admin'
    ) OR EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = _workspace_id AND owner_id = auth.uid()
    );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin_of(uuid) TO authenticated, anon;

-- Re-apply policies (Idempotent)
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
DROP POLICY IF EXISTS "View Invites" ON workspace_invites;
CREATE POLICY "View Invites" ON workspace_invites FOR SELECT USING (
    public.is_member_of(workspace_id)
);

DROP POLICY IF EXISTS "Manage Invites" ON workspace_invites;
CREATE POLICY "Manage Invites" ON workspace_invites FOR ALL USING (
    public.is_admin_of(workspace_id)
);
