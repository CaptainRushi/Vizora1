-- USER DASHBOARD SCHEMA ADDITIONS (2026-01-13)
-- This migration adds tables required for the enhanced User Dashboard

-- 1. Activity Logs Table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT, -- 'project', 'schema', 'docs', 'team', 'billing'
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster workspace lookups
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace ON activity_logs(workspace_id, created_at DESC);

-- 2. Documentation Versions Table (for tracking docs generated)
CREATE TABLE IF NOT EXISTS documentation_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    format TEXT DEFAULT 'markdown', -- 'markdown', 'pdf'
    content_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, version_number, format)
);

-- 3. Add AI limit to billing_plans if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'billing_plans' AND column_name = 'ai_limit') THEN
        ALTER TABLE billing_plans ADD COLUMN ai_limit INT DEFAULT -1;
    END IF;
END $$;

-- 4. RLS Policies
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_versions ENABLE ROW LEVEL SECURITY;

-- Activity Logs - View for workspace members
DROP POLICY IF EXISTS "Activity Logs - View" ON activity_logs;
CREATE POLICY "Activity Logs - View" ON activity_logs FOR SELECT USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

-- Activity Logs - Insert for authenticated users in workspace
DROP POLICY IF EXISTS "Activity Logs - Insert" ON activity_logs;
CREATE POLICY "Activity Logs - Insert" ON activity_logs FOR INSERT WITH CHECK (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
        UNION
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

-- Documentation Versions - Access via project ownership
DROP POLICY IF EXISTS "Documentation Versions - Access" ON documentation_versions;
CREATE POLICY "Documentation Versions - Access" ON documentation_versions FOR ALL USING (
    project_id IN (
        SELECT id FROM projects WHERE workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
            UNION
            SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
        )
    )
);

-- 5. Grants
GRANT ALL ON activity_logs TO authenticated;
GRANT ALL ON documentation_versions TO authenticated;
