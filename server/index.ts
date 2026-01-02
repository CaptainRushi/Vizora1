
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import {
    getProjectPlan,
    getGlobalUsage,
    incrementUsage,
    getProjectUsage,
    DEFAULT_PLANS
} from './billing.js';

dotenv.config();

const app = express();
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
});

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
        // Get project explanation mode
        const { data: settings, error: sErr } = await supabase
            .from('project_settings')
            .select('explanation_mode')
            .eq('project_id', projectId)
            .maybeSingle();

        if (sErr) console.warn('[AI Engine] Settings fetch warning:', sErr.message);

        const mode = settings?.explanation_mode || 'developer';
        const plan = await getProjectPlan(projectId);
        const usage = await getProjectUsage(projectId);

        const schemaString = JSON.stringify(schema, null, 2);
        const tableNames = Object.keys(schema.tables);

        console.log(`[AI Engine] Mode: ${mode}. Plan: ${plan.id}. Generating...`);

        // BILLING GATE: If Free, only do DB summary
        if (plan.ai_limit === 'limited') {
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

        // 1. Prepare prompts
        const dbPrompt = `Explain this database schema JSON in simple, clear English.\n\nRules:\n- Explain the database as a whole\n- Include main entities and their roles\n- High-level relationships\n- Do not invent anything\n- Do not guess business logic\n- Be concise but useful\n\nSchema:\n${schemaString}`;

        const relPrompt = `Explain the primary keys, foreign keys, and relationships across this schema.\nHow is data integrity enforced?\n\nSchema:\n${schemaString}`;

        // 2. Run high-level summaries and table-level explanations in parallel
        // We'll run the DB summary, the Relationship summary, and ALL table summaries in parallel
        // to save time, as gpt-4o-mini is very fast.

        const tableTasks = tableNames.map(async (tableName) => {
            const tableDef = schema.tables[tableName];
            const tablePrompt = `Explain the purpose of this table and how it relates to others.\nDo not infer business logic.\n\nTable: ${tableName}\nDefinition:\n${JSON.stringify(tableDef, null, 2)}`;

            const res = await openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                temperature: 0.2,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: tablePrompt }
                ]
            });
            return {
                project_id: projectId,
                version_number: versionNumber,
                entity_type: 'table',
                entity_name: tableName,
                mode: mode,
                content: res.choices[0]?.message.content ?? "No explanation generated."
            };
        });

        const [dbRes, relRes, ...tableExplanations] = await Promise.all([
            openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                temperature: 0.2,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: dbPrompt }
                ]
            }),
            openai.chat.completions.create({
                model: "openai/gpt-4o-mini",
                temperature: 0.2,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: relPrompt }
                ]
            }),
            ...tableTasks
        ]);

        const explanations = [
            {
                project_id: projectId,
                version_number: versionNumber,
                entity_type: 'database',
                entity_name: null,
                mode: mode,
                content: dbRes.choices[0]?.message.content ?? "No explanation generated."
            },
            {
                project_id: projectId,
                version_number: versionNumber,
                entity_type: 'relationship',
                entity_name: null,
                mode: mode,
                content: relRes.choices[0]?.message.content ?? "No explanation generated."
            },
            ...tableExplanations
        ];

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

        // 4. Trigger PDF Generation (Async)
        generatePdf(projectId, versionNumber, md).catch(err => {
            console.error('[AutoDocs] PDF Generation failed:', err);
        });

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

const PORT = 3001;

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

        if (error || !project) {
            console.error(`[requireProjectContext] Project not found: ${projectId}`, error);
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
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Vizora Backend Server Running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Favicon handler to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});


// --- ROUTES ---
/**
 * GLOBAL ROUTE: Create Project
 * This is the ONLY schema-related operation that doesn't require an existing project.
 * It creates the project container that all other operations depend on.
 */

