/**
 * ROLE MANAGEMENT MIDDLEWARE
 * 
 * Core principle: Roles define who can manage, not what can be configured.
 * Only two roles: admin and member.
 * 
 * This middleware enforces admin-only access to protected routes.
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Extend Express Request to include role info
export interface AuthenticatedRequest extends Request {
    userRole?: 'admin' | 'member';
    isWorkspaceOwner?: boolean;
}

/**
 * Check if a user is an admin of a workspace
 * Admin = workspace owner OR workspace_members.role === 'admin'
 */
export async function isAdminOfWorkspace(userId: string, workspaceId: string): Promise<{
    isAdmin: boolean;
    isOwner: boolean;
    role: 'admin' | 'member';
}> {
    // 1. Universal ID Check (New System)
    // In the new system, workspaceId IS the universal_id.
    // We check if the userId (Auth ID) matches the auth_user_id for this universal_id.
    const { data: universalUser } = await supabase
        .from('universal_users')
        .select('auth_user_id')
        .eq('universal_id', workspaceId)
        .maybeSingle();

    if (universalUser && universalUser.auth_user_id === userId) {
        return { isAdmin: true, isOwner: true, role: 'admin' };
    }

    // 2. Legacy / Shared Workspace Check
    // Check if workspace owner in legacy table
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .maybeSingle(); // Use maybeSingle to avoid 406 on no rows

    if (workspace?.owner_id === userId) {
        return { isAdmin: true, isOwner: true, role: 'admin' };
    }

    // 3. Check membership role (Shared Access)
    const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();

    const role = member?.role === 'admin' ? 'admin' : 'member';
    return {
        isAdmin: role === 'admin',
        isOwner: false,
        role: member ? role : 'member' // Default to member if not found (technically should be 'none' but keeping compat)
    };
}

/**
 * Middleware: Require Admin Access
 * 
 * This middleware MUST protect all admin-only routes:
 * - POST /api/team/invite
 * - PATCH /api/team/role  
 * - DELETE /api/team/remove
 * - PATCH /api/workspace (edit workspace name)
 * - GET /api/billing (admin only)
 * 
 * Usage: router.post('/protected-route', requireAdmin, handler);
 */
export function requireAdmin(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const userId = req.headers['x-user-id'] as string || req.body.userId;
    const workspaceId = req.headers['x-workspace-id'] as string ||
        req.body.workspaceId ||
        req.body.workspace_id ||
        req.query.workspaceId;

    if (!userId) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please sign in to continue.'
        });
    }

    if (!workspaceId) {
        return res.status(400).json({
            error: 'Workspace context required',
            message: 'A workspace ID is required for this action.'
        });
    }

    // Check admin status asynchronously
    isAdminOfWorkspace(userId, workspaceId as string)
        .then(({ isAdmin, isOwner, role }) => {
            if (!isAdmin) {
                return res.status(403).json({
                    error: 'Admin access required',
                    message: "You don't have permission to perform this action."
                });
            }

            // Attach role info to request for downstream use
            req.userRole = role;
            req.isWorkspaceOwner = isOwner;
            next();
        })
        .catch(err => {
            console.error('[RequireAdmin] Error checking admin status:', err);
            return res.status(500).json({
                error: 'Permission check failed',
                message: 'Unable to verify your permissions.'
            });
        });
}

/**
 * Middleware: Attach User Role (non-blocking)
 * 
 * Attaches role info to request without blocking non-admins.
 * Useful for routes that need role info but don't require admin.
 */
export function attachUserRole(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    const userId = req.headers['x-user-id'] as string || req.body.userId;
    const workspaceId = req.headers['x-workspace-id'] as string ||
        req.body.workspaceId ||
        req.body.workspace_id ||
        req.query.workspaceId;

    if (!userId || !workspaceId) {
        // Continue without role info
        next();
        return;
    }

    isAdminOfWorkspace(userId, workspaceId as string)
        .then(({ role, isOwner }) => {
            req.userRole = role;
            req.isWorkspaceOwner = isOwner;
            next();
        })
        .catch(() => {
            // Continue without role info on error
            next();
        });
}

/**
 * Role Change Validation
 * 
 * Rules:
 * - User cannot change their own role
 * - Workspace must always have at least one admin
 * - Only admins can change roles
 */
export async function validateRoleChange(
    workspaceId: string,
    actorUserId: string,
    targetMemberId: string,
    newRole: 'admin' | 'member'
): Promise<{ valid: boolean; error?: string }> {

    // Get target user info
    const { data: targetMember } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('id', targetMemberId)
        .single();

    if (!targetMember) {
        return { valid: false, error: 'Member not found.' };
    }

    // Rule 1: Cannot change own role
    if (targetMember.user_id === actorUserId) {
        return { valid: false, error: 'You cannot change your own role.' };
    }

    // Rule 2: If demoting from admin, ensure at least one admin remains
    if (targetMember.role === 'admin' && newRole === 'member') {
        // Count current admins (owner + admin members)

        // 1. Check Universal Owner
        const { data: uUser } = await supabase
            .from('universal_users')
            .select('auth_user_id')
            .eq('universal_id', workspaceId)
            .maybeSingle();

        // 2. Fallback to Legacy Owner
        let ownerId = uUser?.auth_user_id;

        if (!ownerId) {
            const { data: workspace } = await supabase
                .from('workspaces')
                .select('owner_id')
                .eq('id', workspaceId)
                .maybeSingle();
            ownerId = workspace?.owner_id;
        }

        const { count: adminMemberCount } = await supabase
            .from('workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId)
            .eq('role', 'admin');

        // Owner is always admin + count of admin members
        // Note: Owner might NOT be in workspace_members list in some models, so we assume owner is 1 admin.
        const totalAdmins = 1 + (adminMemberCount || 0);

        if (totalAdmins <= 1) {
            return { valid: false, error: 'Workspace must have at least one admin.' };
        }
    }

    return { valid: true };
}

/**
 * Member Removal Validation
 * 
 * Rules:
 * - Cannot remove workspace owner
 * - Only admins can remove members
 */
export async function validateMemberRemoval(
    workspaceId: string,
    targetMemberId: string
): Promise<{ valid: boolean; error?: string }> {

    // Get target user info
    const { data: targetMember } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('id', targetMemberId)
        .single();

    if (!targetMember) {
        return { valid: false, error: 'Member not found.' };
    }

    // Check if target is owner
    // 1. Universal Owner
    const { data: uUser } = await supabase
        .from('universal_users')
        .select('auth_user_id')
        .eq('universal_id', workspaceId)
        .maybeSingle();

    if (uUser && uUser.auth_user_id === targetMember.user_id) {
        return { valid: false, error: 'Cannot remove the workspace owner.' };
    }

    // 2. Legacy Owner (Fallback)
    if (!uUser) {
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('owner_id')
            .eq('id', workspaceId)
            .maybeSingle();

        if (workspace?.owner_id === targetMember.user_id) {
            return { valid: false, error: 'Cannot remove the workspace owner.' };
        }
    }

    return { valid: true };
}
