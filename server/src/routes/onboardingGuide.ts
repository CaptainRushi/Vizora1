import { Router } from 'express';
import { getLatestNormalizedSchema, supabase } from '../services/schemaUtils.js';
import { generateTextAI } from '../services/aiClient.js';

const router = Router();

const ONBOARDING_SYSTEM_PROMPT = `You are generating an onboarding guide for a database.

Rules:
- Use ONLY the provided schema
- Do not assume business logic
- Be concise and technical
- Explain structure, not data
- Markdown format only.

Sections to include:
1. Overview of the database
2. Core tables (top 5 by connectivity/importance)
3. Key relationships (explain How tables link)
4. Data flow summary
5. Risky or potentially legacy areas (e.g. tables with many columns, missing keys)
6. Suggested reading order for a new dev`;

router.post('/onboarding-guide', async (req, res) => {
    try {
        const { project_id, force_refresh } = req.body;
        if (!project_id) {
            return res.status(400).json({ error: 'project_id is required' });
        }

        let schema: any, version: number;
        try {
            const result = await getLatestNormalizedSchema(project_id);
            schema = result.schema;
            version = result.version;
        } catch (err) {
            return res.json({
                state: "empty",
                reason: "no_schema"
            });
        }

        // --- CACHING LOGIC ---
        if (!force_refresh) {
            const { data: cached } = await supabase
                .from('onboarding_guides')
                .select('content')
                .eq('project_id', project_id)
                .eq('version_number', version)
                .maybeSingle();

            if (cached) {
                console.log(`[onboardingGuide] Cache HIT for project ${project_id} v${version}`);
                return res.json({ content: cached.content });
            }
        }

        console.log(`[onboardingGuide] Cache MISS. Generating for project ${project_id} v${version}`);
        const prompt = `Schema: \n${JSON.stringify(schema, null, 2)}`;

        const content = await generateTextAI(prompt, ONBOARDING_SYSTEM_PROMPT);

        // Save to DB
        await supabase.from('onboarding_guides').upsert({
            project_id,
            version_number: version,
            content,
            created_at: new Date().toISOString()
        }, { onConflict: 'project_id,version_number' });

        // ACTIVITY LOGGING
        if (req.body.user_id) {
            const { data: proj } = await supabase.from('projects').select('workspace_id, name').eq('id', project_id).single();
            if (proj) {
                const { logActivity } = await import('../services/activityLogger.js');
                await logActivity({
                    workspaceId: proj.workspace_id,
                    userId: req.body.user_id,
                    actionType: 'onboarding_guide_generated',
                    entityType: 'project', // or schema
                    entityName: proj.name,
                    metadata: { version_number: version }
                });
            }
        }

        res.json({ content });
    } catch (error: any) {
        console.error('[onboardingGuide Route] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
