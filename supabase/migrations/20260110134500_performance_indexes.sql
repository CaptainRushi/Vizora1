-- Performance Optimization: Add indexes for common query patterns
-- These speeds up data loading across Projects, Versions, and Team views

-- Index for projects lookups by workspace
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);

-- Index for schema versions lookups by project
CREATE INDEX IF NOT EXISTS idx_schema_versions_project_id ON schema_versions(project_id);

-- Index for diagram states lookups by project/version
CREATE INDEX IF NOT EXISTS idx_diagram_states_project_version ON diagram_states(project_id, version_number);

-- Index for workspace members lookups by user (speeds up auth/access checks)
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

-- Index for workspace members lookups by workspace (speeds up team lists)
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);

-- Index for feedback lookups by user
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
