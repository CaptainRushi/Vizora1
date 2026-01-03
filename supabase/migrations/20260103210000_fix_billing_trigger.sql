-- Fix Trigger Permissions for Workspace Billing and Usage
-- This is necessary because the default Trigger runs as the user (Security Invoker),
-- but users do not have permission to INSERT into 'workspace_billing' or 'workspace_usage' directly.

-- 1. Update the trigger function to be SECURITY DEFINER
-- This allows it to bypass RLS and write to the system tables.
create or replace function handle_new_workspace_billing()
returns trigger 
security definer
set search_path = public
language plpgsql
as $$
begin
  -- Initialize Billing (Default to Free)
  insert into workspace_billing (workspace_id, plan_id) values (new.id, 'free');
  
  -- Initialize Usage Tracking
  insert into workspace_usage (workspace_id) values (new.id);
  
  return new;
end;
$$;

-- 2. Ensure RLS is proper for workspace_usage (which was missing policies)
alter table workspace_usage enable row level security;

-- Drop existing policy if exists to avoid conflict (idempotent)
drop policy if exists "Workspace owners view usage" on workspace_usage;

create policy "Workspace owners view usage" on workspace_usage
  for select using (
    workspace_id in (select id from workspaces where owner_id = auth.uid())
  );
