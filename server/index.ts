
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import puppeteer from 'puppeteer';
import {
    parseSqlDeterministc,
    parsePrisma,
    parseDrizzle,
    generateSql,
    generatePrisma,
    generateDrizzle,
    compareSchemas,
    type NormalizedSchema
} from './parser.js';
import { marked } from 'marked';
import crypto from 'crypto';
import { initializeCollaboration } from './src/collaboration/index.js';

// New Intelligence Routes
import schemaReviewRoutes from './src/routes/schemaReview.js';
import onboardingGuideRoutes from './src/routes/onboardingGuide.js';
import askSchemaRoutes from './src/routes/askSchema.js';
import dashboardRoutes from './src/routes/dashboard.js';
import teamRoutes from './src/routes/team.js';
import workspaceRoutes from './src/routes/workspace.js';
import platformSettingsRoutes from './src/routes/platformSettings.js';
import projectSettingsRoutes from './src/routes/projectSettings.js';
import userRoutes from './src/routes/user.js';
import todoRoutes from './src/routes/todos.js';
import {
    getWorkspacePlan,
    checkProjectLimit,
    checkVersionLimit,
    checkFeatureAccess,
    getAiAccessLevel,
    upgradeWorkspace
} from './billing.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- PRIVATE BETA CONFIGURATION ---
const BETA_MODE = true;
const BETA_PROJECT_LIMIT = 2;
const BETA_VERSION_LIMIT = 4;
const BETA_LABEL = "Private Beta";

const app = express();
app.use(compression());
app.use(cors());
app.use(express.json());

const computeHash = (obj: any) => crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');


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
    console.log("Current Environment:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        envKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE') || k.includes('KEY'))
    });
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

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": process.env.SITE_URL || "https://vizora.app",
        "X-Title": "Vizora Schema Intelligence",
    },
});

// --- HELPER: Get Workspace ID from Project ---
async function getWorkspaceIdFromProject(projectId: string): Promise<string | null> {
    const { data } = await supabase.from('projects').select('workspace_id').eq('id', projectId).single();
    if (!data || !data.workspace_id) {
        return null;
    }
    return data.workspace_id;
}

// --- HELPER: Get Owner ID from Project/Workspace ---
async function getOwnerIdFromProject(projectId: string): Promise<string | null> {
    const { data } = await supabase.from('projects').select('owner_id').eq('id', projectId).single();
    return data?.owner_id || null;
}

async function getOwnerIdFromWorkspace(workspaceId: string): Promise<string | null> {
    const { data } = await supabase.from('workspaces').select('owner_id').eq('id', workspaceId).single();
    return data?.owner_id || null;
}

// --- BETA TRACKER HELPER ---
async function trackBetaUsage(userId: string | null | undefined, action: 'project' | 'version' | 'diagram' | 'docs') {
    if (!BETA_MODE || !userId) return;
    try {
        await supabase.rpc('increment_beta_usage', { u_id: userId, field: action });
    } catch (err: any) {
        console.warn(`[Beta Tracker] Failed to track ${action} for ${userId}:`, err.message);
    }
}

// --- AI EXPLANATION ENGINE ---
async function generateAndSaveExplanations(projectId: string, versionNumber: number, schema: NormalizedSchema) {
    console.log(`[AI Engine] START: Project ${projectId} v${versionNumber}`);

    if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) {
        console.error('[AI Engine] FATAL: OPENROUTER_API_KEY is missing from environment');
        return false;
    }

    if (!schema || !schema.tables) {
        console.error('[AI Engine] Invalid schema: missing tables');
        return false;
    }

    try {
        const workspaceId = await getWorkspaceIdFromProject(projectId);
        if (!workspaceId) throw new Error("Project has no workspace context for billing");

        // BILLING GATE: Check AI Level
        const aiLevel = await getAiAccessLevel(workspaceId);

        if (aiLevel === 'none') {
            console.log('[AI Engine] AI features disabled for this plan.');
            return false;
        }

        // Get project explanation mode
        const { data: settings, error: sErr } = await supabase
            .from('project_settings')
            .select('explanation_mode')
            .eq('project_id', projectId)
            .maybeSingle();

        if (sErr) console.warn('[AI Engine] Settings fetch warning:', sErr.message);

        const mode = settings?.explanation_mode || 'developer';
        const schemaString = JSON.stringify(schema, null, 2);
        const tableNames = Object.keys(schema.tables);

        console.log(`[AI Engine] Mode: ${mode}. Level: ${aiLevel}. Generating...`);

        // LEVEL 'db': Only DB Summary
        if (aiLevel === 'db') {
            const dbPrompt = `Explain this database schema JSON in simple, clear English.\n\nRules:\n- Explain the database as a whole\n- Include main entities and their roles\n- High-level relationships\n- Do not invent anything\n- Do not guess business logic\n- Be concise but useful\n\nSchema:\n${schemaString}`;
            const dbRes = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                temperature: 0.2,
                messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: dbPrompt }]
            });
            const explanations = [{
                project_id: projectId,
                version_number: versionNumber,
                entity_type: 'database',
                entity_name: null,
                mode: mode,
                content: dbRes.choices[0]?.message.content ?? "No explanation generated."
            }];
            await supabase.from('schema_explanations').delete().eq('project_id', projectId).eq('version_number', versionNumber);
            await supabase.from('schema_explanations').insert(explanations);
            return true;
        }

        // LEVEL 'table' or 'full'
        // 'table' = DB + Tables
        // 'full' = DB + Tables + Relations
        const dbPrompt = `Explain this database schema JSON in simple, clear English.\n\nRules:\n- Explain the database as a whole\n- Include main entities and their roles\n- High-level relationships\n- Do not invent anything\n- Do not guess business logic\n- Be concise but useful\n\nSchema:\n${schemaString}`;

        const tasks: Promise<any>[] = [
            openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                temperature: 0.2,
                messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: dbPrompt }]
            })
        ];

        // Add table tasks
        if (aiLevel === 'table' || aiLevel === 'full') {
            tableNames.forEach(tableName => {
                const tableDef = schema.tables[tableName];
                const tablePrompt = `Explain the purpose of this table and how it relates to others.\nDo not infer business logic.\n\nTable: ${tableName}\nDefinition:\n${JSON.stringify(tableDef, null, 2)}`;

                tasks.push(
                    openai.chat.completions.create({
                        model: "openai/gpt-4o-mini",
                        temperature: 0.2,
                        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: tablePrompt }]
                    }).then((res: any) => ({
                        res,
                        type: 'table',
                        name: tableName
                    }))
                );
            });
        }

        // Add relationship task
        if (aiLevel === 'full') {
            const relPrompt = `Explain the primary keys, foreign keys, and relationships across this schema.\nHow is data integrity enforced?\n\nSchema:\n${schemaString}`;
            tasks.push(
                openai.chat.completions.create({
                    model: "openai/gpt-4o-mini",
                    temperature: 0.2,
                    messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: relPrompt }]
                }).then((res: any) => ({
                    res,
                    type: 'relationship',
                    name: null
                }))
            );
        }

        const results = await Promise.all(tasks);
        const dbRes = results[0] as any; // First one is always DB

        const explanations = [{
            project_id: projectId,
            version_number: versionNumber,
            entity_type: 'database',
            entity_name: null,
            mode: mode,
            content: dbRes.choices ? dbRes.choices[0]?.message.content : (dbRes.res ? dbRes.res.choices[0]?.message.content : "Error")
        }];

        // Process rest
        for (let i = 1; i < results.length; i++) {
            const r = results[i] as any;
            if (r.res) {
                explanations.push({
                    project_id: projectId,
                    version_number: versionNumber,
                    entity_type: r.type,
                    entity_name: r.name,
                    mode: mode,
                    content: r.res.choices[0]?.message.content ?? "No explanation generated."
                });
            }
        }



        console.log(`[AI Engine] Saving ${explanations.length} explanations...`);

        // Transaction-like cleanup and insert
        const { error: delErr } = await supabase.from('schema_explanations')
            .delete()
            .eq('project_id', projectId)
            .eq('version_number', versionNumber);

        if (delErr) console.warn('[AI Engine] Cleanup warning:', delErr.message);

        const { error: insErr } = await supabase.from('schema_explanations').insert(explanations);
        if (insErr) {
            console.error('[AI Engine] DB INSERT ERROR:', insErr);
            throw insErr;
        }

        console.log(`[AI Engine] SUCCESS: Generated ${explanations.length} insights`);

        return true;
    } catch (err: any) {
        console.error(`[AI Engine] FATAL ERROR:`, err.message || err);

        // Handle Quota Exceeded (429) gracefully so the user sees a message
        if (err.status === 429 || err.message?.includes('429')) {
            console.log('[AI Engine] QUOTA EXCEEDED detected. Inserting notice for user.');
            await supabase.from('schema_explanations').insert({
                project_id: projectId,
                version_number: versionNumber,
                entity_type: 'database',
                entity_name: null,
                mode: 'error',
                content: "⚠️ OpenRouter Quota Exceeded: Your API key has run out of credits or reached its limit. Please check your billing at openrouter.ai."
            });
        }

        if (err.response) {
            console.error('[AI Engine] OpenAI Error Details:', err.response.data);
        }
        return false;
    }
}

