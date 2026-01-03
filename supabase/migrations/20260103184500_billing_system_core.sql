-- BILLING SYSTEM CORE MIGRATION
-- Implements strict billing controls and workspace capabilities

-- 1. Create Billing Plans (Static Definition)
create table if not exists billing_plans (
  id text primary key,
  price_inr int not null,
  project_limit int not null,
  version_limit int not null, -- -1 for unlimited
  allow_exports boolean not null default false,
  allow_designer boolean not null default false,
  allow_team boolean not null default false,
  ai_level text not null check (ai_level in ('none', 'db', 'table', 'full'))
);

-- Seed Plans (Idempotent)
insert into billing_plans (id, price_inr, project_limit, version_limit, allow_exports, allow_designer, allow_team, ai_level)
values 
  ('free', 0, 1, 2, false, false, false, 'db'),
  ('pro', 599, 5, 20, true, true, false, 'table'),
  ('teams', 1999, 15, -1, true, true, true, 'full')
on conflict (id) do update set
  price_inr = excluded.price_inr,
  project_limit = excluded.project_limit,
  version_limit = excluded.version_limit,
  allow_exports = excluded.allow_exports,
  allow_designer = excluded.allow_designer,
  allow_team = excluded.allow_team,
  ai_level = excluded.ai_level;

-- 2. Workspace Billing (The active subscription state)
-- Replaces previous billing_state if exists
drop table if exists billing_state; 
drop table if exists workspace_billing;

create table workspace_billing (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  plan_id text references billing_plans(id) default 'free',
  status text check (status in ('active', 'canceled', 'past_due', 'trial')) default 'active',
  current_period_start timestamptz default now(),
  current_period_end timestamptz default (now() + interval '30 days')
);

-- Enable RLS
alter table workspace_billing enable row level security;
create policy "Workspace owners view billing" on workspace_billing
  for select using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );

-- 3. Update Projects to belong to Workspaces
-- This is critical for plan enforcement
alter table projects add column if not exists workspace_id uuid references workspaces(id);
create index if not exists idx_projects_workspace on projects(workspace_id);

-- 4. Update Workspace Members Roles
-- We need to support admin, editor, viewer as per spec
alter table workspace_members drop constraint if exists workspace_members_role_check;
alter table workspace_members add constraint workspace_members_role_check 
  check (role in ('admin', 'editor', 'viewer', 'member')); 
-- Note: 'member' kept for backward compatibility if data exists, but UI should use admin/editor/viewer

-- 5. Usage Tracking (Workspace Level)
create table if not exists workspace_usage (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  projects_count int default 0,
  storage_bytes bigint default 0,
  ai_tokens_used bigint default 0,
  updated_at timestamptz default now()
);

-- Trigger to initialize billing on workspace creation
create or replace function handle_new_workspace_billing()
returns trigger as $$
begin
  insert into workspace_billing (workspace_id, plan_id) values (new.id, 'free');
  insert into workspace_usage (workspace_id) values (new.id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists tr_init_workspace_billing on workspaces;
create trigger tr_init_workspace_billing
  after insert on workspaces
  for each row execute function handle_new_workspace_billing();
