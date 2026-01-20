import express from 'express';
import crypto from 'crypto';
import { supabase } from '../lib/supabase.js';
import { requireProjectContext } from '../middleware/projectContext.js';
import { generateAndSaveExplanations } from '../services/aiService.js';
import { generateDocumentation } from '../services/docsService.js';
import { sendEmail } from '../services/emailService.js';
import {
    getOwnerIdFromProject,
    getWorkspaceIdFromProject,
    getOwnerIdFromWorkspace
} from '../utils/dbHelpers.js';
import {
    trackBetaUsage,
    BETA_MODE,
    BETA_PROJECT_LIMIT,
    BETA_VERSION_LIMIT
} from '../utils/betaTracker.js';
import {
    checkProjectLimit,
    checkVersionLimit,
    getWorkspacePlan,
    upgradeWorkspace
} from '../../billing.js';
import {
    parseSqlDeterministc,
    parsePrisma,
    parseDrizzle,
    generateSql,
    generatePrisma,
    generateDrizzle,
    compareSchemas,
    NormalizedSchema
} from '../../parser.js';

const router = express.Router();

const computeHash = (obj: any) => crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');

// --- ROUTES ---

/**
 * GLOBAL ROUTE: Create Project
 * This is the ONLY schema-related operation that doesn't require an existing project.
 * It creates the project container that all other operations depend on.
 */
router.post('/', async (req, res) => {
    try {
        const { name, schema_type, workspace_id, user_id } = req.body;

        if (!name || !schema_type || !workspace_id) {
            return res.status(400).json({ error: "Name, schema_type, and workspace_id required" });
        }

        // 1 & 2. Parallelize Owner lookup and Limit Checks
        const [ownerId, limitCheck] = await Promise.all([
            getOwnerIdFromWorkspace(workspace_id),
            checkProjectLimit(workspace_id)
        ]);

        if (!ownerId && user_id) {
            // Safe fallback if lookup fails
        } else if (!ownerId) {
            return res.status(404).json({ error: "Workspace owner not found" });
        }

        const finalOwnerId = ownerId || user_id;

        if (!limitCheck.allowed) {
            return res.status(403).json({
                error: "Plan Limit Reached",
                message: limitCheck.message
            });
        }

        // 3. BETA GUARD: Project Limit
        if (BETA_MODE) {
            const { count, error: countErr } = await supabase
                .from('projects')
                .select('*', { count: 'exact', head: true })
                .eq('owner_id', finalOwnerId);

            if (countErr) throw countErr;

            if (count !== null && count >= BETA_PROJECT_LIMIT) {
                return res.status(403).json({
                    error: "Private Beta Limit Reached",
                    message: "You can't create more than 2 projects during the private beta."
                });
            }
        }

        console.log("Creating project:", { name, schema_type, workspace_id, ownerId: finalOwnerId });

        // 4. ATOMIC DB INSERT
        const { data, error } = await supabase
            .from('projects')
            .insert({
                name,
                schema_type,
                current_step: 'schema',
                workspace_id,
                owner_id: finalOwnerId
            })
            .select()
            .single();

        if (error) {
            // Handle trigger exception
            if (error.message.includes('beta project limit')) {
                return res.status(403).json({
                    error: "Private Beta Limit Reached",
                    message: error.message
                });
            }
            throw error;
        }

        res.json(data);
    } catch (err: any) {
        console.error("[Project Creation] Failed:", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GLOBAL ROUTE: Delete Project
 * Performs a deep cleanup of all project-related data across all tables.
 * This is necessary because some database configurations might not have ON DELETE CASCADE.
 */
router.delete('/:id', async (req, res) => {
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
router.post('/:id/schema', requireProjectContext, async (req, res) => {
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
router.post('/:id/diagram', requireProjectContext, async (req, res) => {
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
router.post('/:id/explanation', requireProjectContext, async (req, res) => {
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
router.post('/:id/docs', requireProjectContext, async (req, res) => {
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
router.get('/:id/convert', requireProjectContext, async (req, res) => {
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
router.get('/:id/versions', requireProjectContext, async (req, res) => {
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
router.get('/:id/settings', requireProjectContext, async (req, res) => {
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
router.patch('/:id/settings', requireProjectContext, async (req, res) => {
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
router.post('/:id/compare', requireProjectContext, async (req, res) => {
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
router.put('/:id/normalized-schema', requireProjectContext, async (req, res) => {
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
 * PROJECT-SCOPED BILLING
 * Used by components like SchemaDesigner, ERDiagrams, and AutoDocs to check access.
 */
router.get('/:id/billing', async (req, res) => {
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

router.post('/:id/billing/unlock', async (req, res) => {
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

/**
 * PROJECT-SCOPED ROUTE: List Team Members & Invites
 */
router.get('/:id/team', requireProjectContext, async (req, res) => {
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
router.post('/:id/team/invite', requireProjectContext, async (req, res) => {
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
 * PROJECT-SCOPED ROUTE: Revoke/Delete Invite or Member
 */
router.delete('/:id/team/:type/:itemId', requireProjectContext, async (req, res) => {
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

export default router;
