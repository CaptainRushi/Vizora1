-- Decouple Projects from Workspaces
-- 1. Make workspace_id optional
ALTER TABLE projects ALTER COLUMN workspace_id DROP NOT NULL;

-- 2. Update RLS to ensure owners can access their projects even without a workspace
DROP POLICY IF EXISTS "Projects - View Own" ON projects;
CREATE POLICY "Projects - View Own" ON projects FOR SELECT USING (
    owner_id = auth.uid() 
    OR 
    (workspace_id IS NOT NULL AND (
        public.is_member_of(workspace_id) 
        OR 
        (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
    ))
);

DROP POLICY IF EXISTS "Projects - Manage Own" ON projects;
CREATE POLICY "Projects - Manage Own" ON projects FOR ALL USING (
    owner_id = auth.uid()
    OR
    (workspace_id IS NOT NULL AND (
        public.is_admin_of(workspace_id)
        OR 
        (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
    ))
);

-- 3. Also fix 403s just in case (Re-applying the permissive fallback)
GRANT ALL ON projects TO authenticated;
