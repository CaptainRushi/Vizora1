-- Add Intelligence Intelligence tables

-- 1. Schema Reviews (Cache for rule-based analysis)
CREATE TABLE IF NOT EXISTS schema_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    version_number int NOT NULL,
    findings jsonb NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(project_id, version_number)
);

-- 2. Onboarding Guides (Storage for AI generated guides)
CREATE TABLE IF NOT EXISTS onboarding_guides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    version_number int NOT NULL,
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(project_id, version_number)
);

-- 3. Ask Schema Logs (For analytics and billing)
CREATE TABLE IF NOT EXISTS ask_schema_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
    question text NOT NULL,
    referenced_tables text[],
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE schema_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_schema_logs ENABLE ROW LEVEL SECURITY;

-- Add basic public access policies (assuming existing auth patterns)
CREATE POLICY "Public Read Access" ON schema_reviews FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON schema_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON schema_reviews FOR UPDATE USING (true);

CREATE POLICY "Public Read Access" ON onboarding_guides FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON onboarding_guides FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access" ON onboarding_guides FOR UPDATE USING (true);

CREATE POLICY "Public Read Access" ON ask_schema_logs FOR SELECT USING (true);
CREATE POLICY "Public Insert Access" ON ask_schema_logs FOR INSERT WITH CHECK (true);
