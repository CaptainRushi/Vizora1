import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { initializeCollaboration } from './src/collaboration/index.js';

// Routes
import schemaReviewRoutes from './src/routes/schemaReview.js';
import onboardingGuideRoutes from './src/routes/onboardingGuide.js';
import askSchemaRoutes from './src/routes/askSchema.js';
import dashboardRoutes from './src/routes/dashboard.js';
import teamRoutes from './src/routes/team.js';
import workspaceRoutes from './src/routes/workspace.js'; // Existing singular
import workspacesRoutes from './src/routes/workspaces.js'; // New plural
import platformSettingsRoutes from './src/routes/platformSettings.js';
import projectSettingsRoutes from './src/routes/projectSettings.js';
import userRoutes from './src/routes/user.js';
import projectRoutes from './src/routes/projects.js';

import {
    getWorkspacePlan,
    checkProjectLimit,
    checkVersionLimit,
    checkFeatureAccess,
    getAiAccessLevel,
    upgradeWorkspace
} from './billing.js';

// Razorpay logic (keeping inline for now as it's not strictly "project" related)
import {
    createPaymentOrder,
    verifyPaymentSignature,
    activatePlan,
    getActivePlan,
    getPaymentHistory
} from './razorpay.js';

import { BETA_MODE, BETA_PROJECT_LIMIT, BETA_VERSION_LIMIT, BETA_LABEL } from './src/utils/betaTracker.js';

dotenv.config();

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`[Request Body Keys]: ${Object.keys(req.body).join(', ')}`);
    }
    next();
});

