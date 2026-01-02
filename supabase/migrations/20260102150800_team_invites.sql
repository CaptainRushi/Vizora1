-- Create team_invites table
create table if not exists team_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('viewer', 'editor', 'admin')),
  invite_token text not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  unique(project_id, email, status)
);

-- Create team_members table
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  email text not null,
  role text not null check (role in ('viewer', 'editor', 'admin')),
  joined_at timestamptz default now()
);

-- Create indexes
create index if not exists idx_team_invites_token on team_invites(invite_token);
create index if not exists idx_team_invites_project on team_invites(project_id);
create index if not exists idx_team_members_project on team_members(project_id);
create index if not exists idx_team_members_email on team_members(email);
