/**
 * WORKSPACE MEMBER MANAGEMENT API ROUTES
 * 
 * Role Management System (Admin / Member)
 * 
 * Endpoints:
 * - GET /api/workspace/members (Fetch member list)
 * - PATCH /api/workspace/members/:userId/role (Change role - Admin only)
 * - DELETE /api/workspace/members/:userId (Remove member - Admin only)
 * 
 * ROLES:
 * - admin: Can invite, remove members, change roles, edit workspace
 * - member: Can view projects, paste schemas, use AI features
 */

import express, { Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';


const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// ============================
// HELPER FUNCTIONS
// ============================

/**
 * Check if user is admin of workspace
 */
async function isAdminOfWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    // Check if owner
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

    if (workspace?.owner_id === userId) {
        return true;
    }

    // Check membership role
    const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle();

    return membership?.role === 'admin';
}

/**
 * Count admins in workspace (including owner)
 */
async function countAdmins(workspaceId: string): Promise<number> {
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

    let count = workspace?.owner_id ? 1 : 0;

    const { count: adminCount } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('role', 'admin');

    count += adminCount || 0;
    return count;
}

// ============================
// ROUTES
// ============================

/**
 * GET /api/workspace/members
 * Fetch member list for the workspace
 * 
 * Query params:
 * - workspaceId: UUID of the workspace
 * 
 * Response:
 * [
 *   {
 *     "id": "uuid",
 *     "username": "rushi",
 *     "display_name": "Rushi Bodke",
 *     "email": null, // Not available without auth.users access
 *     "role": "admin",
 *     "joined_at": "2026-01-10T09:00:00Z"
 *   }
 * ]
 */
