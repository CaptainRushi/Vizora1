import express from 'express';
import { createClient } from '@supabase/supabase-js';

import { isAdminOfWorkspace, validateRoleChange, validateMemberRemoval } from '../middleware/requireAdmin.js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/dashboard/usage
 * Returns usage statistics for the workspace (Universal ID)
 */
router.get('/usage', async (req, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // Get projects (Support both Universal ID column and legacy workspace_id)
        const { data: projects } = await supabase
            .from('projects')
            .select('id, created_at')
            .or(`universal_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);

        const projectIds = projects?.map(p => p.id) || [];

        let totalVersions = 0;
        let totalDiagrams = 0;
        let totalDocs = 0;
        let totalAiQuestions = 0;
        let lastActivity: string | null = null;

        if (projectIds.length > 0) {
            const [
                { count: versionCount },
                { count: docsCount },
                { count: aiCount },
                { data: latestVersion }
            ] = await Promise.all([
                // Schema versions count
                supabase.from('schema_versions').select('*', { count: 'exact', head: true }).in('project_id', projectIds),
                // Documentation count
                supabase.from('documentation_outputs').select('*', { count: 'exact', head: true }).in('project_id', projectIds),
                // AI questions count
                supabase.from('ask_schema_logs').select('*', { count: 'exact', head: true }).in('project_id', projectIds),
                // Get last activity
                supabase.from('schema_versions').select('created_at').in('project_id', projectIds).order('created_at', { ascending: false }).limit(1).maybeSingle()
            ]);

            totalVersions = versionCount || 0;
            totalDocs = docsCount || 0;
            totalAiQuestions = aiCount || 0;
            lastActivity = latestVersion?.created_at || null;
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
 * Returns billing and plan information (Universal ID aware)
 */
router.get('/billing', async (req, res) => {
    try {
        const { workspaceId } = req.query;

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // 1. Try fetching from 'billing_accounts' (New System)
        let { data: billing } = await supabase
            .from('billing_accounts')
            .select('plan_id, status, start_at, expires_at')
            .eq('universal_id', workspaceId) // Assumes workspaceId is universal_id
            .maybeSingle();

        // 2. Fallback to 'workspace_billing' (Legacy)
        if (!billing) {
            const { data: legacyBilling } = await supabase
                .from('workspace_billing')
                .select('plan_id, status, start_at, expires_at')
                .eq('workspace_id', workspaceId)
                .maybeSingle();
            billing = legacyBilling;
        }

        // Get plan details
        const planId = billing?.plan_id || 'free';
        const { data: plan } = await supabase
            .from('billing_plans')
            .select('*')
            .eq('id', planId)
            .single();

        // Get current usage (Count projects dynamically to be safe)
        const { count: projectCount } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .or(`universal_id.eq.${workspaceId},workspace_id.eq.${workspaceId}`);

        // AI Usage tracking (simplified for now, strictly speaking we'd need universal_usage table)
        const { data: usage } = await supabase
            .from('workspace_usage')
            .select('ai_tokens_used')
            .eq('workspace_id', workspaceId)
            .maybeSingle();

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
                    allowed: plan?.ai_limit || -1
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
 * Returns team members (Universal ID aware)
 */
router.get('/team', async (req, res) => {
    try {
        const { workspaceId } = req.query; // This is the Universal ID

        if (!workspaceId) {
            return res.status(400).json({ error: 'workspaceId is required' });
        }

        // 1. Fetch Owner from Universal Users (New Source of Truth)
        const { data: uUser } = await supabase
            .from('universal_users')
            .select('universal_id, username, display_name, auth_user_id')
            .eq('universal_id', workspaceId)
            .maybeSingle();

        // 2. Fetch Members (Legacy / Compatible)
        // If universal workspace functionality is limited to 1 user (personal), this might be empty.
        // We check workspace_members table anyway.
        const { data: members } = await supabase
            .from('workspace_members')
            .select('id, user_id, role, created_at')
            .eq('workspace_id', workspaceId);

        // Collect all User IDs to fetch profiles
        const memberUserIds = members?.map(m => m.user_id) || [];
        // If owner exists, add their auth_id if they aren't in members list
        // Note: uUser.auth_user_id might be needed if members list stores auth IDs (legacy).
        // New system might store universal_ids in members list? 
        // Assuming legacy table stores AUTH IDs.
        const allAuthIds = [...memberUserIds];
        if (uUser?.auth_user_id) allAuthIds.push(uUser.auth_user_id);

        // Fetch profiles from Universal Users (by Auth ID)
        // We want to display username/display_name for members too.
        // But members list has Auth IDs (usually). 
        // Universal Users map Auth ID -> Profile.

        let userProfiles: any[] = [];
        if (allAuthIds.length > 0) {
            const { data: profiles } = await supabase
                .from('universal_users')
                .select('auth_user_id, username, display_name')
                .in('auth_user_id', allAuthIds);
            userProfiles = profiles || [];
        }

        // Build List
        const memberList = (members || []).map(m => {
            const profile = userProfiles.find(p => p.auth_user_id === m.user_id);
            return {
                id: m.id,
                user_id: m.user_id,
                username: profile?.username || 'Unknown',
                display_name: profile?.display_name || 'Team Member',
                role: m.role as 'admin' | 'member',
                joined_at: m.created_at,
                is_owner: m.user_id === uUser?.auth_user_id
            };
        });

        // Add Owner if not present
        if (uUser) {
            const ownerInList = memberList.find(m => m.user_id === uUser.auth_user_id);
            if (!ownerInList) {
                memberList.unshift({
                    id: 'owner',
                    user_id: uUser.auth_user_id,
                    username: uUser.username,
                    display_name: uUser.display_name,
                    role: 'admin',
                    joined_at: null,
                    is_owner: true
                });
            }
        } else {
            // Fallback: Check legacy workspaces table if Universal User not found 
            // (e.g. if looking at old shared workspace by ID)
            const { data: legacyWorkspace } = await supabase
                .from('workspaces')
                .select('owner_id, type')
                .eq('id', workspaceId)
                .maybeSingle();

            if (legacyWorkspace) {
                // Fetch legacy user profiles
                const { data: legacyUsers } = await supabase
                    .from('users')
                    .select('id, username, display_name')
                    .in('id', [legacyWorkspace.owner_id, ...memberUserIds]);

                // ... (Logic to build list from legacy data - simplified here to avoid duplication complexity)
                const ownerProfile = legacyUsers?.find(u => u.id === legacyWorkspace.owner_id);
                if (!memberList.find(m => m.user_id === legacyWorkspace.owner_id)) {
                    memberList.unshift({
                        id: 'owner',
                        user_id: legacyWorkspace.owner_id,
                        username: ownerProfile?.username || 'Owner',
                        display_name: ownerProfile?.display_name || 'Legacy Owner',
                        role: 'admin',
                        joined_at: null,
                        is_owner: true
                    });
                }
            }
        }

        res.json({
            workspace_type: 'universal', // Simplified
            members: memberList
        });
    } catch (err: any) {
        console.error('[Dashboard Team] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/dashboard/team/invite
 * Generate invite link for workspace (ADMIN ONLY)
 */
router.post('/team/invite', async (req, res) => {
    try {
        const { workspaceId, role, userId } = req.body;

        if (!workspaceId || !role) {
            return res.status(400).json({ error: 'workspaceId and role are required' });
        }

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // ADMIN ENFORCEMENT: Only admins can invite members
        const { isAdmin } = await isAdminOfWorkspace(userId, workspaceId);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Admin access required',
                message: "You don't have permission to perform this action."
            });
        }

        // Validate role (only admin or member allowed)
        if (!['admin', 'member'].includes(role)) {
            return res.status(400).json({
                error: 'Invalid role',
                message: 'Role must be "admin" or "member".'
            });
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
                expires_at: expiresAt.toISOString(),
                created_by: userId
            })
            .select()
            .single();

        if (error) throw error;

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
 * Change member role (ADMIN ONLY)
 * 
 * Validation Rules:
 * - User cannot change their own role
 * - Workspace must always have at least one admin
 */
router.patch('/team/role', async (req, res) => {
    try {
        const { memberId, newRole, workspaceId, userId } = req.body;

        if (!memberId || !newRole) {
            return res.status(400).json({ error: 'memberId and newRole are required' });
        }

        if (!workspaceId || !userId) {
            return res.status(400).json({ error: 'workspaceId and userId are required' });
        }

        // Validate role (only admin or member allowed)
        if (!['admin', 'member'].includes(newRole)) {
            return res.status(400).json({
                error: 'Invalid role',
                message: 'Role must be "admin" or "member".'
            });
        }

        // ADMIN ENFORCEMENT: Only admins can change roles
        const { isAdmin } = await isAdminOfWorkspace(userId, workspaceId);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Admin access required',
                message: "You don't have permission to perform this action."
            });
        }

        // Get target member info for validation and logging
        const { data: targetMember } = await supabase
            .from('workspace_members')
            .select('user_id, role')
            .eq('id', memberId)
            .single();

        if (!targetMember) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const previousRole = targetMember.role;

        // VALIDATION: Cannot change own role
        if (targetMember.user_id === userId) {
            return res.status(400).json({
                error: 'Cannot change own role',
                message: 'You cannot change your own role.'
            });
        }

        // VALIDATION: Workspace must have at least one admin
        const validation = await validateRoleChange(workspaceId, userId, memberId, newRole as 'admin' | 'member');
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Role change not allowed',
                message: validation.error
            });
        }

        // Update role
        const { error } = await supabase
            .from('workspace_members')
            .update({ role: newRole })
            .eq('id', memberId);

        if (error) throw error;

        // Get target user's identity for activity log
        const { data: targetUser } = await supabase
            .from('users')
            .select('username')
            .eq('id', targetMember.user_id)
            .maybeSingle();



        res.json({
            success: true,
            message: `Role changed from ${previousRole} to ${newRole}.`
        });
    } catch (err: any) {
        console.error('[Dashboard Team Role] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * DELETE /api/dashboard/team/remove
 * Remove member from workspace (ADMIN ONLY)
 * 
 * Validation Rules:
 * - Cannot remove workspace owner
 * - Only admins can remove members
 */
router.delete('/team/remove', async (req, res) => {
    try {
        const { memberId, workspaceId, userId } = req.body;

        if (!memberId) {
            return res.status(400).json({ error: 'memberId is required' });
        }

        if (!workspaceId || !userId) {
            return res.status(400).json({ error: 'workspaceId and userId are required' });
        }

        // ADMIN ENFORCEMENT: Only admins can remove members
        const { isAdmin } = await isAdminOfWorkspace(userId, workspaceId);
        if (!isAdmin) {
            return res.status(403).json({
                error: 'Admin access required',
                message: "You don't have permission to perform this action."
            });
        }

        // Get target member info for validation and logging
        const { data: targetMember } = await supabase
            .from('workspace_members')
            .select('user_id, role')
            .eq('id', memberId)
            .single();

        if (!targetMember) {
            return res.status(404).json({ error: 'Member not found' });
        }

        // VALIDATION: Cannot remove workspace owner
        const validation = await validateMemberRemoval(workspaceId, memberId);
        if (!validation.valid) {
            return res.status(400).json({
                error: 'Removal not allowed',
                message: validation.error
            });
        }

        // Get target user's identity for activity log
        const { data: targetUser } = await supabase
            .from('users')
            .select('username')
            .eq('id', targetMember.user_id)
            .maybeSingle();

        // Remove member
        const { error } = await supabase
            .from('workspace_members')
            .delete()
            .eq('id', memberId);

        if (error) throw error;



        res.json({
            success: true,
            message: 'Member removed from workspace.'
        });
    } catch (err: any) {
        console.error('[Dashboard Team Remove] Error:', err);
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

export default router;
