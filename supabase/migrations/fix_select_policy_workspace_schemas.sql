-- Fix SELECT policy to allow viewing workspace-level schemas

DROP POLICY IF EXISTS "Schema Versions - Select" ON schema_versions;

CREATE POLICY "Schema Versions - Select" ON schema_versions FOR SELECT USING (
    -- Allow if workspace-level schema (project_id is NULL)
    (project_id IS NULL AND workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid() 
        UNION 
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ))
    OR
    -- Allow if project-level schema
    (project_id IN (
        SELECT id FROM projects 
        WHERE workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid() 
            UNION 
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    ))
);
