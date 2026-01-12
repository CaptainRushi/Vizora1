import { Router } from 'express';
import { getLatestNormalizedSchema, getSchemaComments, supabase } from '../services/schemaUtils.js';
import { askAI } from '../services/aiClient.js';

const router = Router();

const ASK_SCHEMA_SYSTEM_PROMPT = `You are a schema-constrained database assistant.

Rules:
- You may ONLY answer using the provided schema context.
- You must NOT assume business logic or data behavior.
- Every answer MUST include:
  - schema_version
  - referenced_tables
  - referenced_columns
  - relationships_used
- If the answer cannot be determined from the schema, say so explicitly.
- Do NOT give general advice.
- Do NOT guess.`;

router.post('/ask', async (req, res) => {
    try {
        const { project_id, question } = req.body;
        if (!project_id || !question) {
            return res.status(400).json({ error: 'project_id and question are required' });
        }

        // STEP 1: LOAD AUTHORITATIVE CONTEXT
        let schema, version;
        try {
            const result = await getLatestNormalizedSchema(project_id);
            schema = result.schema;
            version = result.version;
        } catch (err) {
            return res.status(400).json({
                error: 'No schema found',
                answer: "I couldn't find a schema for this project. Please go to the 'Schema Input' page and save your schema first.",
                confidence: 'low',
                referenced_tables: []
            });
        }

        const comments = await getSchemaComments(project_id);

        // STEP 2: BUILD A STRICT CONTEXT OBJECT
        const contextObj = {
            schema_version: version,
            tables: Object.fromEntries(
                Object.entries(schema.tables).map(([name, table]: [string, any]) => [
                    name,
                    {
                        columns: Object.keys(table.columns),
                        relations: (table.relations || []).map((r: any) => `${r.from} -> ${r.to}`)
                    }
                ])
            ),
            intent_notes: comments
        };

        const systemPrompt = `${ASK_SCHEMA_SYSTEM_PROMPT}\n\nSchema Context:\n${JSON.stringify(contextObj, null, 2)}`;

        // STEP 4: ASK AI
        const aiResponse = await askAI(question, systemPrompt);

        // STEP 5: SERVER-SIDE VALIDATION
        const validatedResponse = { ...aiResponse };
        const availableTables = Object.keys(schema.tables);

        // Basic check for tables
        if (aiResponse.referenced_tables && Array.isArray(aiResponse.referenced_tables)) {
            const invalidTables = aiResponse.referenced_tables.filter((t: string) => !availableTables.includes(t));
            if (invalidTables.length > 0) {
                validatedResponse.confidence = 'low';
                validatedResponse.answer = "The schema does not provide enough information to answer this reliably (AI referenced non-existent tables).";
            }
        }

        // Ensure schema version matches
        validatedResponse.schema_version = version;

        // Logging
        await supabase.from('ask_schema_logs').insert({
            project_id,
            schema_version: version,
            question,
            referenced_tables: validatedResponse.referenced_tables || [],
            created_at: new Date().toISOString()
        });

        res.json(validatedResponse);
    } catch (error: any) {
        console.error('[askSchema Route] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
