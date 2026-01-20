
import express from 'express';
import { createClient } from '@supabase/supabase-js';


const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());

/**
 * GET /api/me
 * Universal Identity Endpoint
 * Returns the Root Identity (Universal ID) context
 */
router.get('/me', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        // In a real app, we would verify the JWT here. 

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // 1. Get Auth Data (Email is needed for init)
        const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(userId);

        if (authError || !authUser) {
            return res.status(404).json({ error: 'User auth record not found' });
        }

        const email = authUser.email;
        if (!email) {
            return res.status(400).json({ error: 'User must have an email address' });
        }

        // 2. Ensure Universal ID Exists (RPC Call)
        const { data: universalId, error: rpcError } = await supabase
            .rpc('ensure_universal_user', {
                _auth_id: userId,
                _email: email
            });

        if (rpcError) {
            console.error('[API ME] Universal ID RPC failed:', rpcError);
            return res.status(500).json({ error: 'Identity generation failed', details: rpcError.message });
        }

        if (!universalId) {
            return res.status(500).json({ error: 'Failed to retrieve Universal ID' });
        }

        // 3. Fetch Full Context (Universal User + Workspace)
        const { data: userContext, error: contextError } = await supabase
            .from('universal_users')
            .select(`
                universal_id,
                username,
                display_name,
                email,
                universal_workspaces!inner ( name )
            `)
            .eq('universal_id', universalId)
            .single();

        if (contextError) {
            console.error('[API ME] Context fetch failed:', contextError);
            return res.json({
                universal_id: universalId,
                username: null,
                display_name: null,
                email: email,
                workspace_name: "Personal Workspace",
                has_completed_profile: false,
                role: 'admin',
                workspace_id: universalId
            });
        }

        const workspaceName = Array.isArray(userContext.universal_workspaces)
            ? userContext.universal_workspaces[0]?.name
            : (userContext.universal_workspaces as any)?.name;

        const hasProfile = !!(userContext.username && userContext.display_name);

        res.json({
            universal_id: userContext.universal_id,
            username: userContext.username,
            display_name: userContext.display_name,
            email: userContext.email,
            workspace_name: workspaceName || "Personal Workspace",
            has_completed_profile: hasProfile,
            // Backward Compatibility
            role: 'admin',
            workspace_id: userContext.universal_id
        });

    } catch (err: any) {
        console.error('[API ME] Error:', err);
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
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({ error: 'Username must be between 3 and 30 characters.' });
        }

        const usernameRegex = /^[a-z0-9_]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ error: 'Username can only contain lowercase letters, numbers, and underscores.' });
        }

        const reserved = ['admin', 'support', 'system', 'root', 'vizora', 'official'];
        if (reserved.includes(username.toLowerCase())) {
            return res.status(400).json({ error: 'This username is reserved and cannot be used.' });
        }

        // 2. CHECK UNIQUENESS
        const { data: existingUser } = await supabase
            .from('universal_users')
            .select('universal_id')
            .eq('username', username)
            .neq('auth_user_id', userId)
            .maybeSingle();

        if (existingUser) {
            return res.status(400).json({ error: 'This username is already taken.' });
        }

        // 3. UPDATE
        const { error: updateError } = await supabase
            .from('universal_users')
            .update({
                username: username,
                updated_at: new Date().toISOString()
            })
            .eq('auth_user_id', userId);

        if (updateError) throw updateError;

        // 4. SYNC WITH WORKSPACE NAME
        const { data: uUser } = await supabase
            .from('universal_users')
            .select('universal_id')
            .eq('auth_user_id', userId)
            .single();

        if (uUser) {
            await supabase
                .from('universal_workspaces')
                .update({ name: `@${username}`, updated_at: new Date().toISOString() })
                .eq('universal_id', uUser.universal_id);
        }

        res.json({ success: true, username });

    } catch (err: any) {
        console.error('[API UPDATE USERNAME] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * PATCH /api/profile
 * Authoritative endpoint for identity edits
 */
router.patch('/profile', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const { username, display_name, workspace_name } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // 1. Fetch current universal user
        const { data: user, error: userFetchError } = await supabase
            .from('universal_users')
            .select('*, universal_workspaces!inner(*)')
            .eq('auth_user_id', userId)
            .maybeSingle();

        if (userFetchError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const workspace = Array.isArray(user.universal_workspaces)
            ? user.universal_workspaces[0]
            : user.universal_workspaces;

        const updates: any = {};
        const workspaceUpdates: any = {};

        // 2. Validate Username
        if (username && username !== user.username) {
            if (username.length < 3 || username.length > 30) {
                return res.status(400).json({ error: 'Username must be between 3 and 30 characters.' });
            }
            const usernameRegex = /^[a-z0-9_]+$/;
            if (!usernameRegex.test(username)) {
                return res.status(400).json({ error: 'Username format is invalid.' });
            }

            const { data: existingUser } = await supabase
                .from('universal_users')
                .select('universal_id')
                .eq('username', username)
                .neq('universal_id', user.universal_id)
                .maybeSingle();

            if (existingUser) {
                return res.status(400).json({ error: 'This username is already in use.' });
            }

            updates.username = username;
        }

        // 3. Update Display Name
        if (display_name !== undefined && display_name !== user.display_name) {
            if (display_name && display_name.length > 50) {
                return res.status(400).json({ error: 'Display name cannot exceed 50 characters.' });
            }
            updates.display_name = display_name;
        }

        // 4. Update Workspace Name
        if (workspace_name && workspace && workspace_name !== workspace.name) {
            if (workspace_name.length < 2 || workspace_name.length > 50) {
                return res.status(400).json({ error: 'Workspace name must be between 2 and 50 characters.' });
            }
            workspaceUpdates.name = workspace_name;
        }

        // 5. Execute Updates
        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
                .from('universal_users')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('universal_id', user.universal_id);
            if (updateError) throw updateError;
        }

        if (Object.keys(workspaceUpdates).length > 0 && workspace) {
            const { error: wsUpdateError } = await supabase
                .from('universal_workspaces')
                .update({ ...workspaceUpdates, updated_at: new Date().toISOString() })
                .eq('universal_id', user.universal_id);
            if (wsUpdateError) throw wsUpdateError;
        }

        res.json({
            success: true,
            user: {
                username: updates.username || user.username,
                display_name: updates.display_name || user.display_name
            },
            workspace: {
                name: workspaceUpdates.name || (workspace ? workspace.name : null)
            }
        });

    } catch (err: any) {
        console.error('[API PROFILE UPDATE] Error:', err);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

export default router;
