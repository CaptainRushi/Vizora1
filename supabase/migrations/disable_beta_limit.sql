-- Disable Beta Project Limit Trigger
DROP TRIGGER IF EXISTS tr_beta_project_limit ON projects;
DROP FUNCTION IF EXISTS public.prevent_extra_projects();
