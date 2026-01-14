-- TEAM INVITE LINK SYSTEM MIGRATION
-- Secure, admin-controlled team invitation via join links

-- 1. EXTEND EXISTING workspace_invites TABLE with new columns
ALTER TABLE workspace_invites 
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_active ON workspace_invites(workspace_id, is_active) WHERE is_active = TRUE;

-- 2. ACTIVITY LOGS TABLE (For audit trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for workspace activity queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace ON activity_logs(workspace_id, created_at DESC);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Activity logs policy - workspace members can view
DROP POLICY IF EXISTS "Activity Logs - View workspace" ON activity_logs;
CREATE POLICY "Activity Logs - View workspace" ON activity_logs FOR SELECT USING (
    public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);

-- Activity logs policy - authenticated users can insert
DROP POLICY IF EXISTS "Activity Logs - System insert" ON activity_logs;
CREATE POLICY "Activity Logs - System insert" ON activity_logs FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
);

-- Grant permissions
GRANT ALL ON activity_logs TO authenticated;
GRANT ALL ON activity_logs TO service_role;

-- 3. UPDATE INVITE POLICY to allow public token validation
DROP POLICY IF EXISTS "Invites - Public token validation" ON workspace_invites;
CREATE POLICY "Invites - Public token validation" ON workspace_invites FOR SELECT USING (
    -- Admin can see all invites for their workspace
    public.is_admin_of(workspace_id) 
    OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
    -- Anyone can validate a token (read-only) - needed for join flow
    OR (is_active = TRUE AND revoked = FALSE AND expires_at > NOW())
);

-- 4. BACKFILL is_active for existing records
UPDATE workspace_invites 
SET is_active = (revoked = FALSE AND expires_at > NOW() AND (max_uses IS NULL OR used_count < max_uses))
WHERE is_active IS NULL;
