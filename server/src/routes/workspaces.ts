import express from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// GET /workspaces/current?userId=...
router.get('/current', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "User ID required" });

        let { data: workspace, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('owner_id', userId)
            .maybeSingle();

        if (!workspace) {
            const { data: membership } = await supabase
                .from('workspace_members')
                .select('workspace_id, role')
                .eq('user_id', userId)
                .maybeSingle();

            if (membership) {
                const { data: w } = await supabase.from('workspaces').select('*').eq('id', membership.workspace_id).single();
                if (w) {
                    workspace = { ...w, role: membership.role };
                }
            }
        } else {
            workspace.role = 'admin';
        }

        if (!workspace) {
            console.log(`Creating default workspace for user ${userId}`);
            const { data: newWorkspace, error: cErr } = await supabase
                .from('workspaces')
                .insert({
                    name: "Personal Workspace",
                    type: "personal",
                    owner_id: userId
                })
                .select()
                .single();

            if (cErr) throw cErr;
            workspace = { ...newWorkspace, role: 'admin' };
        }

        const { data: billing } = await supabase
            .from('workspace_billing')
            .select('plan_id, status, current_period_end')
            .eq('workspace_id', workspace.id)
            .maybeSingle();

        workspace.billing = billing || { plan_id: 'free', status: 'active' };

        res.json(workspace);
    } catch (err: any) {
        console.error("Workspace Fetch Error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/members', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: workspace } = await supabase.from('workspaces').select('owner_id').eq('id', id).single();
        const { data: members } = await supabase
            .from('workspace_members')
            .select('user_id, role, joined_at, id');
        res.json({ owner_id: workspace?.owner_id, members: members || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/:id/invite', async (req, res) => {
    try {
        const { id } = req.params;
        const { role, userId } = req.body;

        const token = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        const { data, error } = await supabase.from('workspace_invites').insert({
            workspace_id: id,
            token,
            role,
            expires_at: expiresAt.toISOString()
        }).select().single();

        if (error) throw error;
        const inviteUrl = `${process.env.VITE_APP_URL || 'http://localhost:5173'}/join?token=${token}`;
        res.json({ success: true, url: inviteUrl, ...data });
    } catch (err: any) {
        console.error("Invite Gen Error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.post('/join', async (req, res) => {
    try {
        const { token, userId } = req.body;
        if (!token || !userId) return res.status(400).json({ error: "Token and User ID required" });

        const { data: invite, error: iErr } = await supabase
            .from('workspace_invites')
            .select('*')
            .eq('token', token)
            .single();

        if (iErr || !invite) return res.status(404).json({ error: "Invalid invitation" });
        if (invite.revoked) return res.status(410).json({ error: "Invitation revoked" });
        if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: "Invitation expired" });
        if (invite.used_count >= invite.max_uses) return res.status(410).json({ error: "Invitation used" });

        const { error: mErr } = await supabase.from('workspace_members').insert({
            workspace_id: invite.workspace_id,
            user_id: userId,
            role: invite.role
        });

        if (mErr) {
            if (mErr.code === '23505') {
                return res.json({ success: true, message: "Already a member" });
            }
            throw mErr;
        }

        await supabase.from('workspace_invites').update({
            used_count: invite.used_count + 1
        }).eq('id', invite.id);

        res.json({ success: true, workspaceId: invite.workspace_id });
    } catch (err: any) {
        console.error("Join Error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id/invites', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('workspace_invites')
            .select('*')
            .eq('workspace_id', req.params.id)
            .eq('revoked', false)
            .gt('expires_at', new Date().toISOString());

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/invite/revoke', async (req, res) => {
    try {
        const { inviteId } = req.body;
        const { error } = await supabase
            .from('workspace_invites')
            .update({ revoked: true })
            .eq('id', inviteId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
