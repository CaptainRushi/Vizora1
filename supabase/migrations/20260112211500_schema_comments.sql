
-- Add schema_comments table for intent and notes
CREATE TABLE IF NOT EXISTS schema_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    entity_name TEXT NOT NULL, -- table name or table.column
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, entity_name)
);

-- Enable RLS
ALTER TABLE schema_comments ENABLE ROW LEVEL SECURITY;

-- Project Child Access for schema_comments
CREATE POLICY "Project Child Access" ON schema_comments FOR ALL USING (
    project_id IN (
        SELECT id FROM projects WHERE workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid() 
            UNION 
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    )
);

-- Update ask_schema_logs to include schema_version
ALTER TABLE ask_schema_logs ADD COLUMN IF NOT EXISTS schema_version INT;
