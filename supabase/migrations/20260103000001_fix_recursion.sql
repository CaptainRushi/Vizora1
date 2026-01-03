-- Fix infinite recursion by using a security definer function used for RLS checks

-- 1. Create a secure function to check membership
-- This function runs with the privileges of the creator (postgres/admin) 
-- and bypasses RLS on the tables it queries, breaking the recursion loop.
create or replace function public.is_member_of(_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from workspace_members
    where workspace_id = _workspace_id
    and user_id = auth.uid()
  );
$$;

-- 2. Create a secure function to check admin status
create or replace function public.is_admin_of(_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from workspace_members
    where workspace_id = _workspace_id
    and user_id = auth.uid()
    and role = 'admin'
  );
$$;

-- 3. Drop existing recursive policies
drop policy if exists "Members can view workspaces they belong to" on workspaces;
drop policy if exists "Members can view other members in same workspace" on workspace_members;
drop policy if exists "Admins can view invites" on workspace_invites;

-- 4. Re-create policies using the secure functions

-- WORKSPACES
create policy "Members can view workspaces they belong to" on workspaces
  for select using (
    -- You can see a workspace if you are the owner (checked by other policy) OR a member
    public.is_member_of(id)
  );

-- MEMBERS
create policy "Members can view other members in same workspace" on workspace_members
  for select using (
    -- You can see a membership row if you are a member of that workspace
    public.is_member_of(workspace_id) 
  );

-- INVITES
create policy "Admins can view invites" on workspace_invites
  for select using (
    -- You can see invites if you are an admin OR the owner
    public.is_admin_of(workspace_id)
    OR
    exists (select 1 from workspaces where id = workspace_id and owner_id = auth.uid())
  );
