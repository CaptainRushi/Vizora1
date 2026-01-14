/**
 * TEAM INVITE SYSTEM API ROUTES
 * 
 * Secure, admin-controlled team invitation via join links
 * 
 * Endpoints:
 * - POST /api/team/invite-link (Create/Regenerate invite link - Admin only)
 * - POST /api/team/invite-link/revoke (Revoke invite link - Admin only)
 * - GET /api/team/invite-link/validate (Validate invite token - Public)
 * - POST /api/team/join (Join workspace via link - Authenticated)
 */

import express from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = express.Router();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// Rate limiting store (simple in-memory for now)
const rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();

// Rate limit middleware for join attempts
function rateLimit(limit: number, windowMs: number) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        const key = req.ip || 'unknown';
        const now = Date.now();
        const record = rateLimitStore.get(key);

        if (record) {
            if (now > record.resetAt) {
                rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
            } else if (record.count >= limit) {
                return res.status(429).json({
                    error: 'Too many requests',
                    message: 'Please wait before trying again.'
                });
            } else {
                record.count++;
            }
        } else {
            rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        }

        next();
    };
}

// Generate secure random token
function generateSecureToken(): string {
    return crypto.randomBytes(32).toString('base64url');
}

// Helper: Check if user is admin of workspace
async function isAdminOf(userId: string, workspaceId: string): Promise<boolean> {
    // Check if owner
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

    if (workspace?.owner_id === userId) return true;

    // Check if admin member
    const { data: member } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

    return member?.role === 'admin';
}

// Helper: Log activity
async function logActivity(
    workspaceId: string,
    userId: string | null,
    action: string,
    metadata: Record<string, any> = {}
) {
    await supabase.from('activity_logs').insert({
        workspace_id: workspaceId,
        user_id: userId,
        action,
        metadata
    });
}

/**
 * POST /api/team/invite-link
 * Create or regenerate invite link (Admin only)
 */
router.post('/invite-link', async (req, res) => {
    try {
        const { workspace_id, role = 'member', expires_in_days = 7 } = req.body;
        const userId = req.headers['x-user-id'] as string;

        if (!workspace_id) {
            return res.status(400).json({ error: 'workspace_id is required' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Verify admin access
        const isAdmin = await isAdminOf(userId, workspace_id);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only workspace admins can create invite links.'
            });
        }

        // Validate role
        const validRoles = ['member', 'admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                error: 'Invalid role',
                message: 'Role must be "member" or "admin".'
            });
        }

        // Optionally deactivate existing active links
        await supabase
            .from('workspace_invites')
            .update({ is_active: false })
            .eq('workspace_id', workspace_id)
            .eq('is_active', true);

        // Generate secure token
        const token = generateSecureToken();

        // Calculate expiry
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expires_in_days);

        // Create invite record
        const { data: invite, error: insertError } = await supabase
            .from('workspace_invites')
            .insert({
                workspace_id,
                token,
                role,
                expires_at: expiresAt.toISOString(),
                max_uses: 50, // Allow multi-use
                used_count: 0,
                revoked: false,
                is_active: true,
                created_by: userId
            })
            .select()
            .single();

        if (insertError) throw insertError;

        // Log activity
        await logActivity(workspace_id, userId, 'invite_link_created', {
            role,
            expires_in_days,
            invite_id: invite.id
        });

        // Construct join URL
        const baseUrl = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'https://vizora.app';
        const joinUrl = `${baseUrl}/join/team?token=${token}`;

        res.json({
            success: true,
            join_url: joinUrl,
            invite: {
                id: invite.id,
                role: invite.role,
                expires_at: invite.expires_at,
                created_at: invite.created_at
            },
            message: 'Join link created. Share it with your teammate.'
        });

    } catch (error: any) {
        console.error('[Team Invite] Create link error:', error);
        res.status(500).json({
            error: 'Failed to create invite link',
            message: error.message
        });
    }
});

/**
 * POST /api/team/invite-link/revoke
 * Revoke active invite link (Admin only)
 */
router.post('/invite-link/revoke', async (req, res) => {
    try {
        const { workspace_id, invite_id } = req.body;
        const userId = req.headers['x-user-id'] as string;

        if (!workspace_id) {
            return res.status(400).json({ error: 'workspace_id is required' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Verify admin access
        const isAdmin = await isAdminOf(userId, workspace_id);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only workspace admins can revoke invite links.'
            });
        }

        // Revoke specific invite or all active invites
        const query = supabase
            .from('workspace_invites')
            .update({
                is_active: false,
                revoked: true
            })
            .eq('workspace_id', workspace_id);

        if (invite_id) {
            query.eq('id', invite_id);
        } else {
            query.eq('is_active', true);
        }

        const { error: updateError } = await query;

        if (updateError) throw updateError;

        // Log activity
        await logActivity(workspace_id, userId, 'invite_link_revoked', {
            invite_id: invite_id || 'all'
        });

        res.json({
            success: true,
            message: 'Join link revoked. Existing links will no longer work.'
        });

    } catch (error: any) {
        console.error('[Team Invite] Revoke link error:', error);
        res.status(500).json({
            error: 'Failed to revoke invite link',
            message: error.message
        });
    }
});

