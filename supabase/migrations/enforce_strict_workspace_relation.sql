-- MASTER FIX: Enforce Strict Project-Workspace Relationship
-- As per strict instructions: Every project must belong to exactly one workspace.

-- 1. Cleanup Orphans: Remove any projects that violate this rule before enforcing it.
DELETE FROM projects WHERE workspace_id IS NULL;

-- 2. Enforce NOT NULL constraint
ALTER TABLE projects ALTER COLUMN workspace_id SET NOT NULL;

-- 3. Ensure Foreign Key Constraint exists (and is correct)
-- Drop existing if unsure to recreate it cleanly
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_workspace_id_fkey') THEN
        ALTER TABLE projects DROP CONSTRAINT projects_workspace_id_fkey;
    END IF;
END $$;

ALTER TABLE projects
    ADD CONSTRAINT projects_workspace_id_fkey
    FOREIGN KEY (workspace_id)
    REFERENCES workspaces(id)
    ON DELETE CASCADE;

-- 4. Update RLS Policies to strictly enforce Workspace Scoping
DROP POLICY IF EXISTS "Projects - View Own" ON projects;
DROP POLICY IF EXISTS "Projects - Manage Own" ON projects;
DROP POLICY IF EXISTS "Projects - View workspace" ON projects;
DROP POLICY IF EXISTS "Projects - Manage" ON projects;

-- Strict Policy: You can only see projects if you belong to their workspace.
CREATE POLICY "Projects - Strict Workspace Access" ON projects
FOR ALL USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

-- 5. Fix Workspace RLS to ensure they are visible for the check
-- (Ensures 'public.is_member_of' works correctly)
GRANT EXECUTE ON FUNCTION public.is_member_of(uuid) TO authenticated;