const sanitize = (val: string) => val.trim().replace(/^["']|["']$/g, '');

const supabaseUrl = sanitize(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
const supabaseKey = sanitize(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '');

if (!supabaseUrl || !supabaseKey) {
    console.error("FATAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env");
}

let supabase: any;
try {
    if (!supabaseUrl || !supabaseKey) {
        throw new Error("Missing Supabase URL or Key");
    }
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized successfully");

    // Ensure documentation bucket exists
    supabase.storage.createBucket('documentation', { public: true })
        .then(() => console.log("[Storage] 'documentation' bucket ensured"))
        .catch((err: any) => console.warn("[Storage] Bucket check/create warning:", err.message));

} catch (err: any) {
    console.error("CRITICAL: Failed to initialize Supabase client:", err.message);
    process.exit(1);
}

// Health Check
app.get('/health', async (req, res) => {
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const docBucket = buckets?.find((b: any) => b.name === 'documentation');

        const { error: tErr } = await supabase.from('documentation_outputs').select('id').limit(1);

        res.json({
            status: 'ok',
            time: new Date().toISOString(),
            storage: {
                documentation_bucket: !!docBucket
            },
            database: {
                documentation_outputs_table: !tErr
            }
        });
    } catch (err: any) {
        res.json({ status: 'partial_ok', error: err.message });
    }
});

// Root Route
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Vizora Backend Server Running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 3002
    });
});
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Mount Routes
app.use('/api', userRoutes);
app.use('/api/schema', schemaReviewRoutes);
app.use('/api/schema', onboardingGuideRoutes);
app.use('/api/schema', askSchemaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/workspace', workspaceRoutes); // The "New" API structure
app.use('/api/settings', platformSettingsRoutes);
app.use('/api/settings/project', projectSettingsRoutes);

// New Project Routes
app.use('/projects', projectRoutes);

// Consolidated Workspace Routes (replacing legacy inline)
app.use('/workspaces', workspacesRoutes);

// --- BETA TRACKER ROUTES ---
app.get('/beta/config', (req, res) => {
    res.json({
        beta_mode: BETA_MODE,
        project_limit: BETA_PROJECT_LIMIT,
        version_limit: BETA_VERSION_LIMIT,
        label: BETA_LABEL
    });
});

app.get('/beta/usage/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { data, error } = await supabase.from('beta_usage').select('*').eq('user_id', userId).maybeSingle();
        if (error) throw error;
        res.json(data || { projects_created: 0, versions_created: 0, user_id: userId });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- FEEDBACK ---
app.post('/feedback/submit', async (req, res) => {
    try {
        const {
            user_id,
            project_id,
            context,
            rating,
            confusing,
            helpful,
            missing
        } = req.body;

        if (!user_id || !rating || !context) {
            return res.status(400).json({ error: "user_id, rating, and context are required" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const { count, error: countErr } = await supabase
            .from('user_feedback')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user_id)
            .gte('created_at', tenMinsAgo);

        if (countErr) throw countErr;

        if (count !== null && count >= 3) {
            return res.status(429).json({
                error: "You’ve already shared feedback recently. Thank you!"
            });
        }

        const { error: insertErr } = await supabase.from('user_feedback').insert({
            user_id,
            project_id: project_id || null,
            context,
            rating,
            answer_confusing: confusing || null,
            answer_helpful: helpful || null,
            answer_missing: missing || null
        });

        if (insertErr) throw insertErr;

        res.json({ success: true });
    } catch (err: any) {
        console.error("[Feedback] Submission failed:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- BILLING ROUTES ---
app.post('/billing/create-order', async (req, res) => {
    try {
        const { workspaceId, planId } = req.body;
        if (!workspaceId || !planId) return res.status(400).json({ error: 'Missing workspaceId or planId' });
        const order = await createPaymentOrder(workspaceId, planId);
        res.json({
            success: true,
            order: { id: order.id, amount: order.amount, currency: order.currency },
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (err: any) {
        console.error('[Billing] Order creation failed:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/billing/verify', async (req, res) => {
    try {
        const { workspaceId, planId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!workspaceId || !planId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing required payment fields' });
        }
        const result = await activatePlan(workspaceId, planId, razorpay_order_id, razorpay_payment_id, razorpay_signature);
        res.json({
            success: true,
            expiresAt: result.expiresAt,
            message: `Plan activated successfully. Valid until ${result.expiresAt.toLocaleDateString()}`
        });
    } catch (err: any) {
        console.error('[Billing] Payment verification failed:', err);
        res.status(400).json({ error: err.message });
    }
});

app.get('/billing/active-plan/:workspaceId', async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const activePlan = await getActivePlan(workspaceId);
        res.json(activePlan);
    } catch (err: any) {
        console.error('[Billing] Failed to get active plan:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/billing/history/:workspaceId', async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const history = await getPaymentHistory(workspaceId);
        res.json({ payments: history });
    } catch (err: any) {
        console.error('[Billing] Failed to get payment history:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE Account
app.delete('/account', async (req, res) => {
    try {
        const { userId, workspaceId } = req.body;
        if (!userId || !workspaceId) return res.status(400).json({ error: "Missing userId or workspaceId" });

        console.log(`[DANGER] Attempting full account deletion for User: ${userId}, Workspace: ${workspaceId}`);
        const { error: rpcError } = await supabase.rpc('delete_account_completely', {
            target_user_id: userId,
            target_workspace_id: workspaceId
        });

        if (rpcError) {
            console.error("RPC Deletion Failed:", rpcError);
            return res.status(403).json({ error: "Deletion failed. Ensure you are authorized.", details: rpcError.message });
        }

        const { error: authError } = await supabase.auth.admin.deleteUser(userId);
        if (authError) console.error("Auth Deletion Warning:", authError);

        console.log(`[SUCCESS] Account deleted for ${userId}`);
        res.json({ success: true, message: "Account permanently deleted." });

    } catch (err: any) {
        console.error("Delete Account Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GLOBAL TEAM INVITE ACCEPT (LEGACY)
app.post('/team/invite/accept', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: "Token required" });

        const { data: invite, error: fErr } = await supabase
            .from('team_invites')
            .select('*')
            .eq('invite_token', token)
            .maybeSingle();

        if (fErr || !invite) return res.status(404).json({ error: "Invalid invitation token" });

        if (invite.status !== 'pending') return res.status(400).json({ error: `Invite is ${invite.status}` });
        const now = new Date();
        if (new Date(invite.expires_at) < now) {
            await supabase.from('team_invites').update({ status: 'expired' }).eq('id', invite.id);
            return res.status(400).json({ error: "Invite has expired" });
        }

        const { error: insErr } = await supabase.from('team_members').insert({
            project_id: invite.project_id,
            email: invite.email,
            role: invite.role,
            joined_at: new Date().toISOString()
        });

        if (insErr) throw insErr;

        await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id);
        res.json({ success: true, projectId: invite.project_id });
    } catch (err: any) {
        console.error("Accept Error:", err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3002;
const httpServer = createServer(app);
initializeCollaboration(httpServer, supabase);

httpServer.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`WebSocket collaboration enabled`);
});