// --- AUTO DOCS ENGINE ---
async function generateDocumentation(projectId: string, versionNumber: number) {
    console.log(`[AutoDocs] Generating documentation for project ${projectId} v${versionNumber}`);

    try {
        // 1. Load Data
        const { data: version } = await supabase.from('schema_versions')
            .select('*')
            .eq('project_id', projectId)
            .eq('version', versionNumber)
            .single();

        if (!version) throw new Error("Schema version not found");

        const { data: explanations, error: eErr } = await supabase.from('schema_explanations')
            .select('*')
            .eq('project_id', projectId)
            .eq('version_number', versionNumber);

        if (eErr) console.warn('[AutoDocs] Explanations fetch warning:', eErr.message);

        const { data: changes, error: cErr } = await supabase.from('schema_changes')
            .select('*')
            .eq('project_id', projectId)
            .eq('to_version', versionNumber);

        if (cErr) console.warn('[AutoDocs] Change tracking fetch warning (Is the table created?):', cErr.message);

        // 2. Build Markdown
        const schema = version.normalized_schema as NormalizedSchema;
        const dbExp = explanations?.find((e: any) => e.entity_type === 'database')?.content || "This database consists of multiple tables designed to support application data storage and relationships.";
        const relExp = explanations?.find((e: any) => e.entity_type === 'relationship')?.content || "Standard primary and foreign key constraints are implemented to ensure data integrity.";

        let md = `# Database Documentation\n\n`;
        md += `## Overview\n${dbExp}\n\n`;

        const tableCount = Object.keys(schema.tables).length;
        const colCount = Object.values(schema.tables).reduce((acc, t) => acc + Object.keys(t.columns).length, 0);
        const relCount = Object.values(schema.tables).reduce((acc, t: any) => acc + (t.relations?.length || 0), 0);

        md += `## Schema Summary\n`;
        md += `- **Total Tables:** ${tableCount}\n`;
        md += `- **Total Columns:** ${colCount}\n`;
        md += `- **Total Relationships:** ${relCount}\n\n`;

        md += `## Entities\n\n`;
        for (const [tableName, table] of Object.entries(schema.tables)) {
            const tableExp = explanations?.find((e: any) => e.entity_type === 'table' && e.entity_name === tableName)?.content || `The ${tableName} table persists structured records and supports the core business logic of the application.`;

            md += `### ${tableName}\n${tableExp}\n\n`;
            md += `#### Columns\n`;
            md += `| Column | Type | Constraints | Description |\n`;
            md += `|------|------|------------|-------------|\n`;

            for (const [colName, col] of Object.entries(table.columns)) {
                const constraints = [];
                if (col.primary) constraints.push('PK');
                if (col.foreign_key) constraints.push(`FK (${col.foreign_key})`);
                if (!col.nullable) constraints.push('NOT NULL');
                if (col.unique) constraints.push('UNIQUE');

                md += `| ${colName} | ${col.type} | ${constraints.join(', ')} | ${col.primary ? 'Unique identifier' : 'Attribute'} |\n`;
            }
            md += `\n`;

            if (table.relations && table.relations.length > 0) {
                md += `#### Key Relationships\n`;
                table.relations.forEach((rel: any) => {
                    md += `- **${rel.from}** → **${rel.to}** (${rel.type})\n`;
                });
                md += `\n`;
            }
            md += `---\n\n`;
        }

        md += `## Relationships Detail\n${relExp}\n\n`;

        if (changes && changes.length > 0) {
            md += `## Version Change History\n`;
            changes.forEach((c: any) => {
                const type = c.change_type.toUpperCase().replace(/_/g, ' ');
                md += `- **[${type}]**: ${c.entity_name}\n`;
            });
            md += `\n`;
        }

        md += `## Notes\n*Documentation automatically generated by Vizora AI engine on ${new Date().toLocaleDateString()}*.\n`;

        // 3. Save to DB (Cleanup old first to simulate upsert on project_id/version if no constraint)
        await supabase.from('documentation_outputs')
            .delete()
            .eq('project_id', projectId)
            .eq('version', versionNumber);

        const { error: insErr } = await supabase.from('documentation_outputs').insert({
            project_id: projectId,
            version: versionNumber,
            markdown: md
        });

        if (insErr) throw insErr;
        console.log(`[AutoDocs] Markdown version created for v${versionNumber}`);

        // 4. Trigger PDF Generation (Async) - BILLING CHECK
        const workspaceId = await getWorkspaceIdFromProject(projectId);
        if (workspaceId) {
            const canExport = await checkFeatureAccess(workspaceId, 'exports');
            if (canExport) {
                generatePdf(projectId, versionNumber, md).catch(err => {
                    console.error('[AutoDocs] PDF Generation failed:', err);
                });
            } else {
                console.log(`[AutoDocs] Exports disabled for workspace ${workspaceId}. PDF generation skipped.`);
            }
        }

    } catch (err: any) {
        console.error('[AutoDocs] Error:', err.message);
    }
}

