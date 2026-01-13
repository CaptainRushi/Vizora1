import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/dashboard/identity
 * Returns user identity and workspace information
 */
router.get('/identity', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // 1. Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('username, role_title, created_at')
            .eq('id', userId)
            .maybeSingle();

        // 2. Get workspace (owned or member)
        let workspace = null;
        let role = 'admin';

        // Check if owner
        const { data: ownedWorkspace } = await supabase
            .from('workspaces')
            .select('id, name, type, created_at, owner_id')
            .eq('owner_id', userId)
            .maybeSingle();

        if (ownedWorkspace) {
            workspace = ownedWorkspace;
            role = 'admin';
        } else {
            // Check membership
            const { data: membership } = await supabase
                .from('workspace_members')
                .select('workspace_id, role')
                .eq('user_id', userId)
                .maybeSingle();

            if (membership) {
                const { data: memberWorkspace } = await supabase
                    .from('workspaces')
                    .select('id, name, type, created_at, owner_id')
                    .eq('id', membership.workspace_id)
                    .single();

                workspace = memberWorkspace;
                role = membership.role;
            }
        }

        // 3. Get member count for team workspaces
        let memberCount = 1;
        if (workspace) {
            const { count } = await supabase
                .from('workspace_members')
                .select('*', { count: 'exact', head: true })
                .eq('workspace_id', workspace.id);
            memberCount = (count || 0) + 1; // +1 for owner
        }

        res.json({
            user: {
                id: userId,
                username: profile?.username || null,
                role_title: profile?.role_title || null,
                created_at: profile?.created_at
            },
            workspace: workspace ? {
                id: workspace.id,
                name: workspace.name,
                type: workspace.type,
                created_at: workspace.created_at,
                member_count: memberCount
            } : null,
            role
        });
    } catch (err: any) {
        console.error('[Dashboard Identity] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/dashboard/identity
 * Update user/workspace info (inline edit)
 */
router.patch('/identity', async (req, res) => {
    try {
        const { userId, username, workspaceName, workspaceId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Update username if provided
        if (username !== undefined) {
            const { error: usernameError } = await supabase
                .from('profiles')
                .update({ username, updated_at: new Date().toISOString() })
                .eq('id', userId);

            if (usernameError) throw usernameError;
        }

        // Update workspace name if provided
        if (workspaceName !== undefined && workspaceId) {
            const { error: wsError } = await supabase
                .from('workspaces')
                .update({ name: workspaceName, updated_at: new Date().toISOString() })
                .eq('id', workspaceId);

            if (wsError) throw wsError;
        }

        res.json({ success: true });
    } catch (err: any) {
        console.error('[Dashboard Identity Update] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/dashboard/usage
 * Returns usage statistics for the workspace
 */
router.get('/usage', async (req, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Get projects
        const { data: projects } = await supabase
            .from('projects')
            .select('id, created_at')
            .eq('workspace_id', workspaceId);

        const projectIds = projects?.map(p => p.id) || [];

        let totalVersions = 0;
        let totalDiagrams = 0;
        let totalDocs = 0;
        let totalAiQuestions = 0;
        let lastActivity: string | null = null;

        if (projectIds.length > 0) {
            // Schema versions count
            const { count: versionCount } = await supabase
                .from('schema_versions')
                .select('*', { count: 'exact', head: true })
                .in('project_id', projectIds);
            totalVersions = versionCount || 0;

            // Documentation count (from documentation_outputs or documentation_versions)
            const { count: docsCount } = await supabase
                .from('documentation_outputs')
                .select('*', { count: 'exact', head: true })
                .in('project_id', projectIds);
            totalDocs = docsCount || 0;

            // AI questions count
            const { count: aiCount } = await supabase
                .from('ask_schema_logs')
                .select('*', { count: 'exact', head: true })
                .in('project_id', projectIds);
            totalAiQuestions = aiCount || 0;

            // Get last activity (most recent schema version)
            const { data: latestVersion } = await supabase
                .from('schema_versions')
                .select('created_at')
                .in('project_id', projectIds)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            lastActivity = latestVersion?.created_at || null;

            // Diagrams = versions (each version generates a diagram)
            totalDiagrams = totalVersions;
        }

        res.json({
            projects: projects?.length || 0,
            schema_versions: totalVersions,
            diagrams_generated: totalDiagrams,
            docs_generated: totalDocs,
            ai_questions: totalAiQuestions,
            last_activity: lastActivity
        });
    } catch (err: any) {
        console.error('[Dashboard Usage] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/dashboard/billing
 * Returns billing and plan information
 */
router.get('/billing', async (req, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Get workspace billing
        const { data: billing } = await supabase
            .from('workspace_billing')
            .select('plan_id, status, start_at, expires_at')
            .eq('workspace_id', workspaceId)
            .maybeSingle();

        // Get plan details
        const planId = billing?.plan_id || 'free';
        const { data: plan } = await supabase
            .from('billing_plans')
            .select('*')
            .eq('id', planId)
            .single();

        // Get current usage for limits
        const { data: usage } = await supabase
            .from('workspace_usage')
            .select('projects_count, ai_tokens_used')
            .eq('workspace_id', workspaceId)
            .maybeSingle();

        // Count actual projects
        const { count: projectCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspaceId);

        res.json({
            plan: {
                id: plan?.id || 'free',
                name: plan?.id === 'teams' ? 'Teams' : plan?.id === 'pro' ? 'Pro' : 'Free',
                price: plan?.price_inr || 0,
                cycle: 'monthly'
            },
            status: billing?.status || 'active',
            renewal_date: billing?.expires_at || null,
            limits: {
                projects: {
                    used: projectCount || 0,
                    allowed: plan?.project_limit || 1
                },
                versions: {
                    used: usage?.ai_tokens_used || 0,
                    allowed: plan?.version_limit || 2
                },
                ai: {
                    used: 0,
                    allowed: plan?.ai_limit || -1 // -1 = unlimited
                },
                exports: plan?.allow_exports || false,
                team: plan?.allow_team || false
            }
        });
    } catch (err: any) {
        console.error('[Dashboard Billing] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/dashboard/team
 * Returns team members for the workspace
 */
router.get('/team', async (req, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Get workspace owner
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

        // Get profile info for members
        const memberIds = members?.map(m => m.user_id) || [];
        const allUserIds = [workspace.owner_id, ...memberIds];

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', allUserIds);

        // Build member list with profile data
        const memberList = (members || []).map(m => {
            const profile = profiles?.find(p => p.id === m.user_id);
            return {
                id: m.id,
                user_id: m.user_id,
                username: profile?.username || null,
                role: m.role,
                joined_at: m.created_at,
                is_owner: m.user_id === workspace.owner_id
            };
        });

        // Add owner if not in members
        const ownerInMembers = memberList.find(m => m.user_id === workspace.owner_id);
        if (!ownerInMembers) {
            const ownerProfile = profiles?.find(p => p.id === workspace.owner_id);
            memberList.unshift({
                id: 'owner',
                user_id: workspace.owner_id,
                username: ownerProfile?.username || null,
                role: 'admin',
                joined_at: null,
                is_owner: true
            });
        }

        res.json({
            workspace_type: workspace.type,
            members: memberList
        });
    } catch (err: any) {
        console.error('[Dashboard Team] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/dashboard/team/invite
 * Generate invite link for workspace
 */
router.post('/team/invite', async (req, res) => {
    try {
        const { workspaceId, role, userId } = req.body;

        if (!workspaceId || !role) {
            return res.status(400).json({ error: 'workspaceId and role are required' });
        }

        // Generate token
        const crypto = await import('crypto');
        const token = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { data, error } = await supabase
            .from('workspace_invites')
            .insert({
                workspace_id: workspaceId,
                token,
                role,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        // Log activity
        await supabase.from('activity_logs').insert({
            workspace_id: workspaceId,
            user_id: userId,
            action: 'invite_created',
            entity_type: 'team',
            metadata: { role, expires_at: expiresAt.toISOString() }
        });

        const inviteUrl = `${process.env.VITE_APP_URL || 'http://localhost:5173'}/join?token=${token}`;

        res.json({
            success: true,
            url: inviteUrl,
            token,
            expires_at: expiresAt.toISOString()
        });
    } catch (err: any) {
        console.error('[Dashboard Team Invite] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/dashboard/team/role
 * Change member role
 */
router.patch('/team/role', async (req, res) => {
    try {
        const { memberId, newRole, workspaceId, userId } = req.body;

        if (!memberId || !newRole) {
            return res.status(400).json({ error: 'memberId and newRole are required' });
        }

        const { error } = await supabase
            .from('workspace_members')
            .update({ role: newRole })
            .eq('id', memberId);

        if (error) throw error;

        // Log activity
        if (workspaceId && userId) {
            await supabase.from('activity_logs').insert({
                workspace_id: workspaceId,
                user_id: userId,
                action: 'member_role_changed',
                entity_type: 'team',
                metadata: { member_id: memberId, new_role: newRole }
            });
        }

        res.json({ success: true });
    } catch (err: any) {
        console.error('[Dashboard Team Role] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/dashboard/team/remove
 * Remove member from workspace
 */
router.delete('/team/remove', async (req, res) => {
    try {
        const { memberId, workspaceId, userId } = req.body;

        if (!memberId) {
            return res.status(400).json({ error: 'memberId is required' });
        }

        const { error } = await supabase
            .from('workspace_members')
            .delete()
            .eq('id', memberId);

        if (error) throw error;

        // Log activity
        if (workspaceId && userId) {
            await supabase.from('activity_logs').insert({
                workspace_id: workspaceId,
                user_id: userId,
                action: 'member_removed',
                entity_type: 'team',
                metadata: { removed_member_id: memberId }
            });
        }

        res.json({ success: true });
    } catch (err: any) {
        console.error('[Dashboard Team Remove] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/dashboard/activity
 * Returns recent activity log for workspace
 */
router.get('/activity', async (req, res) => {
    try {
        const { workspaceId, limit = 20 } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Get activity logs
        const { data: activities } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('workspace_id', workspaceId)
            .order('created_at', { ascending: false })
            .limit(Number(limit));

        // Also get recent schema versions as activity
        const { data: projects } = await supabase
            .from('projects')
            .select('id, name')
            .eq('workspace_id', workspaceId);

        const projectIds = projects?.map(p => p.id) || [];
        const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);

        let recentVersions: any[] = [];
        if (projectIds.length > 0) {
            const { data: versions } = await supabase
                .from('schema_versions')
                .select('id, project_id, version, created_at')
                .in('project_id', projectIds)
                .order('created_at', { ascending: false })
                .limit(10);

            recentVersions = (versions || []).map(v => ({
                id: `sv-${v.id}`,
                action: 'schema_version_created',
                entity_type: 'schema',
                entity_id: v.project_id,
                metadata: {
                    version: v.version,
                    project_name: projectMap.get(v.project_id) || 'Unknown Project'
                },
                created_at: v.created_at
            }));
        }

        // Merge and sort activities
        const allActivities = [...(activities || []), ...recentVersions]
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, Number(limit));

        res.json({ activities: allActivities });
    } catch (err: any) {
        console.error('[Dashboard Activity] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ============================
// PROFILE ENDPOINTS (Edit Profile Feature)
// ============================

/**
 * GET /api/dashboard/profile
 * Fetch current user profile for editing
 */
router.get('/profile', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        // Get user profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('username, role_title, created_at')
            .eq('id', userId)
            .maybeSingle();

        // Get user auth data for email (from auth.users via service role)
        // Note: We'll pass email from the frontend since we can't easily query auth.users

        // Get workspace (owned or member)
        let workspace = null;
        let role = 'admin';

        const { data: ownedWorkspace } = await supabase
            .from('workspaces')
            .select('id, name, type, created_at')
            .eq('owner_id', userId)
            .maybeSingle();

        if (ownedWorkspace) {
            workspace = ownedWorkspace;
            role = 'admin';
        } else {
            const { data: membership } = await supabase
                .from('workspace_members')
                .select('workspace_id, role')
                .eq('user_id', userId)
                .maybeSingle();

            if (membership) {
                const { data: memberWorkspace } = await supabase
                    .from('workspaces')
                    .select('id, name, type, created_at')
                    .eq('id', membership.workspace_id)
                    .single();

                workspace = memberWorkspace;
                role = membership.role;
            }
        }

        res.json({
            username: profile?.username || null,
            display_name: profile?.role_title || null, // Using role_title as display_name
            workspace: workspace ? {
                id: workspace.id,
                name: workspace.name,
                type: workspace.type
            } : null,
            role
        });
    } catch (err: any) {
        console.error('[Profile Fetch] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/dashboard/profile
 * Update user profile with validation and permission checks
 */
router.patch('/profile', async (req, res) => {
    try {
        const { userId, username, display_name, workspace_name, workspaceId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const errors: Record<string, string> = {};
        const updatedFields: string[] = [];

        // ============================
        // VALIDATION
        // ============================

        // Username validation
        if (username !== undefined) {
            const trimmedUsername = username.trim();

            if (trimmedUsername.length < 3) {
                errors.username = 'Username must be at least 3 characters';
            } else if (trimmedUsername.length > 30) {
                errors.username = 'Username must be at most 30 characters';
            } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
                errors.username = 'Username can only contain letters, numbers, and underscores';
            } else {
                // Check if username is already taken
                const { data: existing } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', trimmedUsername)
                    .neq('id', userId)
                    .maybeSingle();

                if (existing) {
                    errors.username = 'This username is already taken';
                }
            }
        }

        // Workspace name validation (only if provided)
        if (workspace_name !== undefined && workspace_name !== null) {
            const trimmedWsName = workspace_name.trim();

            if (trimmedWsName.length < 2) {
                errors.workspace_name = 'Workspace name must be at least 2 characters';
            } else if (trimmedWsName.length > 50) {
                errors.workspace_name = 'Workspace name must be at most 50 characters';
            }
        }

        // Return validation errors if any
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ error: 'Validation failed', errors });
        }

        // ============================
        // PERMISSION CHECK
        // ============================

        if (workspace_name !== undefined && workspaceId) {
            // Check if user is admin/owner
            const { data: workspace } = await supabase
                .from('workspaces')
                .select('owner_id')
                .eq('id', workspaceId)
                .single();

            const isOwner = workspace?.owner_id === userId;

            if (!isOwner) {
                // Check if member with admin role
                const { data: membership } = await supabase
                    .from('workspace_members')
                    .select('role')
                    .eq('workspace_id', workspaceId)
                    .eq('user_id', userId)
                    .maybeSingle();

                if (membership?.role !== 'admin') {
                    return res.status(403).json({
                        error: "You don't have permission to edit workspace details."
                    });
                }
            }
        }

        // ============================
        // UPDATE OPERATIONS
        // ============================

        // Update username and/or display_name
        if (username !== undefined || display_name !== undefined) {
            const profileUpdate: Record<string, any> = {
                updated_at: new Date().toISOString()
            };

            if (username !== undefined) {
                profileUpdate.username = username.trim();
                updatedFields.push('username');
            }

            if (display_name !== undefined) {
                profileUpdate.role_title = display_name.trim(); // Using role_title as display_name
                updatedFields.push('display_name');
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    ...profileUpdate
                });

            if (profileError) throw profileError;
        }

        // Update workspace name
        if (workspace_name !== undefined && workspaceId) {
            const { error: wsError } = await supabase
                .from('workspaces')
                .update({
                    name: workspace_name.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', workspaceId);

            if (wsError) throw wsError;
            updatedFields.push('workspace_name');
        }

        // ============================
        // ACTIVITY LOG
        // ============================

        if (updatedFields.length > 0 && workspaceId) {
            try {
                await supabase.from('activity_logs').insert({
                    workspace_id: workspaceId,
                    user_id: userId,
                    action: 'profile_updated',
                    entity_type: 'profile',
                    metadata: {
                        fields: updatedFields,
                        timestamp: new Date().toISOString()
                    }
                });
            } catch (logErr) {
                // Don't fail the request if activity logging fails
                console.error('[Profile Update] Activity log failed:', logErr);
            }
        }

        res.json({
            success: true,
            message: 'Profile updated successfully.',
            updated_fields: updatedFields
        });
    } catch (err: any) {
        console.error('[Profile Update] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