/**
 * GET /api/team/invite-link/validate
 * Validate invite token (Public - for join page)
 */
router.get('/invite-link/validate', rateLimit(30, 60000), async (req, res) => {
    try {
        const token = req.query.token as string;

        if (!token) {
            return res.status(400).json({
                valid: false,
                error: 'Token is required'
            });
        }

        // Fetch invite with workspace details
        const { data: invite, error: fetchError } = await supabase
            .from('workspace_invites')
            .select(`
                id,
                role,
                expires_at,
                is_active,
                revoked,
                used_count,
                max_uses,
                workspace:workspaces(id, name, type)
            `)
            .eq('token', token)
            .single();

        if (fetchError || !invite) {
            return res.json({
                valid: false,
                error: 'This invite link is invalid or expired.'
            });
        }

        // Check if revoked
        if (invite.revoked || !invite.is_active) {
            return res.json({
                valid: false,
                error: 'This invite link has been revoked.'
            });
        }

        // Check expiry
        if (new Date(invite.expires_at) < new Date()) {
            return res.json({
                valid: false,
                error: 'This invite link has expired.'
            });
        }

        // Check usage limit
        if (invite.max_uses && invite.used_count >= invite.max_uses) {
            return res.json({
                valid: false,
                error: 'This invite link has reached its maximum uses.'
            });
        }

        // Valid invite - return workspace info
        const workspace = invite.workspace as any;

        res.json({
            valid: true,
            workspace_name: workspace?.name || 'Workspace',
            workspace_type: workspace?.type || 'team',
            role: invite.role,
            expires_at: invite.expires_at,
            message: `You are joining this workspace as a ${invite.role}.`
        });

    } catch (error: any) {
        console.error('[Team Invite] Validate token error:', error);
        res.json({
            valid: false,
            error: 'This invite link is invalid or expired.'
        });
    }
});

/**
 * POST /api/team/join
 * Join workspace via invite link (Authenticated)
 */
router.post('/join', rateLimit(10, 60000), async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.headers['x-user-id'] as string;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token is required'
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                redirect: `/login?redirectTo=/join/team?token=${token}`
            });
        }

        // Fetch and validate invite
        const { data: invite, error: fetchError } = await supabase
            .from('workspace_invites')
            .select('*')
            .eq('token', token)
            .single();

        if (fetchError || !invite) {
            return res.status(400).json({
                success: false,
                error: 'This invite link is invalid or expired.'
            });
        }

        // Validation checks
        if (invite.revoked || !invite.is_active) {
            return res.status(400).json({
                success: false,
                error: 'This invite link has been revoked.'
            });
        }

        if (new Date(invite.expires_at) < new Date()) {
            return res.status(400).json({
                success: false,
                error: 'This invite link has expired.'
            });
        }

        if (invite.max_uses && invite.used_count >= invite.max_uses) {
            return res.status(400).json({
                success: false,
                error: 'This invite link has reached its maximum uses.'
            });
        }

        // Check if already a member
        const { data: existingMember } = await supabase
            .from('workspace_members')
            .select('id')
            .eq('workspace_id', invite.workspace_id)
            .eq('user_id', userId)
            .single();

        if (existingMember) {
            return res.json({
                success: true,
                already_member: true,
                message: 'You are already a member of this workspace.'
            });
        }

        // Check if owner
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('owner_id, name')
            .eq('id', invite.workspace_id)
            .single();

        if (workspace?.owner_id === userId) {
            return res.json({
                success: true,
                already_member: true,
                message: 'You are the owner of this workspace.'
            });
        }

        // Add user as member
        const { error: memberError } = await supabase
            .from('workspace_members')
            .insert({
                workspace_id: invite.workspace_id,
                user_id: userId,
                role: invite.role
            });

        if (memberError) {
            // Handle duplicate key violation (already member)
            if (memberError.code === '23505') {
                return res.json({
                    success: true,
                    already_member: true,
                    message: 'You are already a member of this workspace.'
                });
            }
            throw memberError;
        }

        // Increment used count
        await supabase
            .from('workspace_invites')
            .update({ used_count: (invite.used_count || 0) + 1 })
            .eq('id', invite.id);

        // Log activity
        await logActivity(invite.workspace_id, userId, 'team_member_joined', {
            role: invite.role,
            invite_id: invite.id
        });

        res.json({
            success: true,
            message: `Welcome to ${workspace?.name || 'the team'}!`,
            workspace_id: invite.workspace_id,
            role: invite.role
        });

    } catch (error: any) {
        console.error('[Team Invite] Join error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to join workspace',
            message: error.message
        });
    }
});

export default router;
