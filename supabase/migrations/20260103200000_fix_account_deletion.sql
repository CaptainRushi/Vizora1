-- Function to permanently delete account and workspace data
-- Follows strict deletion order and role logic via RLS bypass (security definer)

create or replace function public.delete_account_completely(
    target_user_id uuid,
    target_workspace_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    ws_type text;
    user_role text;
begin
    -- 1. Check Workspace Type & User Role
    select type into ws_type from workspaces where id = target_workspace_id;
    
    -- Get role from workspace_members
    select role into user_role 
    from workspace_members 
    where workspace_id = target_workspace_id 
    and user_id = target_user_id;

    -- Guard Clauses
    if ws_type = 'team' and user_role != 'admin' then
        raise exception 'Access Denied: Only admins can delete team workspaces.';
    end if;

    -- 2. Execute Deletion in strict order

    -- A. Projects (and all related data via CASCADE)
    delete from projects where workspace_id = target_workspace_id;
    
    -- NB: We do NOT delete by owner_id anymore as 'owner_id' column may not exist on projects table
    -- in the new workspace-centric schema.

    -- B. Workspace Access
    delete from workspace_invites where workspace_id = target_workspace_id;
    delete from workspace_members where workspace_id = target_workspace_id;

    -- C. Billing (Cascades from workspace usually, but ensuring cleanup)
    delete from workspace_billing where workspace_id = target_workspace_id;
    delete from workspace_usage where workspace_id = target_workspace_id;

    -- D. Pre-cleanup: Unlink this workspace from any profiles using it as default
    -- This fixes the foreign key constraint violation (profiles_default_workspace_id_fkey)
    update profiles set default_workspace_id = null where default_workspace_id = target_workspace_id;

    -- E. The Workspace itself
    delete from workspaces where id = target_workspace_id;

    -- E. The User Profile (public portion)
    delete from profiles where id = target_user_id;

end;
$$;
