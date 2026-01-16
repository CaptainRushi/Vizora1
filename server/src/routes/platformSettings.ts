import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl.trim(), supabaseKey.trim());

// Types
interface UserSettings {
    color_mode: 'light' | 'dark' | 'system';
    diagram_theme: 'light' | 'dark' | 'auto';
}

interface InteractionSettings {
    reduced_motion: boolean;
    auto_focus_schema: boolean;
}

interface IntelligenceSettings {
    explanation_mode: 'developer' | 'pm' | 'onboarding';
    evidence_strict: boolean;
    auto_schema_review: boolean;
    auto_onboarding: boolean;
}

interface NotificationSettings {
    email_schema_changes: boolean;
    email_team_activity: boolean;
    email_ai_summary: boolean;
    inapp_schema: boolean;
    inapp_team: boolean;
}

interface PrivacySettings {
    retain_all_versions: boolean;
}

// ==================== USER SETTINGS (Appearance) ====================

// GET user appearance settings
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        // Return defaults if no settings exist
        const settings: UserSettings = data || {
            color_mode: 'light',
            diagram_theme: 'auto'
        };

        res.json(settings);
    } catch (err: any) {
        console.error('Get user settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE user appearance settings
router.patch('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { color_mode, diagram_theme } = req.body;

        if (!userId) return res.status(400).json({ error: 'userId required' });

        const updates: Partial<UserSettings> = {};
        if (color_mode) updates.color_mode = color_mode;
        if (diagram_theme) updates.diagram_theme = diagram_theme;

        const { error } = await supabase
            .from('user_settings')
            .upsert({
                user_id: userId,
                ...updates,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;

        res.json({ success: true, ...updates });
    } catch (err: any) {
        console.error('Update user settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== INTERACTION SETTINGS ====================

// GET interaction settings
router.get('/interaction/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const { data, error } = await supabase
            .from('interaction_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        const settings: InteractionSettings = data || {
            reduced_motion: false,
            auto_focus_schema: true
        };

        res.json(settings);
    } catch (err: any) {
        console.error('Get interaction settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE interaction settings
router.patch('/interaction/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { reduced_motion, auto_focus_schema } = req.body;

        if (!userId) return res.status(400).json({ error: 'userId required' });

        const updates: Partial<InteractionSettings> = {};
        if (typeof reduced_motion === 'boolean') updates.reduced_motion = reduced_motion;
        if (typeof auto_focus_schema === 'boolean') updates.auto_focus_schema = auto_focus_schema;

        const { error } = await supabase
            .from('interaction_settings')
            .upsert({
                user_id: userId,
                ...updates,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;

        res.json({ success: true, ...updates });
    } catch (err: any) {
        console.error('Update interaction settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== INTELLIGENCE SETTINGS (Workspace) ====================

// GET intelligence settings
router.get('/intelligence/:workspaceId', async (req, res) => {
    try {
        const { workspaceId } = req.params;
        if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

        const { data, error } = await supabase
            .from('intelligence_settings')
            .select('*')
            .eq('workspace_id', workspaceId)
            .maybeSingle();

        if (error) throw error;

        const settings: IntelligenceSettings = data || {
            explanation_mode: 'developer',
            evidence_strict: true,
            auto_schema_review: true,
            auto_onboarding: true
        };

        res.json(settings);
    } catch (err: any) {
        console.error('Get intelligence settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE intelligence settings
router.patch('/intelligence/:workspaceId', async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { explanation_mode, evidence_strict, auto_schema_review, auto_onboarding } = req.body;

        if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

        const updates: Partial<IntelligenceSettings> = {};
        if (explanation_mode) updates.explanation_mode = explanation_mode;
        if (typeof evidence_strict === 'boolean') updates.evidence_strict = evidence_strict;
        if (typeof auto_schema_review === 'boolean') updates.auto_schema_review = auto_schema_review;
        if (typeof auto_onboarding === 'boolean') updates.auto_onboarding = auto_onboarding;

        const { error } = await supabase
            .from('intelligence_settings')
            .upsert({
                workspace_id: workspaceId,
                ...updates,
                updated_at: new Date().toISOString()
            }, { onConflict: 'workspace_id' });

        if (error) throw error;

        res.json({ success: true, ...updates });
    } catch (err: any) {
        console.error('Update intelligence settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== NOTIFICATION SETTINGS ====================

// GET notification settings
router.get('/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const { data, error } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;

        const settings: NotificationSettings = data || {
            email_schema_changes: true,
            email_team_activity: false,
            email_ai_summary: false,
            inapp_schema: true,
            inapp_team: true
        };

        res.json(settings);
    } catch (err: any) {
        console.error('Get notification settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE notification settings
router.patch('/notifications/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updates: Partial<NotificationSettings> = {};

        const fields = ['email_schema_changes', 'email_team_activity', 'email_ai_summary', 'inapp_schema', 'inapp_team'];
        fields.forEach(field => {
            if (typeof req.body[field] === 'boolean') {
                (updates as any)[field] = req.body[field];
            }
        });

        if (!userId) return res.status(400).json({ error: 'userId required' });

        const { error } = await supabase
            .from('notification_settings')
            .upsert({
                user_id: userId,
                ...updates,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;

        res.json({ success: true, ...updates });
    } catch (err: any) {
        console.error('Update notification settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== PRIVACY SETTINGS (Workspace) ====================

// GET privacy settings
router.get('/privacy/:workspaceId', async (req, res) => {
    try {
        const { workspaceId } = req.params;
        if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

        const { data, error } = await supabase
            .from('privacy_settings')
            .select('*')
            .eq('workspace_id', workspaceId)
            .maybeSingle();

        if (error) throw error;

        const settings: PrivacySettings = data || {
            retain_all_versions: true
        };

        res.json(settings);
    } catch (err: any) {
        console.error('Get privacy settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE privacy settings
router.patch('/privacy/:workspaceId', async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const { retain_all_versions } = req.body;

        if (!workspaceId) return res.status(400).json({ error: 'workspaceId required' });

        const updates: Partial<PrivacySettings> = {};
        if (typeof retain_all_versions === 'boolean') updates.retain_all_versions = retain_all_versions;

        const { error } = await supabase
            .from('privacy_settings')
            .upsert({
                workspace_id: workspaceId,
                ...updates,
                updated_at: new Date().toISOString()
            }, { onConflict: 'workspace_id' });

        if (error) throw error;

        res.json({ success: true, ...updates });
    } catch (err: any) {
        console.error('Update privacy settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== ALL SETTINGS (Combined fetch) ====================

router.get('/all', async (req, res) => {
    try {
        const { userId, workspaceId } = req.query;

        if (!userId) return res.status(400).json({ error: 'userId required' });

        // Fetch all user-level settings
        const [userRes, interactionRes, notificationRes] = await Promise.all([
            supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
            supabase.from('interaction_settings').select('*').eq('user_id', userId).maybeSingle(),
            supabase.from('notification_settings').select('*').eq('user_id', userId).maybeSingle()
        ]);

        // Fetch workspace-level settings if workspaceId provided
        let intelligence = null;
        let privacy = null;

        if (workspaceId) {
            const [intRes, privRes] = await Promise.all([
                supabase.from('intelligence_settings').select('*').eq('workspace_id', workspaceId).maybeSingle(),
                supabase.from('privacy_settings').select('*').eq('workspace_id', workspaceId).maybeSingle()
            ]);
            intelligence = intRes.data;
            privacy = privRes.data;
        }

        res.json({
            appearance: userRes.data || { color_mode: 'light', diagram_theme: 'auto' },
            interaction: interactionRes.data || { reduced_motion: false, auto_focus_schema: true },
            notifications: notificationRes.data || {
                email_schema_changes: true,
                email_team_activity: false,
                email_ai_summary: false,
                inapp_schema: true,
                inapp_team: true
            },
            intelligence: intelligence || {
                explanation_mode: 'developer',
                evidence_strict: true,
                auto_schema_review: true,
                auto_onboarding: true
            },
            privacy: privacy || { retain_all_versions: true }
        });
    } catch (err: any) {
        console.error('Get all settings error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
