import { supabase } from '../lib/supabase.js';

export async function getWorkspaceIdFromProject(projectId: string): Promise<string | null> {
    const { data } = await supabase.from('projects').select('workspace_id').eq('id', projectId).single();
    if (!data || !data.workspace_id) {
        return null;
    }
    return data.workspace_id;
}

export async function getOwnerIdFromProject(projectId: string): Promise<string | null> {
    const { data } = await supabase.from('projects').select('owner_id').eq('id', projectId).single();
    return data?.owner_id || null;
}

export async function getOwnerIdFromWorkspace(workspaceId: string): Promise<string | null> {
    const { data } = await supabase.from('workspaces').select('owner_id').eq('id', workspaceId).single();
    return data?.owner_id || null;
}
