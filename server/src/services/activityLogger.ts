import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export type ActivityActionType =
    | 'schema_version_added'
    | 'schema_deleted'
    | 'schema_review_generated'
    | 'onboarding_guide_generated'
    | 'team_member_invited'
    | 'team_member_joined'
    | 'team_member_removed'
    | 'team_role_changed'
    | 'invite_link_created'
    | 'invite_link_revoked'
    | 'ai_question_asked'
    | 'ai_schema_review_run'
    | 'profile_updated';

interface LogOptions {
    workspaceId: string;
    userId: string;
    actionType: ActivityActionType;
    entityType?: 'schema' | 'project' | 'user' | 'ai' | 'profile' | 'team';
    entityName?: string;
    metadata?: Record<string, any>;
}

export async function logActivity({
    workspaceId,
    userId,
    actionType,
    entityType,
    entityName,
    metadata = {}
}: LogOptions) {
    try {
        console.log(`[ActivityLog] Logging ${actionType} for user ${userId} in workspace ${workspaceId}`);

        // 1. Get Actor Name (from profiles)
        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .maybeSingle();

        const actorName = profile?.username || 'Unknown User';

        // 2. Get Actor Role (Admin or Member)
        // Check if owner
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('owner_id')
            .eq('id', workspaceId)
            .single();

        let actorRole = 'member';
        if (workspace?.owner_id === userId) {
            actorRole = 'admin';
        } else {
            const { data: membership } = await supabase
                .from('workspace_members')
                .select('role')
                .eq('workspace_id', workspaceId)
                .eq('user_id', userId)
                .maybeSingle();

            actorRole = membership?.role || 'member';
        }

        // 3. Insert Log Entry
        const { error } = await supabase.from('activity_logs').insert({
            workspace_id: workspaceId,
            user_id: userId,
            actor_name: actorName,
            actor_role: actorRole,
            action_type: actionType,
            entity_type: entityType,
            entity_name: entityName,
            metadata: metadata
        });

        if (error) {
            console.error('[ActivityLog] Error inserting log:', error);
        }

    } catch (err) {
        // Silent failure - do not block primary action
        console.error('[ActivityLog] Critical failure:', err);
    }
}
