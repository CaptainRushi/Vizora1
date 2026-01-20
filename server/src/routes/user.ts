
import express from 'express';
import { createClient } from '@supabase/supabase-js';


const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());

/**
 * GET /api/me
 * Canonical identity endpoint
 * Returns authoritative user data from the 'users' table
 */
router.get('/me', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // 1. Fetch user from authoritative 'users' table
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.warn('[API ME] Initial fetch error:', error.message);
            // If the error is migration-related (missing table/column), we proceed to sync from Auth
            if (
                error.message.includes('display_name') ||
                error.message.includes('users') ||
                error.message.includes('column') ||
                error.message.includes('relation')
            ) {
                console.log('[API ME] Migration in progress, checking profiles as fallback...');
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, username, role_title, default_workspace_id, created_at')
                    .eq('id', userId)
                    .maybeSingle();

                if (profile) {
                    user = {
                        id: profile.id,
                        username: profile.username,
                        display_name: (profile as any).display_name || (profile as any).role_title,
                        email: (profile as any).email || null,
                        workspace_id: (profile as any).workspace_id || (profile as any).default_workspace_id,
                        role: (profile as any).role || null,
                        created_at: profile.created_at
                    };
                    error = null;
                } else {
                    console.log('[API ME] No legacy profile found either. Will attempt creation from Auth.');
                    error = null; // Clear error to allow sync from Auth
                }
            } else {
                throw error; // Other database errors should still be reported
            }
        }

        // If user doesn't exist in our table yet, sync it from auth.users (legacy safety)
        if (!user) {
            const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(userId);
            if (authError || !authUser) {
                return res.status(404).json({ error: 'User not found in Auth system' });
            }

            // Create user entry structure
            const newUser = {
                id: authUser.id,
                email: authUser.email,
                username: authUser.user_metadata?.username || authUser.email?.split('@')[0],
                display_name: authUser.user_metadata?.full_name || null,
                created_at: authUser.created_at
            };

            // Only attempt insert if we think the table might exist now (or try and catch)
            try {
                const { data: createdUser, error: insertError } = await supabase
                    .from('users')
                    .insert(newUser)
                    .select()
                    .single();

                if (!insertError) {
                    return res.json(createdUser);
                }
                console.warn('[API ME] Insert into users failed during sync:', insertError.message);
            } catch (e) {
                console.warn('[API ME] Insert into users crashed during sync');
            }

            // If insert fails (likely due to migration), return the virtual identity anyway
            return res.json({
                ...newUser,
                workspace_id: null,
                role: 'member'
            });
        }

        // If user exists but has no workspace, create one for them
        if (!user.workspace_id) {
            console.log('[API ME] User exists but has no workspace, creating one...');
            try {
                // Create a personal workspace
                const { data: newWorkspace, error: wsError } = await supabase
                    .from('workspaces')
                    .insert({
                        name: user.username ? `${user.username}'s Workspace` : 'Personal Workspace',
                        type: 'personal',
                        owner_id: user.id
                    })
                    .select()
                    .single();

                if (wsError) {
                    console.error('[API ME] Failed to create workspace:', wsError);
                } else if (newWorkspace) {
                    // Update user with the new workspace_id
                    const { error: updateError } = await supabase
                        .from('users')
                        .update({ workspace_id: newWorkspace.id, role: 'admin' })
                        .eq('id', user.id);

                    if (!updateError) {
                        user.workspace_id = newWorkspace.id;
                        user.role = 'admin';
                        console.log('[API ME] Created workspace:', newWorkspace.id);

                        // Create workspace_billing entry
                        await supabase
                            .from('workspace_billing')
                            .insert({ workspace_id: newWorkspace.id, plan_id: 'free', start_at: new Date().toISOString() })
                            .select();

                        // Create workspace_usage entry
                        await supabase
                            .from('workspace_usage')
                            .insert({ workspace_id: newWorkspace.id })
                            .select();

                        // Add user as admin member
                        await supabase
                            .from('workspace_members')
                            .insert({ workspace_id: newWorkspace.id, user_id: user.id, role: 'admin' })
                            .select();
                    }
                }
            } catch (wsErr) {
                console.error('[API ME] Workspace creation failed:', wsErr);
            }
        }

        // Return user data in the canonical format
        res.json({
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            email: user.email,
            workspace_id: user.workspace_id,
            role: user.role,
            created_at: user.created_at
        });

    } catch (err: any) {
        console.error('[API ME] Error:', err);
        if (err.message) {
            console.error('[API ME] Message:', err.message);
        }
        if (err.details) {
            console.error('[API ME] Details:', err.details);
        }
        res.status(500).json({ error: err.message, details: err.details });
    }
});

/**
 * PATCH /api/me/username
 * Updates the canonical username with strict validation
 */
