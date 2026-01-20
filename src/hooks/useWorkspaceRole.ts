/**
 * WORKSPACE ROLE HOOK
 * 
 * Provides role-based access control utilities for the frontend.
 * 
 * Core Principle: Roles define who can manage, not what can be configured.
 * 
 * Two roles only:
 * - admin: Owns the workspace. Can invite, remove, change roles, edit workspace.
 * - member: Participates but does not manage. Can view and work on projects.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export type WorkspaceRole = 'admin' | 'member';

interface UseWorkspaceRoleReturn {
    role: WorkspaceRole;
    isAdmin: boolean;
    isMember: boolean;
    isOwner: boolean;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

interface UseWorkspaceRoleOptions {
    workspaceId?: string | null;
}

/**
 * Hook to get the current user's role in a workspace
 * 
 * Usage:
 * const { isAdmin, isMember, role, loading } = useWorkspaceRole({ workspaceId });
 * 
 * Then in JSX:
 * {isAdmin && <AdminControls />}
 */
export function useWorkspaceRole(options: UseWorkspaceRoleOptions = {}): UseWorkspaceRoleReturn {
    const { user } = useAuth();
    const { workspaceId } = options;

    const [role, setRole] = useState<WorkspaceRole>('member');
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRole = useCallback(async () => {
        if (!user?.id) {
            setRole('member');
            setIsOwner(false);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            let activeWorkspaceId = workspaceId;

            // If no workspaceId provided, find the user's primary workspace
            if (!activeWorkspaceId) {
                // Check if they own any workspace
                const { data: ownedWs } = await supabase
                    .from('workspaces')
                    .select('id')
                    .eq('owner_id', user.id)
                    .maybeSingle();

                if (ownedWs) {
                    activeWorkspaceId = ownedWs.id;
                } else {
                    // Check if they are a member of any workspace
                    const { data: memberWs } = await supabase
                        .from('workspace_members')
                        .select('workspace_id')
                        .eq('user_id', user.id)
                        .limit(1)
                        .maybeSingle();

                    if (memberWs) {
                        activeWorkspaceId = memberWs.workspace_id;
                    }
                }
            }

            if (!activeWorkspaceId) {
                setRole('member');
                setIsOwner(false);
                setLoading(false);
                return;
            }

            // Check if user is workspace owner
            const { data: workspace, error: wsError } = await supabase
                .from('workspaces')
                .select('owner_id')
                .eq('id', activeWorkspaceId)
                .single();

            if (wsError) throw wsError;

            if (workspace?.owner_id === user.id) {
                setRole('admin');
                setIsOwner(true);
                setLoading(false);
                return;
            }

            // Check workspace membership
            const { data: membership, error: memberError } = await supabase
                .from('workspace_members')
                .select('role')
                .eq('workspace_id', activeWorkspaceId)
                .eq('user_id', user.id)
                .maybeSingle();

            if (memberError) throw memberError;

            // Map role to our two-role system
            const memberRole = membership?.role;
            if (memberRole === 'admin') {
                setRole('admin');
            } else {
                // Everything else (member, editor, viewer, etc.) is treated as 'member'
                setRole('member');
            }
            setIsOwner(false);

        } catch (err: any) {
            console.error('[useWorkspaceRole] Error fetching role:', err);
            setError(err.message);
            setRole('member'); // Default to member on error (fail-safe)
            setIsOwner(false);
        } finally {
            setLoading(false);
        }
    }, [user?.id, workspaceId]);

    useEffect(() => {
        fetchRole();
    }, [fetchRole]);

    return {
        role,
        isAdmin: role === 'admin',
        isMember: role === 'member',
        isOwner,
        loading,
        error,
        refetch: fetchRole
    };
}

/**
 * Type guard for admin-only actions
 * Use this before performing admin actions as an extra safety layer
 */
export function isAdminAction(role: WorkspaceRole): boolean {
    return role === 'admin';
}

/**
 * ADMIN-ONLY ACTIONS (for reference):
 * - Invite members
 * - Remove members
 * - Change member roles
 * - Edit workspace name
 * - View billing & plan details
 * 
 * MEMBER ACTIONS (everyone can do):
 * - View and edit projects
 * - Paste schemas
 * - Generate diagrams, docs, AI answers
 * - View team activity log
 */
