
-- VIZORA CORE PLATFORM SCHEMA (CONSOLIDATED)
-- Single source of truth for all platform features

-- Enable necessary extensions
create extension if not exists "pgcrypto";

-- CLEANUP (Ensures this consolidated schema can be applied over existing ones)
drop table if exists project_settings cascade;
drop table if exists documentation_outputs cascade;
drop table if exists schema_explanations cascade;
drop table if exists generated_code cascade;
drop table if exists diagram_states cascade;
drop table if exists schema_versions cascade;
drop table if exists projects cascade;
drop function if exists handle_new_project cascade;

-- 1. PROJECTS
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  schema_type text not null, -- sql | prisma | drizzle
  current_step text default 'schema',
  created_at timestamptz default now()
);

-- 2. SCHEMA VERSIONS
create table schema_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  version int not null default 1,
  raw_schema text not null,
  normalized_schema jsonb not null,
  schema_hash text,
  created_at timestamptz default now()
);

-- 3. DIAGRAM STATES (Visual graph states)
create table diagram_states (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  version_number int not null,
  diagram_json jsonb not null,
  created_at timestamptz default now()
);

-- 4. GENERATED CODE (Persistence for source code mapping)
create table generated_code (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  version_number int not null,
  language text not null, -- sql | prisma | drizzle
  content text not null,
  created_at timestamptz default now()
);

-- 5. SCHEMA EXPLANATIONS (AI-DRIVEN)
create table schema_explanations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  version_number int not null,
  entity_type text not null, -- database | table | relationship
  entity_name text,          -- null for database/relationship
  mode text not null,        -- developer | pm | onboarding
  content text not null,
  created_at timestamptz default now()
);

-- 6. AUTO DOCS (ARTIFACTS)
create table documentation_outputs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  version int not null,
  pdf_url text, 
  markdown text,
  created_at timestamptz default now()
);

-- 7. PROJECT SETTINGS
create table project_settings (
  project_id uuid primary key references projects(id) on delete cascade,
  explanation_mode text default 'developer', -- developer | pm | onboarding
  auto_generate_docs boolean default true,
  retain_all_versions boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 8. SCHEMA CHANGES (Tracking diffs between versions)
create table schema_changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  from_version int,
  to_version int not null,
  change_type text not null, -- table_added | column_removed | type_changed etc
  entity_name text not null,
  details jsonb,
  created_at timestamptz default now()
);

-- 9. PERFORMANCE & SEARCH INDEXES
create index idx_projects_created_at on projects(created_at);
create index idx_schema_versions_project_lookup on schema_versions(project_id, version desc);
create index idx_diagram_states_lookup on diagram_states(project_id, version_number desc);
create index idx_generated_code_lookup on generated_code(project_id, version_number desc);
create index idx_schema_changes_lookup on schema_changes(project_id, to_version desc);

-- 9. SECURITY (RLS)
alter table projects enable row level security;
alter table schema_versions enable row level security;
alter table diagram_states enable row level security;
alter table generated_code enable row level security;
alter table schema_explanations enable row level security;
alter table documentation_outputs enable row level security;
alter table project_settings enable row level security;

create policy "Public Access" on projects for all using (true);
create policy "Public Access" on schema_versions for all using (true);
create policy "Public Access" on diagram_states for all using (true);
create policy "Public Access" on generated_code for all using (true);
create policy "Public Access" on schema_explanations for all using (true);
create policy "Public Access" on documentation_outputs for all using (true);
create policy "Public Access" on project_settings for all using (true);
create policy "Public Access" on schema_changes for all using (true);

-- 10. SCHEMA COMMENTS (Tribal Knowledge)
create table schema_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  version_number int not null,
  entity_type text not null, -- table | column
  entity_name text not null,
  content text not null,
  created_at timestamptz default now()
);

-- 11. SECURITY (RLS) FOR COMMENTS
alter table schema_comments enable row level security;
create policy "Public Access" on schema_comments for all using (true);

-- 12. AUTOMATION TRIGGERS
create or replace function handle_new_project() 
returns trigger as $$
begin
  insert into project_settings (project_id) values (new.id);
  return new;
end;
$$ language plpgsql;

create trigger tr_new_project_settings
  after insert on projects
  for each row execute function handle_new_project();
