// Workspace Types - Comprehensive type definitions for Workspace feature

export interface Workspace {
    id: string;
    name: string;
    type: 'personal' | 'team';
    owner_id: string;
    created_at: string;
    updated_at?: string;
}

export interface WorkspaceMember {
    id: string;
    workspace_id: string;
    user_id: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    created_at: string;
    user?: {
        email: string;
        username?: string;
        avatar_url?: string;
    };
    profile?: {
        username?: string;
        display_name?: string;
        email?: string;
    };
}

export interface SchemaVersion {
    id: string;
    workspace_id: string;
    version_number: number;
    code: string;
    raw_schema?: string; // Legacy fallback
    created_by: string;
    created_by_username?: string; // Snapshotted at save time for attribution
    created_at: string;
    message?: string;
    author?: {
        email: string;
        username?: string;
        display_name?: string;
    };
}

/**
 * Version Diff Block - Represents a change in a version comparison
 * Attribution is attached to changes, not lines
 * This is post-edit, version-based attribution (NOT real-time presence)
 */
export interface VersionDiffBlock {
    id: string;
    workspace_id: string;
    from_version: number;
    to_version: number;
    block_index: number;
    block_start: number;
    block_end: number;
    change_type: 'added' | 'modified' | 'removed';
    before_text: string | null;
    after_text: string | null;
    edited_by_user_id: string;
    edited_by_username: string;
    created_at: string;
}

export interface WorkspaceInvite {
    id: string;
    workspace_id: string;
    token: string;
    role: 'admin' | 'member' | 'viewer';
    expires_at: string;
    used_count: number;
    max_uses: number;
    revoked: boolean;
    is_active: boolean;
    created_by: string;
    created_at: string;
}

export interface ActivityLog {
    id: string;
    workspace_id: string;
    user_id: string;
    action_type: string;
    actor_name: string;
    actor_role: string;
    entity_type?: 'workspace' | 'schema' | 'version' | 'team' | 'invite';
    entity_name?: string;
    metadata?: Record<string, any>;
    created_at: string;
}

// Permission helpers
export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface WorkspacePermissions {
    canEdit: boolean;
    canInvite: boolean;
    canManageMembers: boolean;
    canDeleteWorkspace: boolean;
    canCreateVersions: boolean;
    canViewHistory: boolean;
}

export function getPermissions(role: WorkspaceRole): WorkspacePermissions {
    switch (role) {
        case 'owner':
            return {
                canEdit: true,
                canInvite: true,
                canManageMembers: true,
                canDeleteWorkspace: true,
                canCreateVersions: true,
                canViewHistory: true,
            };
        case 'admin':
            return {
                canEdit: true,
                canInvite: true,
                canManageMembers: true,
                canDeleteWorkspace: false,
                canCreateVersions: true,
                canViewHistory: true,
            };
        case 'member':
            return {
                canEdit: true,
                canInvite: false,
                canManageMembers: false,
                canDeleteWorkspace: false,
                canCreateVersions: true,
                canViewHistory: true,
            };
        case 'viewer':
            return {
                canEdit: false,
                canInvite: false,
                canManageMembers: false,
                canDeleteWorkspace: false,
                canCreateVersions: false,
                canViewHistory: true,
            };
        default:
            return {
                canEdit: false,
                canInvite: false,
                canManageMembers: false,
                canDeleteWorkspace: false,
                canCreateVersions: false,
                canViewHistory: false,
            };
    }
}