router.get('/members', async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Get workspace info
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('owner_id, type')
            .eq('id', workspaceId)
            .single();

        if (!workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        // Get all members
        const { data: members } = await supabase
            .from('workspace_members')
            .select('id, user_id, role, created_at')
            .eq('workspace_id', workspaceId);

        // Get profile info for all users
        const memberIds = members?.map(m => m.user_id) || [];
        const allUserIds = [workspace.owner_id, ...memberIds].filter(Boolean);

        const { data: profiles } = await supabase
            .from('users')
            .select('id, username, display_name, email')
            .in('id', allUserIds);

        const memberList = (members || []).map((m) => {
            const profile = profiles?.find(p => p.id === m.user_id);

            return {
                id: m.user_id,
                username: profile?.username || null,
                display_name: profile?.display_name || null,
                email: profile?.email || null,
                role: m.role as 'admin' | 'editor' | 'viewer' | 'member',
                joined_at: m.created_at
            };
        });

        // Add owner if not in members list
        const ownerInMembers = memberList.find(m => m.id === workspace.owner_id);
        if (!ownerInMembers && workspace.owner_id) {
            const ownerProfile = profiles?.find(p => p.id === workspace.owner_id);
            memberList.unshift({
                id: workspace.owner_id,
                username: ownerProfile?.username || null,
                display_name: ownerProfile?.display_name || null,
                email: ownerProfile?.email || null,
                role: 'admin' as const,
                joined_at: null
            });
        }

        res.json(memberList);
    } catch (err: any) {
        console.error('[Workspace Members] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/workspace/members/:userId/role
 * Change a member's role (Admin only)
 * 
 * Request body:
 * { "role": "member" }
 * 
 * Rules:
 * - Only admins can call this
 * - Admin cannot demote themselves if they are the last admin
 */
router.patch('/members/:userId/role', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { role, workspaceId, requesterId } = req.body;

        if (!userId || !role || !workspaceId || !requesterId) {
            return res.status(400).json({
                error: 'userId (param), role, workspaceId, and requesterId are required'
            });
        }

        // Validate role
        if (!['admin', 'editor', 'viewer', 'member'].includes(role)) {
            return res.status(400).json({
                error: 'Invalid role',
                message: 'Role must be "admin", "editor", "viewer", or "member".'
            });
        }

        // Check if requester is admin
        const isAdmin = await isAdminOfWorkspace(requesterId, workspaceId);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Admin access required',
                message: "You don't have permission to change roles."
            });
        }

        // Cannot change own role
        if (userId === requesterId) {
            return res.status(400).json({
                error: 'Cannot change own role',
                message: 'You cannot change your own role.'
            });
        }

        // Get target member
        const { data: targetMember } = await supabase
            .from('workspace_members')
            .select('id, user_id, role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .single();

        if (!targetMember) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Last admin protection
        if (targetMember.role === 'admin' && role === 'member') {
            const adminCount = await countAdmins(workspaceId);
            if (adminCount <= 1) {
                return res.status(400).json({
                    error: 'Last admin protection',
                    message: 'A workspace must have at least one admin.'
                });
            }
        }

        const previousRole = targetMember.role;

        // Update role
        const { error } = await supabase
            .from('workspace_members')
            .update({ role })
            .eq('id', targetMember.id);

        if (error) throw error;

        // Get target user's profile for activity log
        const { data: targetProfile } = await supabase
            .from('users')
            .select('username')
            .eq('id', userId)
            .maybeSingle();



        res.json({
            success: true,
            message: `Role changed from ${previousRole} to ${role}.`
        });
    } catch (err: any) {
        console.error('[Workspace Role Change] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/workspace/members/:userId
 * Remove a member from the workspace (Admin only)
 * 
 * Query params:
 * - workspaceId: UUID of the workspace
 * - requesterId: UUID of the requesting user
 */
router.delete('/members/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { workspaceId, requesterId } = req.body;

        if (!userId || !workspaceId || !requesterId) {
            return res.status(400).json({
                error: 'userId (param), workspaceId, and requesterId are required'
            });
        }

        // Check if requester is admin
        const isAdmin = await isAdminOfWorkspace(requesterId, workspaceId);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Admin access required',
                message: "You don't have permission to remove members."
            });
        }

        // Check if target is the workspace owner
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('owner_id')
            .eq('id', workspaceId)
            .single();

        if (workspace?.owner_id === userId) {
            return res.status(400).json({
                error: 'Cannot remove owner',
                message: 'The workspace owner cannot be removed.'
            });
        }

        // Get target member info for logging
        const { data: targetMember } = await supabase
            .from('workspace_members')
            .select('id, role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .single();

        if (!targetMember) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // Get target user's profile for activity log
        const { data: targetProfile } = await supabase
            .from('users')
            .select('username')
            .eq('id', userId)
            .maybeSingle();

        // Remove member
        const { error } = await supabase
            .from('workspace_members')
            .delete()
            .eq('id', targetMember.id);

        if (error) throw error;



        res.json({
            success: true,
            message: 'Member removed from workspace.'
        });
    } catch (err: any) {
        console.error('[Workspace Member Remove] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/workspace/:workspaceId
 * Delete an entire workspace (Owner only)
 * 
 * This will cascade delete:
 * - All workspace members
 * - All workspace invites
 * - All schema versions
 * - All activity logs
 * 
 * Request body:
 * { "requesterId": "uuid" }
 */
router.delete('/:workspaceId', async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { requesterId } = req.body;

        if (!workspaceId || !requesterId) {
            return res.status(400).json({
                error: 'workspaceId (param) and requesterId are required'
            });
        }

        // Verify workspace exists and get owner
        const { data: workspace, error: wsError } = await supabase
            .from('workspaces')
            .select('id, name, owner_id')
            .eq('id', workspaceId)
            .single();

        if (wsError || !workspace) {
            return res.status(404).json({ error: 'Workspace not found' });
        }

        // Only owner can delete workspace
        if (workspace.owner_id !== requesterId) {
            return res.status(403).json({
                error: 'Owner access required',
                message: 'Only the workspace owner can delete the workspace.'
            });
        }

        console.log(`[Workspace Delete] Deleting workspace ${workspace.name} (${workspaceId})`);

        // Delete related data in order (due to foreign key constraints)
        // 1. Delete workspace invites
        await supabase
            .from('workspace_invites')
            .delete()
            .eq('workspace_id', workspaceId);

        // 2. Delete workspace members
        await supabase
            .from('workspace_members')
            .delete()
            .eq('workspace_id', workspaceId);

        // 3. Delete schema versions
        await supabase
            .from('schema_versions')
            .delete()
            .eq('workspace_id', workspaceId);



        // 5. Finally, delete the workspace itself
        const { error: deleteError } = await supabase
            .from('workspaces')
            .delete()
            .eq('id', workspaceId);

        if (deleteError) throw deleteError;

        console.log(`[Workspace Delete] Successfully deleted workspace: ${workspace.name}`);

        res.json({
            success: true,
            message: `Workspace "${workspace.name}" has been permanently deleted.`
        });
    } catch (err: any) {
        console.error('[Workspace Delete] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;

