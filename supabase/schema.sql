-- ============================================================================
-- VIZORA PLATFORM - COMPLETE DATABASE SCHEMA
-- Version: 2026-01-20
-- Description: Single source of truth for all platform tables, functions, and policies
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

-- 2.1 USERS (Primary user identity table)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    display_name TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    workspace_id UUID,
    onboarded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 WORKSPACES (Organization/team containers)
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('personal', 'team')),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resolve cyclic FK: users.workspace_id -> workspaces.id
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_workspace') THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id);
    END IF;
END $$;

-- 2.3 WORKSPACE MEMBERS (Team membership)
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- 2.4 WORKSPACE INVITES (Invite links for teams)
CREATE TABLE IF NOT EXISTS workspace_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_count INT DEFAULT 0,
    max_uses INT DEFAULT 50,
    revoked BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. BILLING & USAGE TABLES
-- ============================================================================

-- 3.1 BILLING PLANS (Static plan definitions)
CREATE TABLE IF NOT EXISTS billing_plans (
    id TEXT PRIMARY KEY,
    price_inr INT NOT NULL,
    project_limit INT NOT NULL,
    version_limit INT NOT NULL DEFAULT -1,
    ai_limit INT DEFAULT -1,
    validity_days INT NOT NULL DEFAULT 30,
    allow_exports BOOLEAN NOT NULL DEFAULT FALSE,
    allow_designer BOOLEAN NOT NULL DEFAULT FALSE,
    allow_team BOOLEAN NOT NULL DEFAULT FALSE,
    ai_level TEXT NOT NULL CHECK (ai_level IN ('none', 'db', 'table', 'full'))
);

-- 3.2 PAYMENTS (Payment records)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES billing_plans(id),
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    amount INT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('created', 'paid', 'failed')) DEFAULT 'created',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.3 WORKSPACE BILLING (Active subscription per workspace)
CREATE TABLE IF NOT EXISTS workspace_billing (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    plan_id TEXT REFERENCES billing_plans(id) DEFAULT 'free',
    status TEXT CHECK (status IN ('active', 'expired')) DEFAULT 'active',
    start_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    last_payment_id UUID REFERENCES payments(id)
);

-- 3.4 WORKSPACE USAGE (Usage metrics)
CREATE TABLE IF NOT EXISTS workspace_usage (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    projects_count INT DEFAULT 0,
    storage_bytes BIGINT DEFAULT 0,
    ai_tokens_used BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. PROJECT TABLES
-- ============================================================================

-- 4.1 PROJECTS (Schema projects)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    schema_type TEXT NOT NULL CHECK (schema_type IN ('sql', 'prisma', 'drizzle')),
    current_step TEXT DEFAULT 'schema',
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.2 PROJECT SETTINGS
CREATE TABLE IF NOT EXISTS project_settings (
    project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    explanation_mode TEXT DEFAULT 'developer' CHECK (explanation_mode IN ('developer', 'pm', 'onboarding')),
    auto_generate_docs BOOLEAN DEFAULT TRUE,
    retain_all_versions BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3 PROJECT MEMBERS (Additional project-level access)
CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'editor' CHECK (role IN ('viewer', 'editor', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

-- ============================================================================
-- 5. SCHEMA VERSION TABLES
-- ============================================================================

-- 5.1 SCHEMA VERSIONS (Immutable version snapshots)
CREATE TABLE IF NOT EXISTS schema_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version INT NOT NULL DEFAULT 1,
    version_number INT,
    raw_schema TEXT NOT NULL,
    normalized_schema JSONB NOT NULL,
    schema_hash TEXT,
    code TEXT,
    message TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_by_username TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.2 SCHEMA CHANGES (Diff tracking)
CREATE TABLE IF NOT EXISTS schema_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    from_version INT,
    to_version INT NOT NULL,
    change_type TEXT NOT NULL,
    entity_name TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.3 SCHEMA VERSION DIFFS (Line-level attribution)
CREATE TABLE IF NOT EXISTS schema_version_diffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    from_version INT NOT NULL,
    to_version INT NOT NULL,
    block_index INT NOT NULL,
    block_start INT NOT NULL,
    block_end INT NOT NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('added', 'modified', 'removed')),
    before_text TEXT,
    after_text TEXT,
    edited_by_user_id UUID REFERENCES auth.users(id),
    edited_by_username TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, from_version, to_version, block_index)
);

-- 5.4 CODE BLOCK ATTRIBUTIONS (Real-time editing attribution)
CREATE TABLE IF NOT EXISTS code_block_attributions (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    block_id TEXT NOT NULL,
    start_line INT NOT NULL,
    end_line INT NOT NULL,
    last_editor_id UUID REFERENCES auth.users(id),
    last_editor_name TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (workspace_id, block_id)
);

-- ============================================================================
-- 6. AI & DOCUMENTATION TABLES
-- ============================================================================

-- 6.1 SCHEMA EXPLANATIONS (AI-generated)
CREATE TABLE IF NOT EXISTS schema_explanations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_name TEXT,
    mode TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.2 SCHEMA REVIEWS (AI analysis findings)
CREATE TABLE IF NOT EXISTS schema_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    findings JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, version_number)
);

