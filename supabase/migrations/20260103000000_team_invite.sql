-- 1. workspaces
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('personal', 'team')), -- 'personal' or 'team' (mapped from solo/team)
  owner_id uuid references auth.users(id),
  created_at timestamptz default now()
);

-- 2. workspace_members
create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id),
  role text not null check (role in ('admin', 'member')), 
  joined_at timestamptz default now(),
  unique(workspace_id, user_id)
);

-- 3. workspace_invites
create table if not exists workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade,
  token text unique not null,
  role text not null check (role in ('admin', 'member')),
  max_uses int default 1,
  used_count int default 0,
  expires_at timestamptz not null,
  revoked boolean default false,
  created_at timestamptz default now()
);

-- RLS Policies (Basic examples, refine as needed)
alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table workspace_invites enable row level security;

-- Workspace: Owners can view/edit their workspaces
create policy "Owners can view their workspaces" on workspaces
  for select using (auth.uid() = owner_id);

create policy "Members can view workspaces they belong to" on workspaces
  for select using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = workspaces.id
      and workspace_members.user_id = auth.uid()
    )
  );

-- Members
create policy "Members can view other members in same workspace" on workspace_members
  for select using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
    )
  );

-- Invites (Only admins can view/create)
create policy "Admins can view invites" on workspace_invites
  for select using (
    exists (
      select 1 from workspace_members
      where workspace_members.workspace_id = workspace_invites.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role = 'admin'
    )
    OR
    exists (
      select 1 from workspaces
      where workspaces.id = workspace_invites.workspace_id
      and workspaces.owner_id = auth.uid()
    )
  );