app.post('/projects', async (req, res) => {
    try {
        const { name, schema_type } = req.body;
        if (!name || !schema_type) return res.status(400).json({ error: "Name and schema_type required" });

        // BILLING GATE: Check total projects (global since no auth)
        // We look for any project that is on 'free' plan if the current count > 0
        const { projectCount } = await getGlobalUsage();
        if (projectCount >= 1) {
            // Check if there is a non-free project that would allow more?
            // Since no auth, we just enforce the lowest limit unless one project is upgraded.
            // Simplified: If you have 1 project and it's free, you can't create more.
            const projects = await supabase.from('projects').select('id');
            let maxLimit = 1;
            for (const p of projects.data || []) {
                const plan = await getProjectPlan(p.id);
                if (plan.project_limit > maxLimit) maxLimit = plan.project_limit;
            }

            if (projectCount >= maxLimit) {
                return res.status(403).json({
                    error: "Project limit reached",
                    message: `You've reached the project limit. Upgrade to Pro to manage up to 5 schemas.`
                });
            }
        }

        console.log("Creating project:", { name, schema_type });
        const { data, error } = await supabase
            .from('projects')
            .insert({ name, schema_type, current_step: 'schema' })
            .select()
            .single();

        if (error) {
            console.error("Supabase Project Insert Error:", error);
            throw error;
        }

        // Initialize subscription as Free
        await supabase.from('subscriptions').insert({
            project_id: data.id,
            plan_id: 'free',
            status: 'active'
        });

        res.json(data);
    } catch (err: any) {
        console.error("INTERNAL SERVER ERROR (Create Project):", err);
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
            'team_members',
            'team_invites'
        ];

        for (const table of tables) {
            const { error } = await supabase.from(table).delete().eq('project_id', id);
            if (error) console.warn(`[Project Cleanup] Warning deleting from ${table}:`, error.message);
        }

        // Finally delete the project itself
        const { error: pErr } = await supabase.from('projects').delete().eq('id', id);
        if (pErr) throw pErr;

        res.json({ success: true, message: "Project and all associated data deleted successfully." });
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
        const { id } = req.params;
        const { raw_schema } = req.body;

        if (!raw_schema || typeof raw_schema !== 'string') {
            return res.status(400).json({ error: "raw_schema is required" });
        }

        // BILLING GATE: Check version count
        const plan = await getProjectPlan(id as string);
        const usage = await getProjectUsage(id as string);
        if (usage.versions >= plan.version_limit) {
            return res.status(403).json({
                error: "Version limit reached",
                message: `Free plan is limited to ${plan.version_limit} versions. Upgrade to Pro for up to 20.`
            });
        }

        // Get project schema type to determine which parser to use
        const { data: project, error: projectErr } = await supabase
            .from('projects')
            .select('schema_type')
            .eq('id', id)
            .single();

        if (projectErr || !project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const schemaType = project.schema_type || 'sql';
        console.log(`[Schema Ingestion] Using parser for type: ${schemaType}`);

        // 1. Parse Schema using the appropriate parser
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
        const { data: latestVer } = await supabase
            .from('schema_versions')
            .select('version, schema_hash')
            .eq('project_id', id)
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle();

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

        // 5. Check Settings & Auto-Trigger
        const { data: settings } = await supabase.from('project_settings').select('*').eq('project_id', id).single();

        // Always generate explanations for fresh data
        generateAndSaveExplanations(id as string, nextVersion, result.schema).then(async (success) => {
            if (success && settings?.auto_generate_docs) {
                await generateDocumentation(id as string, nextVersion);
            }
        }).catch(err => {
            console.error('[Schema Ingestion] Background AI/Docs generation failed:', err);
        });

        // 6. Version Retention Logic
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

        await supabase.from('projects').update({ current_step: 'diagram' }).eq('id', id as string);

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
        const { id } = req.params;

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
        const { id } = req.params;
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

        await generateDocumentation(id!, version!);
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
 * PROJECT-SCOPED ROUTE: Compare Versions
 */
app.post('/projects/:id/compare', requireProjectContext, async (req, res) => {
    try {
        const { id } = req.params;
        const { from_version, to_version } = req.body;

        if (!from_version || !to_version) {
            return res.status(400).json({ error: "Both from_version and to_version are required" });
        }

        const { data: versions } = await supabase
            .from('schema_versions')
            .select('normalized_schema, version')
            .eq('project_id', id)
            .in('version', [from_version, to_version]);

        if (!versions || versions.length < 2) {
            return res.status(404).json({ error: "One or both versions not found" });
        }

        const vFrom = versions.find((v: any) => v.version === from_version);
        const vTo = versions.find((v: any) => v.version === to_version);

        const diff = compareSchemas(
            vFrom!.normalized_schema as NormalizedSchema,
            vTo!.normalized_schema as NormalizedSchema
        );

        res.json({ diff });
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
 * PROJECT-SCOPED ROUTE: Billing Status
 */
app.get('/projects/:id/billing', requireProjectContext, async (req, res) => {
    try {
        const { id } = req.params;
        const plan = await getProjectPlan(id as string);
        const usage = await getProjectUsage(id as string);
        res.json({ plan, usage, all_plans: DEFAULT_PLANS });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * PROJECT-SCOPED ROUTE: Upgrade (Mock)
 */
app.post('/projects/:id/billing/upgrade', requireProjectContext, async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_id } = req.body;
        if (!DEFAULT_PLANS[plan_id]) return res.status(400).json({ error: "Invalid plan" });

        await supabase.from('subscriptions').update({ status: 'expired' }).eq('project_id', id);
        await supabase.from('subscriptions').insert({
            project_id: id,
            plan_id: plan_id,
            status: 'active'
        });

        res.json({ success: true, message: `Successfully upgraded to ${plan_id}` });
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

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
