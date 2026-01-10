CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  context TEXT, -- dashboard | diagram | docs | schema_paste | limit_hit
  rating INT CHECK (rating >= 1 AND rating <= 5),
  answer_confusing TEXT,
  answer_helpful TEXT,
  answer_missing TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create feedback" ON user_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can see own feedback" ON user_feedback
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