router.patch('/me/username', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const { username } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // 1. STRICT VALIDATION RULES
        // Length: 3–30 characters
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ error: 'Username must be between 3 and 30 characters.' });
        }

        // Allowed: a-z, 0-9, _
        const usernameRegex = /^[a-z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ error: 'Username can only contain lowercase letters, numbers, and underscores.' });
        }

        // Reserved words
        const reserved = ['admin', 'support', 'system', 'root', 'vizora', 'official'];
        if (reserved.includes(username.toLowerCase())) {
            return res.status(400).json({ error: 'This username is reserved and cannot be used.' });
        }

        // 2. CHECK UNIQUENESS
        const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .neq('id', userId)
            .maybeSingle();

        if (existingUser) {
            return res.status(400).json({ error: 'This username is already taken.' });
        }

        // 3. GET OLD DATA FOR LOGGING
        const { data: oldUser } = await supabase
            .from('users')
            .select('username, workspace_id')
            .eq('id', userId)
            .single();

        // 4. UPDATE
        const { error: updateError } = await supabase
            .from('users')
            .update({
                username: username,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 4.5 SYNC WITH PERSONAL WORKSPACE NAME
        // Automatically rename personal/solo workspaces to match the new @username
        try {
            const { data: workspaces } = await supabase
                .from('workspaces')
                .select('id, name, type')
                .eq('owner_id', userId);

            if (workspaces) {
                for (const ws of workspaces) {
                    // Update if it's a personal workspace or uses a default naming pattern
                    if (ws.type === 'personal' || ws.name.includes("'s Workspace") || ws.name === 'My Workspace' || ws.name === 'Personal Workspace') {
                        await supabase
                            .from('workspaces')
                            .update({ name: `@${username}`, updated_at: new Date().toISOString() })
                            .eq('id', ws.id);
                    }
                }
            }
        } catch (syncErr) {
            console.warn('[API UPDATE USERNAME] Failed to sync workspace name:', syncErr);
            // Non-blocking error
        }



        res.json({ success: true, username });

    } catch (err: any) {
        console.error('[API UPDATE USERNAME] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/profile
 * Authoritative endpoint for identity edits (username, display_name, workspace_name)
 */
router.patch('/profile', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const { username, display_name, workspace_name } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // 1. Fetch current user and workspace context
        const { data: user, error: userFetchError } = await supabase
            .from('users')
            .select('*, workspaces:workspace_id(*)')
            .eq('id', userId)
            .maybeSingle();

        if (userFetchError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updates: any = {};
        const workspaceUpdates: any = {};
        const activityFields: string[] = [];

        // 2. Validate Username if changed
        if (username && username !== user.username) {
            // Strict Validation
            if (username.length < 3 || username.length > 30) {
                return res.status(400).json({ error: 'Username must be between 3 and 30 characters.' });
            }
            const usernameRegex = /^[a-z0-9_]+$/;
            if (!usernameRegex.test(username)) {
                return res.status(400).json({ error: 'Username format is invalid.' });
            }

            // Uniqueness check
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .neq('id', userId)
                .maybeSingle();

            if (existingUser) {
                return res.status(400).json({ error: 'This username is already in use.' });
            }

            updates.username = username;
            activityFields.push('username');
        }

        // 3. Update Display Name
        if (display_name !== undefined && display_name !== user.display_name) {
            if (display_name && display_name.length > 50) {
                return res.status(400).json({ error: 'Display name cannot exceed 50 characters.' });
            }
            updates.display_name = display_name;
            activityFields.push('display_name');
        }

        // 4. Update Workspace Name (Admin only)
        if (workspace_name && user.workspaces && workspace_name !== user.workspaces.name) {
            // Check if admin/owner
            const isAdmin = user.role === 'admin' || user.workspaces.owner_id === userId;
            if (!isAdmin) {
                return res.status(403).json({ error: 'You don’t have permission to change the workspace name.' });
            }

            if (workspace_name.length < 2 || workspace_name.length > 50) {
                return res.status(400).json({ error: 'Workspace name must be between 2 and 50 characters.' });
            }

            workspaceUpdates.name = workspace_name;
            activityFields.push('workspace_name');
        }

        // 5. Execute Updates
        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', userId);
            if (updateError) throw updateError;
        }

        if (Object.keys(workspaceUpdates).length > 0 && user.workspace_id) {
            const { error: wsUpdateError } = await supabase
                .from('workspaces')
                .update({ ...workspaceUpdates, updated_at: new Date().toISOString() })
                .eq('id', user.workspace_id);
            if (wsUpdateError) throw wsUpdateError;
        }



        // 7. Return consistent response
        res.json({
            success: true,
            user: {
                username: updates.username || user.username,
                display_name: updates.display_name || user.display_name
            },
            workspace: user.workspaces ? {
                name: workspaceUpdates.name || user.workspaces.name
            } : null
        });

    } catch (err: any) {
        console.error('[API PROFILE UPDATE] Error:', err);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

export default router;
