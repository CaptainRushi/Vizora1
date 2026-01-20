-- Fix RLS policy for schema_versions table to allow INSERT operations

-- Drop ALL existing policies first (including the one from original schema)
DROP POLICY IF EXISTS "Project Data Access" ON schema_versions;
DROP POLICY IF EXISTS "Schema Versions - Insert" ON schema_versions;
DROP POLICY IF EXISTS "Schema Versions - Select" ON schema_versions;
DROP POLICY IF EXISTS "Schema Versions - Update" ON schema_versions;
DROP POLICY IF EXISTS "Schema Versions - Delete" ON schema_versions;

-- Wait a moment to ensure drops complete
SELECT pg_sleep(0.1);

-- Create separate policies for each operation
CREATE POLICY "Schema Versions - Select" ON schema_versions FOR SELECT USING (
    project_id IN (
        SELECT id FROM projects 
        WHERE workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid() 
            UNION 
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Schema Versions - Insert" ON schema_versions FOR INSERT WITH CHECK (
    -- Check workspace access directly using workspace_id column
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Schema Versions - Update" ON schema_versions FOR UPDATE USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Schema Versions - Delete" ON schema_versions FOR DELETE USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
    ) 
    OR public.is_admin_of(workspace_id)
);
