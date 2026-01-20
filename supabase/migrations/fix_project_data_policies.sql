-- Fix Project Data Access Policies to support Universal ID
-- Run this in Supabase SQL Editor

DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('diagram_states', 'generated_code', 'schema_explanations', 'documentation_outputs', 'project_settings', 'schema_changes', 'schema_reviews', 'onboarding_guides', 'ask_schema_logs', 'schema_comments')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Project Data Access" ON ' || t;
        EXECUTE 'CREATE POLICY "Project Data Access" ON ' || t || ' FOR ALL USING (
            project_id IN (
                SELECT id FROM projects 
                WHERE 
                    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid() UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
                    OR
                    universal_id IN (SELECT universal_id FROM universal_users WHERE auth_user_id = auth.uid())
            )
        )';
    END LOOP;
END $$;