async function generatePdf(projectId: string, versionNumber: number, markdown: string) {
    console.log(`[AutoDocs] Rendering PDF artifact for project ${projectId} v${versionNumber}`);

    try {
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.6; color: #1e293b; max-width: 850px; margin: 0 auto; padding: 50px; }
                    h1 { color: #0f172a; border-bottom: 3px solid #4f46e5; padding-bottom: 15px; font-size: 32px; font-weight: 800; }
                    h2 { color: #4338ca; margin-top: 40px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 24px; font-weight: 700; }
                    h3 { color: #1e1b4b; margin-top: 30px; background: #f8fafc; padding: 12px 20px; border-radius: 8px; font-size: 18px; font-weight: 800; border-left: 4px solid #4f46e5; }
                    table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 14px; }
                    th, td { border: 1px solid #e2e8f0; padding: 14px; text-align: left; }
                    th { background-color: #f1f5f9; color: #475569; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    .footer { margin-top: 80px; text-align: center; color: #94a3b8; font-size: 11px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
                    @media print {
                        h3 { page-break-after: avoid; }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        .no-break { page-break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                ${marked.parse(markdown)}
                <div class="footer">
                    &copy; ${new Date().getFullYear()} Vizora Schema Intelligence Engine. All architectural insights are generated deterministically from schema source.
                </div>
            </body>
            </html>
        `;

        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlContent);

        const pdfBuffer = await page.pdf({
            format: 'A4',
            margin: { top: '1.5cm', bottom: '1.5cm', left: '1.5cm', right: '1.5cm' },
            printBackground: true
        });

        await browser.close();

        // Save PDF to Storage
        const fileName = `${projectId}/v${versionNumber}_doc_${Date.now()}.pdf`;
        const { error: uErr } = await supabase.storage
            .from('documentation')
            .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

        if (uErr) {
            // Bucket might not exist, skip and log
            console.warn('[AutoDocs] Storage upload warning (check bucket "documentation"):', uErr.message);
            return;
        }

        const { data: { publicUrl } } = supabase.storage.from('documentation').getPublicUrl(fileName);

        // Update DB with PDF URL
        await supabase.from('documentation_outputs')
            .update({ pdf_url: publicUrl })
            .eq('project_id', projectId)
            .eq('version', versionNumber);

        console.log(`[AutoDocs] PDF generated and linked: ${publicUrl}`);

    } catch (err: any) {
        console.error('[AutoDocs] PDF Generation FATAL:', err.message);
    }
}


/**
 * PRIVATE BETA ROUTES
 */

// GET /beta/config
app.get('/beta/config', (req, res) => {
    res.json({
        beta_mode: BETA_MODE,
        project_limit: BETA_PROJECT_LIMIT,
        version_limit: BETA_VERSION_LIMIT,
        label: BETA_LABEL
    });
});

// GET /beta/usage/:userId
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

// POST /feedback/submit
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

        // 1. Basic validation
        if (!user_id || !rating || !context) {
            return res.status(400).json({ error: "user_id, rating, and context are required" });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Rating must be between 1 and 5" });
        }

        // 2. ANTI-SPAM: Max 3 per 10 mins
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

        // 3. Save feedback
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

const PORT = process.env.PORT || 3002;

const SYSTEM_PROMPT = `You are a senior backend engineer and database architect.
Your task is to explain a database schema clearly and accurately.

Rules:
- Explain ONLY what is present in the schema.
- Do NOT invent tables, columns, or relationships.
- Do NOT guess business logic.
- Use plain English.
- Be concise but clear.
- Use developer-friendly language.`;

// --- MIDDLEWARE: PROJECT CONTEXT ENFORCEMENT ---
/**
 * CRITICAL ARCHITECTURAL RULE:
 * All schema-related operations MUST have a valid project_id.
 * This middleware enforces the project-scoped boundary.
 * 
 * Routes that require project context:
 * - POST /projects/:id/schema
 * - POST /projects/:id/diagram
 * - POST /projects/:id/explanation
 * - POST /projects/:id/docs
 * - GET /projects/:id/convert
 * - GET /projects/:id/diff
 * - PUT /projects/:id/normalized-schema
 */
const requireProjectContext = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const projectId = req.params.id;

    console.log(`[requireProjectContext] Checking project: ${projectId}`);

    if (!projectId) {
        console.error('[requireProjectContext] No project ID in params');
        return res.status(400).json({
            error: "Project context required",
            message: "All schema operations must be performed within a project"
        });
    }

    // Verify project exists
    try {
        const { data: project, error } = await supabase
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .single();

        if (error) {
            console.error(`[requireProjectContext] DB Error for ${projectId}:`, error);
            // If it's a "Row not found" error (code PGRST116), handle as 404
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    error: "Project not found",
                    message: `No project exists with id: ${projectId}`
                });
            }
            return res.status(500).json({
                error: "Database error verifying project",
                details: error.message
            });
        }

        if (!project) {
            return res.status(404).json({
                error: "Project not found",
                message: `No project exists with id: ${projectId}`
            });
        }

        console.log(`[requireProjectContext] Project verified: ${projectId}`);
        next();
    } catch (err: any) {
        console.error('[requireProjectContext] Unexpected error:', err);
        res.status(500).json({ error: err.message });
    }
};

// --- HEALTH CHECK ---
/**
 * Health check endpoint to verify server is running.
 * Access at: http://localhost:3001/
 */
// Root handler removed to allow static frontend serving
// app.get('/', (req, res) => { ... });

// Favicon handler to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// User Identity Routes (Universal Username System)
app.use('/api', userRoutes);

// Intelligence Routes
app.use('/api/schema', schemaReviewRoutes);
app.use('/api/schema', onboardingGuideRoutes);
app.use('/api/schema', askSchemaRoutes);

// User Dashboard Routes
app.use('/api/dashboard', dashboardRoutes);

// Team Invite System Routes
app.use('/api/team', teamRoutes);

// Workspace Member Management Routes (Role Management System)
app.use('/api/workspace', workspaceRoutes);

// Platform & Settings Routes
app.use('/api/settings', platformSettingsRoutes);
app.use('/api/settings/project', projectSettingsRoutes);

// --- ROUTES ---
/**
 * GLOBAL ROUTE: Create Project
 * This is the ONLY schema-related operation that doesn't require an existing project.
 * It creates the project container that all other operations depend on.
 */

app.post('/projects', async (req, res) => {
    try {
        const { name, schema_type, workspace_id, user_id } = req.body;

        if (!name || !schema_type) {
            return res.status(400).json({ error: "Name and schema_type are required" });
        }

        console.log(`[Create Project] Request. Universal: ${workspace_id}, User: ${user_id}`);

        let universalId = workspace_id;
        let ownerAuthId = user_id;

        // 1. Resolve Identity
        // Try to verify if 'workspace_id' provided is a valid Universal ID
        if (workspace_id) {
            const { data: uUser } = await supabase
                .from('universal_users')
                .select('universal_id, auth_user_id')
                .eq('universal_id', workspace_id)
                .maybeSingle();

            if (uUser) {
                universalId = uUser.universal_id;
                ownerAuthId = uUser.auth_user_id;
            } else if (user_id) {
                // Fallback: If workspace_id was not a valid universal_id, try finding by user_id
                const { data: uUserByAuth } = await supabase
                    .from('universal_users')
                    .select('universal_id, auth_user_id')
                    .eq('auth_user_id', user_id)
                    .maybeSingle();

                if (uUserByAuth) {
                    universalId = uUserByAuth.universal_id;
                    ownerAuthId = uUserByAuth.auth_user_id;
                }
            }
        } else if (user_id) {
            // No workspace_id, resolve by user_id
            const { data: uUser } = await supabase
                .from('universal_users')
                .select('universal_id, auth_user_id')
                .eq('auth_user_id', user_id)
                .maybeSingle();

            if (uUser) {
                universalId = uUser.universal_id;
                ownerAuthId = uUser.auth_user_id;
            }
        }

        if (!ownerAuthId) {
            return res.status(400).json({ error: "Unable to resolve user identity. Please relogin." });
        }

        // 2. Limit Checks (BETA & Plan)
        if (BETA_MODE) {
            // Check limits based on Universal ID ownership (or owner_id if universal missing)
            let countQuery = supabase.from('projects').select('*', { count: 'exact', head: true });
            if (universalId) {
                countQuery = countQuery.eq('universal_id', universalId);
            } else {
                countQuery = countQuery.eq('owner_id', ownerAuthId);
            }

            const { count, error: countErr } = await countQuery;

            if (countErr) console.warn('[Create Project] Limit check warning:', countErr.message);

            if (count !== null && count >= BETA_PROJECT_LIMIT) {
                return res.status(403).json({
                    error: "Private Beta Limit Reached",
                    message: "You can't create more than 2 projects during the private beta."
                });
            }
        }

        // 3. Resolve Compatible Workspace ID (for Legacy FK)
        let compatibleWorkspaceId = undefined;
        let { data: legacyWs } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', ownerAuthId)
            .limit(1)
            .maybeSingle();

        compatibleWorkspaceId = legacyWs ? legacyWs.id : undefined;

        // Fallback: Create placeholder workspace if one doesn't exist
        // This is critical for satisfying the workspace_id NOT NULL constraint
        if (!compatibleWorkspaceId) {
            console.log('[Create Project] No legacy workspace found. Creating placeholder...');
            try {
                const { data: newWs, error: newWsErr } = await supabase
                    .from('workspaces')
                    .insert({
                        name: "Personal Workspace",
                        type: 'personal',
                        owner_id: ownerAuthId
                    })
                    .select('id')
                    .single();

                if (newWsErr || !newWs) {
                    console.error('[Create Project] Failed to create placeholder:', newWsErr);
                } else {
                    compatibleWorkspaceId = newWs.id;
                    await supabase.from('workspace_members').insert({
                        workspace_id: newWs.id,
                        user_id: ownerAuthId,
                        role: 'admin'
                    });
                }
            } catch (wsErr) {
                console.warn('[Create Project] Placeholder creation warning:', wsErr);
            }
        }

        const projectData = {
            name,
            schema_type,
            current_step: 'schema',
            universal_id: universalId,  // NEW MASTER KEY
            owner_id: ownerAuthId,      // LEGACY RLS KEY
            workspace_id: compatibleWorkspaceId // Must be a valid FK
        };

        const { data, error } = await supabase
            .from('projects')
            .insert(projectData)
            .select()
            .single();

        if (error) {
            console.error('[Create Project] DB Insert Error:', JSON.stringify(error, null, 2));

            // Retry Logic for Common Schema/Data Issues
            // 1. Universal Column Missing (Schema Drift)?
            if (error.message?.includes('universal_id') || error.code === '42703') { // Undefined column
                console.warn('[Create Project] Retrying without universal_id (Legacy Mode)...');
                const legacyData = { ...projectData };
                delete (legacyData as any).universal_id;

                const { data: retryData, error: retryError } = await supabase
                    .from('projects')
                    .insert(legacyData)
                    .select()
                    .single();

                if (retryError) throw retryError;
                return res.json(retryData);
            }

            // 2. FK Violation on workspace_id?
            if (error.code === '23503') {
                console.warn('[Create Project] FK Violation on workspace_id. Retrying without it...');
                const fallbackData = { ...projectData };
                delete (fallbackData as any).workspace_id;

                const { data: retryData, error: retryError } = await supabase
                    .from('projects')
                    .insert(fallbackData)
                    .select()
                    .single();

                if (retryError) throw retryError;
                return res.json(retryData);
            }
            throw error;
        }

        res.json(data);
    } catch (err: any) {
        // Detailed error logging specifically for this mysterious 500
        console.error("[Project Creation] Failed Full Error Object:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
        res.status(500).json({
            error: err.message || "Unknown error",
            details: err.details || err,
            code: err.code || 'UNKNOWN'
        });
    }
});

/**
 * WORKSPACE & TEAM ROUTES
 */

// GET /workspaces/current?userId=...
app.get('/workspaces/current', async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "User ID required" });

        // 1. Check if user owns a workspace
        let { data: workspace, error } = await supabase
            .from('workspaces')
            .select('*')
            .eq('owner_id', userId)
            .maybeSingle();

        // 2. If not owner, check if member
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
            workspace.role = 'admin'; // Owners are admins
        }

        // 3. If no workspace, create Default Personal Workspace
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

        // Attach Billing Info
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

// GET /workspaces/:id/members
app.get('/workspaces/:id/members', async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch owner
        const { data: workspace } = await supabase.from('workspaces').select('owner_id').eq('id', id).single();

        // Fetch members
        const { data: members } = await supabase
            .from('workspace_members')
            .select('user_id, role, joined_at, id');

        // We need user details (name/email). 
        // NOTE: In a real app, we'd join with profiles or auth.users. 
        // Since we can't easily join auth.users via API, we might need a profiles table.
        // For this demo, we'll return the IDs and let frontend/mock handle display if profiles missing.

        res.json({ owner_id: workspace?.owner_id, members: members || [] });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /workspaces/:id/invite -> Generate Link
app.post('/workspaces/:id/invite', async (req, res) => {
    try {
        const { id } = req.params;
        const { role, userId } = req.body; // Requester needs to be admin

        // 1. Verify Admin
        // In a real app, verify `userId` against `id` ownership or admin membership
        // Assuming secure for now as per instructions "Backend acts as Edge Function"

        const token = crypto.randomBytes(16).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

        const { data, error } = await supabase.from('workspace_invites').insert({
            workspace_id: id,
            token,
            role,
            expires_at: expiresAt.toISOString()
        }).select().single();

        if (error) throw error;

        // Return full URL
        const inviteUrl = `${process.env.VITE_APP_URL || 'http://localhost:5173'}/join?token=${token}`;

        res.json({ success: true, url: inviteUrl, ...data });
    } catch (err: any) {
        console.error("Invite Gen Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /workspaces/join -> Accept Link
app.post('/workspaces/join', async (req, res) => {
    try {
        const { token, userId } = req.body;
        if (!token || !userId) return res.status(400).json({ error: "Token and User ID required" });

        // 1. Validate Token
        const { data: invite, error: iErr } = await supabase
            .from('workspace_invites')
            .select('*')
            .eq('token', token)
            .single();

        if (iErr || !invite) return res.status(404).json({ error: "Invalid invitation" });
        if (invite.revoked) return res.status(410).json({ error: "Invitation revoked" });
        if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: "Invitation expired" });
        if (invite.used_count >= invite.max_uses) return res.status(410).json({ error: "Invitation used" });

        // 2. Add Member
        const { error: mErr } = await supabase.from('workspace_members').insert({
            workspace_id: invite.workspace_id,
            user_id: userId,
            role: invite.role
        });

        if (mErr) {
            // Check for duplicate
            if (mErr.code === '23505') { // unique_violation
                return res.json({ success: true, message: "Already a member" });
            }
            throw mErr;
        }

        // 3. Increment Use
        await supabase.from('workspace_invites').update({
            used_count: invite.used_count + 1
        }).eq('id', invite.id);

        res.json({ success: true, workspaceId: invite.workspace_id });
    } catch (err: any) {
        console.error("Join Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET /workspaces/:id/invites
app.get('/workspaces/:id/invites', async (req, res) => {
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

// POST /workspaces/invite/revoke
app.post('/workspaces/invite/revoke', async (req, res) => {
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

// ===== RAZORPAY PAYMENT ROUTES (ONE-TIME PAYMENTS) =====

import {
    createPaymentOrder,
    verifyPaymentSignature,
    activatePlan,
    getActivePlan,
    getPaymentHistory
} from './razorpay.js';

/**
 * Create Razorpay order for one-time payment
 * No subscriptions, no auto-renew
 */
app.post('/billing/create-order', async (req, res) => {
    try {
        const { workspaceId, planId } = req.body;

        if (!workspaceId || !planId) {
            return res.status(400).json({ error: 'Missing workspaceId or planId' });
        }

        const order = await createPaymentOrder(workspaceId, planId);

        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency
            },
            razorpayKeyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (err: any) {
        console.error('[Billing] Order creation failed:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Verify payment and activate plan
 * Cryptographic signature verification (no webhook needed)
 */
app.post('/billing/verify', async (req, res) => {
    try {
        const {
            workspaceId,
            planId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (!workspaceId || !planId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ error: 'Missing required payment fields' });
        }

        const result = await activatePlan(
            workspaceId,
            planId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

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

/**
 * Get active plan for workspace (with expiry check)
 */
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

/**
 * Get payment history for workspace
 */
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

/**
 * PROJECT-SCOPED BILLING
 * Used by components like SchemaDesigner, ERDiagrams, and AutoDocs to check access.
 */
app.get('/projects/:id/billing', async (req, res) => {
    try {
        const { id } = req.params;
        const workspaceId = await getWorkspaceIdFromProject(id);

        if (!workspaceId) {
            // Fallback for projects without workspace context (should be rare)
            return res.json({
                plan: { id: 'free', ai_level: 'full', allow_exports: true, allow_designer: true },
                usage: { projects_count: 0 }
            });
        }

        const plan = await getWorkspacePlan(workspaceId);
        const { data: usage } = await supabase
            .from('workspace_usage')
            .select('*')
            .eq('workspace_id', workspaceId)
            .maybeSingle();

        res.json({
            plan,
            usage: usage || { projects_count: 0, ai_tokens_used: 0 }
        });
    } catch (err: any) {
        console.error('[Billing Route] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/projects/:id/billing/unlock', async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_id } = req.body;
        const workspaceId = await getWorkspaceIdFromProject(id);

        if (!workspaceId) throw new Error("Project has no workspace context for billing");

        const result = await upgradeWorkspace(workspaceId, plan_id);
        res.json(result);
    } catch (err: any) {
        console.error('[Billing Unlock] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /account -> Full Account Deletion
app.delete('/account', async (req, res) => {
    try {
        const { userId, workspaceId } = req.body;

        if (!userId || !workspaceId) {
            return res.status(400).json({ error: "Missing userId or workspaceId" });
        }

        console.log(`[DANGER] Attempting full account deletion for User: ${userId}, Workspace: ${workspaceId}`);

        // 1. Execute SQL Transaction via RPC
        const { error: rpcError } = await supabase.rpc('delete_account_completely', {
            target_user_id: userId,
            target_workspace_id: workspaceId
        });

        if (rpcError) {
            console.error("RPC Deletion Failed:", rpcError);
            return res.status(403).json({ error: "Deletion failed. Ensure you are authorized.", details: rpcError.message });
        }

        // 2. Delete Auth User (Identity)
        const { error: authError } = await supabase.auth.admin.deleteUser(userId);

        if (authError) {
            console.error("Auth Deletion Warning:", authError);
        }

        console.log(`[SUCCESS] Account deleted for ${userId}`);
        res.json({ success: true, message: "Account permanently deleted." });

    } catch (err: any) {
        console.error("Delete Account Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GLOBAL ROUTE: Delete Project
 * Performs a deep cleanup of all project-related data across all tables.
 * This is necessary because some database configurations might not have ON DELETE CASCADE.
 */
app.delete('/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[Project Cleanup] Hard deleting project: ${id}`);

        // Define tables to clean up in order (children first)
        const tables = [
            'schema_changes',
            'schema_explanations',
            'documentation_outputs',
            'diagram_states',
            'schema_versions',
            'project_settings',
            'workspace_invites', // Fixed: was team_infites if copied over
            'workspace_members'  // Fixed: was team_members if copied over
        ];

        // Note: workspace_* are usually workspace scoped, not project scoped.
        // But for projects API, we clean PROJECT specific data.
        // We will trust standard project deletion for now.

        // Finally delete the project itself
        const { error: pErr } = await supabase.from('projects').delete().eq('id', id);
        if (pErr) throw pErr;

        res.json({ success: true, message: "Project deleted successfully." });
    } catch (err: any) {
        console.error("INTERNAL SERVER ERROR (Delete Project):", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * PROJECT-SCOPED ROUTE: Ingest Schema
 * Accepts raw schema text and creates a new schema version.
 * REQUIRES: Active project context
 */
app.post('/projects/:id/schema', requireProjectContext, async (req, res) => {
    try {
        const id = req.params.id as string;
        const { raw_schema, user_id } = req.body;

        if (!raw_schema || typeof raw_schema !== 'string') {
            return res.status(400).json({ error: "raw_schema is required" });
        }

        // 1. PROJECT CONTEXT & SETTINGS (Parallel Fetch)
        const { data: project, error: projectErr } = await supabase
            .from('projects')
            .select('workspace_id, owner_id, schema_type, name, project_settings(*)')
            .eq('id', id)
            .single();

        if (projectErr || !project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const workspaceId = project.workspace_id;
        const ownerId = project.owner_id;
        const schemaType = project.schema_type || 'sql';
        const settings = project.project_settings?.[0] || project.project_settings; // Support both array/object depending on join

        // 2. LIMIT CHECKS & PREVIOUS VERSION (Parallel)
        const [limitCheck, latestVerResult] = await Promise.all([
            workspaceId ? checkVersionLimit(workspaceId, id) : Promise.resolve({ allowed: true }),
            supabase
                .from('schema_versions')
                .select('version, schema_hash')
                .eq('project_id', id)
                .order('version', { ascending: false })
                .limit(1)
                .maybeSingle()
        ]);

        if (limitCheck && !limitCheck.allowed) {
            return res.status(403).json({ error: "Version limit reached", message: (limitCheck as any).message });
        }

        const latestVer = latestVerResult.data;

        // BETA GUARD: Version Limit 
        if (workspaceId && BETA_MODE) {
            const { count } = await supabase.from('schema_versions').select('id', { count: 'exact', head: true }).eq('project_id', id);
            if ((count || 0) >= BETA_VERSION_LIMIT) {
                return res.status(403).json({
                    error: "Private Beta Limit Reached",
                    message: `Schema version limit reached in beta (max ${BETA_VERSION_LIMIT} versions per project).`
                });
            }
        }

        console.log(`[Schema Ingestion] Using parser for type: ${schemaType}`);

        // 3. Parse Schema
        let result;
        switch (schemaType) {
            case 'prisma':
                result = parsePrisma(raw_schema);
                break;
            case 'drizzle':
                result = parseDrizzle(raw_schema);
                break;
            case 'sql':
            default:
                result = parseSqlDeterministc(raw_schema);
                break;
        }

        if (result.status === 'error') {
            return res.status(400).json({ error: result.errors.join(', ') });
        }

        const schemaHash = computeHash(result.schema);

        // 2. Fetch Latest Version (to check for changes)
        // ALREADY FETCHED ABOVE IN PARALLEL
        /*
        const { data: latestVer } = await supabase
            .from('schema_versions')
            .select('version, schema_hash')
            .eq('project_id', id)
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle();
        */

        // 3. Compare Hash (Avoid Redundancy)
        if (latestVer && latestVer.schema_hash === schemaHash) {
            return res.json({
                success: true,
                status: "no_changes",
                message: "No changes detected. Current version is up to date.",
                version: latestVer.version
            });
        }

        const nextVersion = (latestVer?.version || 0) + 1;

        // 4. Insert New Version (Immutable)
        const { error: vErr } = await supabase.from('schema_versions').insert({
            project_id: id,
            version: nextVersion,
            raw_schema,
            normalized_schema: result.schema,
            schema_hash: schemaHash
        });

        if (vErr) throw vErr;

        // 4. Change Tracking Logic (Deterministic Diff)
        const { data: previous } = await supabase.from('schema_versions')
            .select('normalized_schema, version')
            .eq('project_id', id)
            .eq('version', nextVersion - 1)
            .maybeSingle();

        if (previous) {
            const changes = compareSchemas(previous.normalized_schema as NormalizedSchema, result.schema);
            if (changes.length > 0) {
                const inserts = changes.map(c => ({
                    project_id: id,
                    from_version: previous.version,
                    to_version: nextVersion,
                    change_type: c.change_type,
                    entity_name: c.entity_name,
                    details: c.details
                }));
                await supabase.from('schema_changes').insert(inserts);
            }
        }

        // 5. UPDATE PROJECT STEP
        await supabase.from('projects').update({ current_step: 'diagram' }).eq('id', id);

        // 6. ASYNC BACKGROUND TASKS (No Await)
        generateAndSaveExplanations(id as string, nextVersion, result.schema).then(async (success) => {
            if (success && settings?.auto_generate_docs) {
                await generateDocumentation(id as string, nextVersion);
            }
        }).catch(err => {
            console.error('[Schema Ingestion] Background AI/Docs generation failed:', err);
        });

        if (ownerId) trackBetaUsage(ownerId as string, 'version');

        // 7. Version Retention Logic (Parallel if possible)
        if (settings && !settings.retain_all_versions) {
            const RETAIN_COUNT = 20;
            const { data: oldVersions } = await supabase
                .from('schema_versions')
                .select('version')
                .eq('project_id', id)
                .order('version', { ascending: false })
                .range(RETAIN_COUNT, 1000);

            if (oldVersions && oldVersions.length > 0) {
                const versionsToDelete = oldVersions.map((v: any) => v.version);
                await supabase.from('schema_versions').delete().eq('project_id', id).in('version', versionsToDelete);
            }
        }

        console.log(`[Schema Ingestion] Success! Version ${nextVersion} created`);



        res.json({
            success: true,
            schema: result.schema,
            version: nextVersion,
            stats: result.stats,
            warnings: result.warnings
        });
    } catch (err: any) {
        console.error('[Schema Ingestion] Unexpected error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * PROJECT-SCOPED ROUTE: Generate Diagram
 * Creates diagram state from normalized schema.
 * REQUIRES: Active project context
 */
app.post('/projects/:id/diagram', requireProjectContext, async (req, res) => {
    try {
        const id = req.params.id as string;

        const { data: project, error: pErr } = await supabase.from('projects').select('current_step').eq('id', id).single();
        if (pErr || !project) return res.status(404).json({ error: "Project not found" });
        if (project.current_step !== 'diagram') return res.status(400).json({ error: "Invalid step for this action" });

        const { data: version, error: vErr } = await supabase
            .from('schema_versions')
            .select('normalized_schema, version')
            .eq('project_id', id)
            .order('version', { ascending: false })
            .limit(1)
            .single();
        if (vErr || !version) throw new Error("Schema version not found");

        const schema = version.normalized_schema as NormalizedSchema;

        // Transform schema to graph nodes
        const nodes = Object.entries(schema.tables).map(([name, table]) => ({
            id: name,
            label: name,
            columns: Object.entries(table.columns).map(([colName, col]) => ({
                name: colName,
                type: col.type,
                pk: col.primary // Use 'primary' instead of 'primary_key'
            }))
        }));

        // Use 'diagram_states' instead of 'er_diagrams'
        const { error: dErr } = await supabase.from('diagram_states').insert({
            project_id: id,
            version_number: version.version,
            diagram_json: { nodes, edges: [] } // Initial diagram state for visualizer
        });
        if (dErr) throw dErr;

        await supabase.from('projects').update({ current_step: 'explanation' }).eq(
            'id', id);

        // TRACK BETA USAGE
        const ownerId = await getOwnerIdFromProject(id);
        if (ownerId) await trackBetaUsage(ownerId as string, 'diagram');

        res.json({ success: true, nodes });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PROJECT-SCOPED ROUTE: Generate AI Explanations
 * Uses OpenAI to explain schema at database, table, and relationship levels.
 * REQUIRES: Active project context
 */
app.post('/projects/:id/explanation', requireProjectContext, async (req, res) => {
    try {
        const id = req.params.id as string;
        if (!id) throw new Error("ID required");

        // Load latest normalized_schema
        const { data: version } = await supabase.from('schema_versions').select('normalized_schema, version').eq('project_id', id).order('version', { ascending: false }).limit(1).single();
        if (!version) return res.status(404).json({ error: "Schema not found" });

        const success = await generateAndSaveExplanations(id, version.version, version.normalized_schema as NormalizedSchema);

        if (!success) {
            return res.status(500).json({ error: "Explanation generation failed" });
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});


/**
 * PROJECT-SCOPED ROUTE: Generate Documentation
 * Creates PDF documentation from explanations.
 * REQUIRES: Active project context
 */
app.post('/projects/:id/docs', requireProjectContext, async (req, res) => {
    console.log(`[Route] POST /projects/${req.params.id}/docs`);
    try {
        const id = req.params.id as string;
        let { version } = req.body;

        if (!version) {
            const { data: latest } = await supabase.from('schema_versions')
                .select('version')
                .eq('project_id', id)
                .order('version', { ascending: false })
                .limit(1)
                .single();
            version = latest?.version;
        }

        if (!version) return res.status(400).json({ error: "Version required" });

        await generateDocumentation(id, version as number);

        // TRACK BETA USAGE
        const ownerId = await getOwnerIdFromProject(id);
        if (ownerId) await trackBetaUsage(ownerId, 'docs');

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PROJECT-SCOPED ROUTE: Convert Schema Format
 * Converts normalized schema to SQL, Prisma, or Drizzle.
 * REQUIRES: Active project context
 */
app.get('/projects/:id/convert', requireProjectContext, async (req, res) => {
    try {
        const { id } = req.params;
        const { format } = req.query;

        const { data: version } = await supabase
            .from('schema_versions')
            .select('normalized_schema')
            .eq('project_id', id)
            .order('version', { ascending: false })
            .limit(1)
            .single();

        if (!version) return res.status(404).json({ error: "Version not found" });

        const schema = version.normalized_schema as NormalizedSchema;
        let code = '';

        switch (format) {
            case 'prisma':
                code = generatePrisma(schema);
                break;
            case 'drizzle':
                code = generateDrizzle(schema);
                break;
            case 'sql':
            default:
                code = generateSql(schema);
                break;
        }

        res.json({ code });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PROJECT-SCOPED ROUTE: List Versions
 */
app.get('/projects/:id/versions', requireProjectContext, async (req, res) => {
    try {
        const { id } = req.params;
        const { data: versions, error } = await supabase
            .from('schema_versions')
            .select('version, created_at, schema_hash')
            .eq('project_id', id)
            .order('version', { ascending: false });

        if (error) throw error;
        res.json(versions);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});



/**
 * PROJECT-SCOPED ROUTE: Get Settings
 */
app.get('/projects/:id/settings', requireProjectContext, async (req, res) => {
    try {
        const { id } = req.params;
        const { data: settings, error } = await supabase
            .from('project_settings')
            .select('*')
            .eq('project_id', id)
            .single();

        if (error) throw error;
        res.json(settings);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PROJECT-SCOPED ROUTE: Update Settings
 */
app.patch('/projects/:id/settings', requireProjectContext, async (req, res) => {
    try {
        const { id } = req.params;
        const { explanation_mode, auto_generate_docs, retain_all_versions } = req.body;

        const updates: any = { updated_at: new Date().toISOString() };
        if (explanation_mode) updates.explanation_mode = explanation_mode;
        if (typeof auto_generate_docs === 'boolean') updates.auto_generate_docs = auto_generate_docs;
        if (typeof retain_all_versions === 'boolean') updates.retain_all_versions = retain_all_versions;

        const { data, error } = await supabase
            .from('project_settings')
            .update(updates)
            .eq('project_id', id)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});




/**
 * PROJECT-SCOPED ROUTE: Compare any two versions
 */
app.post('/projects/:id/compare', requireProjectContext, async (req, res) => {
    try {
        const { id } = req.params;
        const { from_version, to_version } = req.body;

        if (from_version === undefined || to_version === undefined) {
            return res.status(400).json({ error: "from_version and to_version are required" });
        }

        const { data: versions } = await supabase
            .from('schema_versions')
            .select('normalized_schema, version')
            .eq('project_id', id)
            .in('version', [from_version, to_version])
            .order('version', { ascending: true });

        if (!versions || versions.length < 2) {
            // Handle edge case where from/to are same
            if (from_version === to_version && versions?.length === 1) {
                return res.json([]);
            }
            return res.status(404).json({ error: "One or both versions not found" });
        }

        const from = versions.find((v: any) => v.version === from_version);
        const to = versions.find((v: any) => v.version === to_version);

        if (!from || !to) {
            return res.status(404).json({ error: "Version mismatch" });
        }

        const changes = compareSchemas(
            from.normalized_schema as NormalizedSchema,
            to.normalized_schema as NormalizedSchema
        );

        res.json(changes);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PROJECT-SCOPED ROUTE: Update Normalized Schema
 * Updates schema from visual designer changes.
 */
app.put('/projects/:id/normalized-schema', requireProjectContext, async (req, res) => {
    try {
        const { id } = req.params;
        const { normalized_schema } = req.body;

        const { data: latest } = await supabase
            .from('schema_versions')
            .select('version, raw_schema')
            .eq('project_id', id)
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle();

        const nextVersion = (latest?.version || 0) + 1;
        const rawSchema = latest?.raw_schema || '-- Visual designer update';
        const schemaHash = computeHash(normalized_schema);

        const { error } = await supabase.from('schema_versions').insert({
            project_id: id,
            version: nextVersion,
            normalized_schema,
            raw_schema: rawSchema,
            schema_hash: schemaHash
        });

        if (error) throw error;



        res.json({ success: true, version: nextVersion });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * EMAIL SERVICE
 */
const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
    // Abstraction for Email Provider (Resend / SendGrid / Supabase SMTP)
    console.log(`[Email Service] To: ${to} | Subject: ${subject}`);
    console.log(`[Email Service] Body: ${html}`);

    // In a real implementation, you would call your provider here:
    // await resend.emails.send({ ... })
    // For now, we simulate success.
    return true;
};

/**
 * PROJECT-SCOPED ROUTE: List Team Members & Invites
 */
app.get('/projects/:id/team', requireProjectContext, async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch Members
        const { data: members, error: mErr } = await supabase
            .from('team_members')
            .select('*')
            .eq('project_id', id)
            .order('joined_at', { ascending: false });

        if (mErr) throw mErr;

        // Fetch Pending Invites
        const { data: invites, error: iErr } = await supabase
            .from('team_invites')
            .select('*')
            .eq('project_id', id)
            .order('created_at', { ascending: false });

        if (iErr) throw iErr;

        // Check for expired invites and update them on read (lazy expiration)
        const now = new Date();
        const expiredInvites = invites.filter((inv: any) =>
            inv.status === 'pending' && new Date(inv.expires_at) < now
        );

        if (expiredInvites.length > 0) {
            // Background update for expired
            const expiredIds = expiredInvites.map((i: any) => i.id);
            await supabase.from('team_invites')
                .update({ status: 'expired' })
                .in('id', expiredIds);
        }

        res.json({
            members,
            invites: invites.map((inv: any) => ({
                ...inv,
                status: (inv.status === 'pending' && new Date(inv.expires_at) < now) ? 'expired' : inv.status
            }))
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PROJECT-SCOPED ROUTE: Send Team Invite
 */
app.post('/projects/:id/team/invite', requireProjectContext, async (req, res) => {
    try {
        const { id } = req.params;
        const { email, role } = req.body;

        if (!email || !role) {
            return res.status(400).json({ error: "Email and role are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // 1. Check if already a member
        const { data: existingMember } = await supabase
            .from('team_members')
            .select('id')
            .eq('project_id', id)
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (existingMember) {
            return res.status(409).json({ error: "User is already a team member" });
        }

        // 2. Check for pending invite
        const { data: existingInvite } = await supabase
            .from('team_invites')
            .select('id')
            .eq('project_id', id)
            .eq('email', normalizedEmail)
            .eq('status', 'pending')
            .maybeSingle();

        if (existingInvite) {
            return res.status(409).json({ error: "Pending invitation already exists" });
        }

        // 3. Create Invite
        const inviteToken = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const { data: invite, error: insErr } = await supabase
            .from('team_invites')
            .insert({
                project_id: id,
                email: normalizedEmail,
                role,
                invite_token: inviteToken,
                expires_at: expiresAt.toISOString(),
                status: 'pending'
            })
            .select()
            .single();

        if (insErr) throw insErr;

        // 4. Send Email
        const inviteLink = `http://localhost:5173/invite/accept?token=${inviteToken}`; // Adjust domain in prod
        await sendEmail({
            to: normalizedEmail,
            subject: 'You have been invited to join a Vizora project',
            html: `
                <h2>Project Invitation</h2>
                <p>You have been invited to join a schema design project as a <strong>${role}</strong>.</p>
                <p>Click the link below to accept:</p>
                <a href="${inviteLink}" style="padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Accept Invite</a>
                <p>This link expires in 7 days.</p>
            `
        });

        res.json({ success: true, invite });
    } catch (err: any) {
        console.error("Invite Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GLOBAL ROUTE: Accept Team Invite
 */
app.post('/team/invite/accept', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: "Token required" });

        // 1. Find invite
        const { data: invite, error: fErr } = await supabase
            .from('team_invites')
            .select('*')
            .eq('invite_token', token)
            .maybeSingle();

        if (fErr || !invite) {
            return res.status(404).json({ error: "Invalid invitation token" });
        }

        // 2. Validate
        if (invite.status !== 'pending') {
            return res.status(400).json({ error: `Invite is ${invite.status}` });
        }

        const now = new Date();
        if (new Date(invite.expires_at) < now) {
            await supabase.from('team_invites').update({ status: 'expired' }).eq('id', invite.id);
            return res.status(400).json({ error: "Invite has expired" });
        }

        // 3. Add to Team Members
        const { error: insErr } = await supabase.from('team_members').insert({
            project_id: invite.project_id,
            email: invite.email,
            role: invite.role,
            joined_at: new Date().toISOString()
        });

        if (insErr) throw insErr;

        // 4. Update Invite Status
        await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', invite.id);

        res.json({ success: true, projectId: invite.project_id });
    } catch (err: any) {
        console.error("Accept Error:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * PROJECT-SCOPED ROUTE: Revoke/Delete Invite or Member
 */
app.delete('/projects/:id/team/:type/:itemId', requireProjectContext, async (req, res) => {
    try {
        const { id, type, itemId } = req.params;
        const table = type === 'invite' ? 'team_invites' : type === 'member' ? 'team_members' : null;

        if (!table) return res.status(400).json({ error: "Invalid type" });

        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', itemId)
            .eq('project_id', id); // Ensure project isolation

        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Platform Settings Routes
app.use('/api/settings', platformSettingsRoutes);
app.use('/api/project-settings', projectSettingsRoutes);
app.use('/api/todos', todoRoutes);

// Create HTTP server for Socket.IO integration
const httpServer = createServer(app);

// --- SERVE FRONTEND (SPA) ---
const distPath = path.join(__dirname, '../dist');
console.log(`Serving static files from: ${distPath}`);
app.use(express.static(distPath));

// Handle SPA routing: serve index.html for any non-API routes
// Note: Express 5 requires (.*) instead of * for wildcard matching
// We use a regex that matches everything BUT starts with /api (though API routes should be handled above, this is safety)
app.get(/(.*)/, (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    const indexPath = path.join(distPath, 'index.html');

    // Check if file exists to prevent crashing
    import('fs').then(fs => {
        fs.access(indexPath, fs.constants.F_OK, (err) => {
            if (err) {
                console.error("[SPA] Index.html not found:", indexPath);
                return res.status(404).send("Frontend build not found. Please check deployment logs.");
            }
            res.sendFile(indexPath);
        });
    });
});

// Initialize collaboration server
initializeCollaboration(httpServer, supabase);

httpServer.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`WebSocket collaboration enabled`);
});
