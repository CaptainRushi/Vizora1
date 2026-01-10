-- Rename/Consolidate Feedback Tables
DROP TABLE IF EXISTS beta_feedback;

-- Ensure user_feedback has RLS enabled
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Re-apply policies correctly on user_feedback
DROP POLICY IF EXISTS "Feedback - Insert self" ON user_feedback;
CREATE POLICY "Feedback - Insert self" ON user_feedback FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Feedback - View self" ON user_feedback;
CREATE POLICY "Feedback - View self" ON user_feedback FOR SELECT USING (user_id = auth.uid());

-- Ensure explicit permissions
GRANT ALL ON TABLE user_feedback TO service_role;
GRANT SELECT, INSERT ON TABLE user_feedback TO authenticated;
