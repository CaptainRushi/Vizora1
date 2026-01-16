import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());

// ==================== PROJECT SETTINGS (Combined fetch) ====================

router.get('/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        if (!projectId) return res.status(400).json({ error: 'projectId required' });

        const [projectRes, schemaRes, intelligenceRes, membersRes] = await Promise.all([
            supabase.from('projects').select('*').eq('id', projectId).single(),
            supabase.from('project_schema_settings').select('*').eq('project_id', projectId).maybeSingle(),
            supabase.from('project_intelligence_settings').select('*').eq('project_id', projectId).maybeSingle(),
            supabase.from('project_members').select('*').eq('project_id', projectId)
        ]);

        if (projectRes.error) throw projectRes.error;

        res.json({
            general: {
                name: projectRes.data.name,
                description: projectRes.data.description,
                status: projectRes.data.status
            },
            schema: schemaRes.data || {
                input_mode: 'mixed',
                auto_version: true,
                version_naming: 'auto'
            },
            intelligence: intelligenceRes.data || {
                explanation_depth: 'concise',
                evidence_strict: true,
                auto_review: true,
                auto_onboarding: true
            },
            members: membersRes.data || []
        });
    } catch (err: any) {
        console.error('Get project settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== GENERAL SETTINGS ====================

router.patch('/:projectId/general', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description, status } = req.body;

        const updates: any = {};
        if (name) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (status) updates.status = status;

        const { error } = await supabase
            .from('projects')
            .update(updates)
            .eq('id', projectId);

        if (error) throw error;
        res.json({ success: true, ...updates });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== SCHEMA BEHAVIOR ====================

router.patch('/:projectId/schema', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { input_mode, auto_version, version_naming } = req.body;

        const updates: any = { project_id: projectId };
        if (input_mode) updates.input_mode = input_mode;
        if (typeof auto_version === 'boolean') updates.auto_version = auto_version;
        if (version_naming) updates.version_naming = version_naming;

        const { error } = await supabase
            .from('project_schema_settings')
            .upsert(updates, { onConflict: 'project_id' });

        if (error) throw error;
        res.json({ success: true, ...updates });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== INTELLIGENCE ====================

router.patch('/:projectId/intelligence', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { explanation_depth, evidence_strict, auto_review, auto_onboarding } = req.body;

        const updates: any = { project_id: projectId };
        if (explanation_depth) updates.explanation_depth = explanation_depth;
        if (typeof evidence_strict === 'boolean') updates.evidence_strict = evidence_strict;
        if (typeof auto_review === 'boolean') updates.auto_review = auto_review;
        if (typeof auto_onboarding === 'boolean') updates.auto_onboarding = auto_onboarding;

        const { error } = await supabase
            .from('project_intelligence_settings')
            .upsert(updates, { onConflict: 'project_id' });

        if (error) throw error;
        res.json({ success: true, ...updates });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== MEMBERS ====================

router.post('/:projectId/members', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { user_id, role } = req.body;

        const { error } = await supabase
            .from('project_members')
            .upsert({ project_id: projectId, user_id, role }, { onConflict: 'project_id,user_id' });

        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:projectId/members/:userId', async (req, res) => {
    try {
        const { projectId, userId } = req.params;

        const { error } = await supabase
            .from('project_members')
            .delete()
            .eq('project_id', projectId)
            .eq('user_id', userId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== DELETE PROJECT ====================

router.delete('/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