-- 6.3 ONBOARDING GUIDES (AI-generated)
CREATE TABLE IF NOT EXISTS onboarding_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, version_number)
);

-- 6.4 ASK SCHEMA LOGS (Q&A history)
CREATE TABLE IF NOT EXISTS ask_schema_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    schema_version INT,
    question TEXT NOT NULL,
    referenced_tables TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.5 DOCUMENTATION OUTPUTS (Markdown/PDF)
CREATE TABLE IF NOT EXISTS documentation_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version INT NOT NULL,
    pdf_url TEXT,
    markdown TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6.6 SCHEMA COMMENTS (User annotations)
CREATE TABLE IF NOT EXISTS schema_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    entity_name TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, entity_name)
);

-- ============================================================================
-- 7. DIAGRAM & VISUALIZATION TABLES
-- ============================================================================

-- 7.1 DIAGRAM STATES (ER diagram positions)
CREATE TABLE IF NOT EXISTS diagram_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    diagram_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7.2 GENERATED CODE (Export outputs)
CREATE TABLE IF NOT EXISTS generated_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    language TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. USER SETTINGS TABLES
-- ============================================================================

-- 8.1 USER SETTINGS (Appearance)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    color_mode TEXT NOT NULL DEFAULT 'light' CHECK (color_mode IN ('light', 'dark', 'system')),
    diagram_theme TEXT NOT NULL DEFAULT 'auto' CHECK (diagram_theme IN ('light', 'dark', 'auto')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.2 INTERACTION SETTINGS (Accessibility)
CREATE TABLE IF NOT EXISTS interaction_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,
    auto_focus_schema BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.3 NOTIFICATION SETTINGS
CREATE TABLE IF NOT EXISTS notification_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email_schema_changes BOOLEAN NOT NULL DEFAULT TRUE,
    email_team_activity BOOLEAN NOT NULL DEFAULT FALSE,
    email_ai_summary BOOLEAN NOT NULL DEFAULT FALSE,
    inapp_schema BOOLEAN NOT NULL DEFAULT TRUE,
    inapp_team BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.4 INTELLIGENCE SETTINGS (Workspace-level AI config)
CREATE TABLE IF NOT EXISTS intelligence_settings (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    explanation_mode TEXT NOT NULL DEFAULT 'developer' CHECK (explanation_mode IN ('developer', 'pm', 'onboarding')),
    evidence_strict BOOLEAN NOT NULL DEFAULT TRUE,
    auto_schema_review BOOLEAN NOT NULL DEFAULT TRUE,
    auto_onboarding BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8.5 PRIVACY SETTINGS (Workspace-level)
CREATE TABLE IF NOT EXISTS privacy_settings (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    retain_all_versions BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. BETA & FEEDBACK TABLES
-- ============================================================================

-- 9.1 BETA USAGE (Private beta tracking)
CREATE TABLE IF NOT EXISTS beta_usage (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    projects_created INT DEFAULT 0,
    versions_created INT DEFAULT 0,
    diagrams_viewed INT DEFAULT 0,
    docs_generated INT DEFAULT 0,
    beta_ends_at TIMESTAMPTZ,
    first_used_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9.2 USER FEEDBACK
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    context TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    answer_confusing TEXT,
    answer_helpful TEXT,
    answer_missing TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. FUNCTIONS & TRIGGERS
-- ============================================================================

-- 10.1 Security Helper Functions
CREATE OR REPLACE FUNCTION public.is_member_of(_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = _workspace_id AND user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_of(_workspace_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER SET search_path = public STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_id = _workspace_id AND user_id = auth.uid() AND role = 'admin'
    );
$$;

-- 10.2 User Email Sync Trigger
CREATE OR REPLACE FUNCTION public.handle_user_email_sync()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.users SET email = NEW.email WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_sync_user_email ON auth.users;
CREATE TRIGGER tr_sync_user_email
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_sync();

-- 10.3 New User Setup (Creates user + personal workspace)
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    INSERT INTO public.users (id, email, username, display_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'full_name'
    )
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    INSERT INTO public.workspaces (name, type, owner_id)
    VALUES ('Personal Workspace', 'personal', NEW.id)
    RETURNING id INTO new_workspace_id;

    UPDATE public.users SET workspace_id = new_workspace_id WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_new_user_setup ON auth.users;
CREATE TRIGGER tr_new_user_setup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- 10.4 Initialize Workspace Billing & Usage
CREATE OR REPLACE FUNCTION handle_new_workspace_billing()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO workspace_billing (workspace_id, plan_id, start_at, expires_at) VALUES (NEW.id, 'free', NOW(), NULL);
    INSERT INTO workspace_usage (workspace_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_init_workspace_billing ON workspaces;
CREATE TRIGGER tr_init_workspace_billing
    AFTER INSERT ON workspaces
    FOR EACH ROW EXECUTE FUNCTION handle_new_workspace_billing();

-- 10.5 New Project Initialization
CREATE OR REPLACE FUNCTION handle_new_project()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO project_settings (project_id) VALUES (NEW.id);
    PERFORM public.increment_beta_usage(NEW.owner_id, 'project');
    UPDATE workspace_usage SET projects_count = projects_count + 1, updated_at = NOW() WHERE workspace_id = NEW.workspace_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_new_project_settings ON projects;
CREATE TRIGGER tr_new_project_settings
    AFTER INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION handle_new_project();

-- 10.6 Beta Project Limit (Prevent > 2 projects)
CREATE OR REPLACE FUNCTION public.prevent_extra_projects()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF (SELECT COUNT(*) FROM projects WHERE owner_id = NEW.owner_id) >= 2 THEN
        RAISE EXCEPTION 'You cannot create more than 2 projects during the private beta.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_beta_project_limit ON projects;
CREATE TRIGGER tr_beta_project_limit
    BEFORE INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION prevent_extra_projects();

-- 10.7 Increment Beta Usage
CREATE OR REPLACE FUNCTION public.increment_beta_usage(u_id UUID, field TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO beta_usage (user_id, first_used_at, last_used_at)
    VALUES (u_id, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        projects_created = CASE WHEN field = 'project' THEN beta_usage.projects_created + 1 ELSE beta_usage.projects_created END,
        versions_created = CASE WHEN field = 'version' THEN beta_usage.versions_created + 1 ELSE beta_usage.versions_created END,
        diagrams_viewed = CASE WHEN field = 'diagram' THEN beta_usage.diagrams_viewed + 1 ELSE beta_usage.diagrams_viewed END,
        docs_generated = CASE WHEN field = 'docs' THEN beta_usage.docs_generated + 1 ELSE beta_usage.docs_generated END,
        last_used_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10.8 Account Deletion
CREATE OR REPLACE FUNCTION public.delete_account_completely(target_user_id UUID, target_workspace_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    ws_type TEXT;
    user_role TEXT;
BEGIN
    SELECT type INTO ws_type FROM workspaces WHERE id = target_workspace_id;
    SELECT role INTO user_role FROM workspace_members WHERE workspace_id = target_workspace_id AND user_id = target_user_id;

    IF ws_type = 'team' AND user_role != 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only admins can delete team workspaces.';
    END IF;

    DELETE FROM projects WHERE workspace_id = target_workspace_id;
    DELETE FROM workspace_invites WHERE workspace_id = target_workspace_id;
    DELETE FROM workspace_members WHERE workspace_id = target_workspace_id;
    DELETE FROM workspace_billing WHERE workspace_id = target_workspace_id;
    DELETE FROM workspace_usage WHERE workspace_id = target_workspace_id;
    UPDATE users SET workspace_id = NULL WHERE workspace_id = target_workspace_id;
    DELETE FROM workspaces WHERE id = target_workspace_id;
    DELETE FROM users WHERE id = target_user_id;
END;
$$;

-- ============================================================================
-- 11. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- USERS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users - View all" ON users;
DROP POLICY IF EXISTS "Users - Update self" ON users;
DROP POLICY IF EXISTS "Users - Insert self" ON users;
CREATE POLICY "Users - View all" ON users FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users - Update self" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users - Insert self" ON users FOR INSERT WITH CHECK (id = auth.uid());

-- WORKSPACES
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspaces - View owned or member" ON workspaces;
DROP POLICY IF EXISTS "Workspaces - Create own" ON workspaces;
DROP POLICY IF EXISTS "Workspaces - Update own" ON workspaces;
DROP POLICY IF EXISTS "Workspaces - Delete own" ON workspaces;
CREATE POLICY "Workspaces - View owned or member" ON workspaces FOR SELECT USING (owner_id = auth.uid() OR public.is_member_of(id));
CREATE POLICY "Workspaces - Create own" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Workspaces - Update own" ON workspaces FOR UPDATE USING (owner_id = auth.uid() OR public.is_admin_of(id));
CREATE POLICY "Workspaces - Delete own" ON workspaces FOR DELETE USING (owner_id = auth.uid());

-- WORKSPACE MEMBERS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members - View workspace colleagues" ON workspace_members;
DROP POLICY IF EXISTS "Members - Insert" ON workspace_members;
DROP POLICY IF EXISTS "Members - Admins manage" ON workspace_members;
DROP POLICY IF EXISTS "Members - Admins delete" ON workspace_members;
CREATE POLICY "Members - View workspace colleagues" ON workspace_members FOR SELECT USING (public.is_member_of(workspace_id));
CREATE POLICY "Members - Insert" ON workspace_members FOR INSERT WITH CHECK (
    (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()) OR
    (user_id = auth.uid() AND EXISTS (SELECT 1 FROM workspace_invites WHERE workspace_id = workspace_members.workspace_id AND is_active = TRUE AND revoked = FALSE AND expires_at > NOW() AND used_count < max_uses))
);
CREATE POLICY "Members - Admins manage" ON workspace_members FOR UPDATE USING (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Members - Admins delete" ON workspace_members FOR DELETE USING (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());

-- WORKSPACE INVITES
ALTER TABLE workspace_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invites - Validate by token" ON workspace_invites;
DROP POLICY IF EXISTS "Invites - Admin full access" ON workspace_invites;
DROP POLICY IF EXISTS "Invites - Update used count" ON workspace_invites;
CREATE POLICY "Invites - Validate by token" ON workspace_invites FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = TRUE AND revoked = FALSE AND expires_at > NOW());
CREATE POLICY "Invites - Admin full access" ON workspace_invites FOR ALL USING (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Invites - Update used count" ON workspace_invites FOR UPDATE USING (auth.uid() IS NOT NULL AND is_active = TRUE);

-- PROJECTS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Projects - View workspace" ON projects;
DROP POLICY IF EXISTS "Projects - Create" ON projects;
DROP POLICY IF EXISTS "Projects - Manage" ON projects;
CREATE POLICY "Projects - View workspace" ON projects FOR SELECT USING (public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Projects - Create" ON projects FOR INSERT WITH CHECK (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Projects - Manage" ON projects FOR ALL USING (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());

-- SCHEMA VERSIONS
ALTER TABLE schema_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Schema Versions - Select" ON schema_versions;
DROP POLICY IF EXISTS "Schema Versions - Insert" ON schema_versions;
DROP POLICY IF EXISTS "Schema Versions - Update" ON schema_versions;
DROP POLICY IF EXISTS "Schema Versions - Delete" ON schema_versions;
CREATE POLICY "Schema Versions - Select" ON schema_versions FOR SELECT USING (
    (project_id IS NULL AND workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid() UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()))
    OR (project_id IN (SELECT id FROM projects WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid() UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())))
);
CREATE POLICY "Schema Versions - Insert" ON schema_versions FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid() UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "Schema Versions - Update" ON schema_versions FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid() UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
);
CREATE POLICY "Schema Versions - Delete" ON schema_versions FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR public.is_admin_of(workspace_id)
);

-- CODE BLOCK ATTRIBUTIONS
ALTER TABLE code_block_attributions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Attributions - View workspace" ON code_block_attributions;
DROP POLICY IF EXISTS "Attributions - Manage workspace" ON code_block_attributions;
CREATE POLICY "Attributions - View workspace" ON code_block_attributions FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR public.is_member_of(workspace_id));
CREATE POLICY "Attributions - Manage workspace" ON code_block_attributions FOR ALL USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR public.is_member_of(workspace_id));

-- SCHEMA VERSION DIFFS
ALTER TABLE schema_version_diffs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Version Diffs - View workspace" ON schema_version_diffs;
DROP POLICY IF EXISTS "Version Diffs - Create workspace" ON schema_version_diffs;
DROP POLICY IF EXISTS "Version Diffs - Delete workspace" ON schema_version_diffs;
CREATE POLICY "Version Diffs - View workspace" ON schema_version_diffs FOR SELECT USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid() UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Version Diffs - Create workspace" ON schema_version_diffs FOR INSERT WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid() UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Version Diffs - Delete workspace" ON schema_version_diffs FOR DELETE USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()) OR public.is_admin_of(workspace_id));

-- BILLING & USAGE
ALTER TABLE workspace_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Billing - View own" ON workspace_billing;
DROP POLICY IF EXISTS "Usage - View own" ON workspace_usage;
DROP POLICY IF EXISTS "Plans - Public read" ON billing_plans;
CREATE POLICY "Billing - View own" ON workspace_billing FOR SELECT USING (public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Usage - View own" ON workspace_usage FOR SELECT USING (public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Plans - Public read" ON billing_plans FOR SELECT USING (TRUE);

-- PROJECT DATA TABLES (Generic policies)
ALTER TABLE project_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_code ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentation_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ask_schema_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_comments ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('diagram_states', 'generated_code', 'schema_explanations', 'documentation_outputs', 'project_settings', 'schema_changes', 'schema_reviews', 'onboarding_guides', 'ask_schema_logs', 'schema_comments')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Project Data Access" ON ' || t;
        EXECUTE 'CREATE POLICY "Project Data Access" ON ' || t || ' FOR ALL USING (project_id IN (SELECT id FROM projects WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid() UNION SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())))';
    END LOOP;
END $$;

-- USER SETTINGS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE interaction_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE intelligence_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User Settings - Own" ON user_settings;
DROP POLICY IF EXISTS "Interaction Settings - Own" ON interaction_settings;
DROP POLICY IF EXISTS "Notification Settings - Own" ON notification_settings;
CREATE POLICY "User Settings - Own" ON user_settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Interaction Settings - Own" ON interaction_settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Notification Settings - Own" ON notification_settings FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Intelligence Settings - Workspace" ON intelligence_settings;
DROP POLICY IF EXISTS "Privacy Settings - Workspace" ON privacy_settings;
CREATE POLICY "Intelligence Settings - Workspace" ON intelligence_settings FOR ALL USING (public.is_member_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());
CREATE POLICY "Privacy Settings - Workspace" ON privacy_settings FOR ALL USING (public.is_admin_of(workspace_id) OR (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid());

-- BETA & FEEDBACK
ALTER TABLE beta_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Beta Usage - Own" ON beta_usage;
DROP POLICY IF EXISTS "Feedback - Own" ON user_feedback;
CREATE POLICY "Beta Usage - Own" ON beta_usage FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Feedback - Own" ON user_feedback FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- 12. INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_token ON workspace_invites(token);
CREATE INDEX IF NOT EXISTS idx_workspace_invites_active ON workspace_invites(workspace_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_schema_versions_project ON schema_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_schema_versions_workspace ON schema_versions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_schema_versions_created_at ON schema_versions(created_at);
CREATE INDEX IF NOT EXISTS idx_version_diffs_lookup ON schema_version_diffs(workspace_id, from_version, to_version);
CREATE INDEX IF NOT EXISTS idx_documentation_outputs_project ON documentation_outputs(project_id);
CREATE INDEX IF NOT EXISTS idx_ask_schema_logs_project ON ask_schema_logs(project_id);

-- ============================================================================
-- 13. SEED DATA
-- ============================================================================
INSERT INTO billing_plans (id, price_inr, project_limit, version_limit, ai_limit, validity_days, allow_exports, allow_designer, allow_team, ai_level)
VALUES
    ('free', 0, 1, 2, 5, 0, false, false, false, 'db'),
    ('pro', 1499, 5, 30, 100, 30, true, true, false, 'table'),
    ('teams', 4999, 20, -1, 500, 30, true, true, true, 'full'),
    ('business', 9999, -1, -1, -1, 30, true, true, true, 'full')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================