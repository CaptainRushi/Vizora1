import OpenAI from 'openai';
import { supabase } from '../lib/supabase.js';
import { NormalizedSchema } from '../../parser.js';
import { getWorkspaceIdFromProject } from '../utils/dbHelpers.js';
import { getAiAccessLevel } from '../../billing.js';

const SYSTEM_PROMPT = `You are a senior backend engineer and database architect.
Your task is to explain a database schema clearly and accurately.

Rules:
- Explain ONLY what is present in the schema.
- Do NOT invent tables, columns, or relationships.
- Do NOT guess business logic.
- Use plain English.
- Be concise but clear.
- Use developer-friendly language.`;

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY,
    defaultHeaders: {
        "HTTP-Referer": process.env.SITE_URL || "https://vizora.app",
        "X-Title": "Vizora Schema Intelligence",
    },
});

export async function generateAndSaveExplanations(projectId: string, versionNumber: number, schema: NormalizedSchema) {
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
