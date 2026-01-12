import { Router } from 'express';
import { getLatestNormalizedSchema, supabase } from '../services/schemaUtils.js';
import { analyzeSchema } from '../services/schemaAnalyzer.js';

const router = Router();

router.post('/review', async (req, res) => {
    try {
        const { project_id } = req.body;
        if (!project_id) {
            return res.status(400).json({ error: 'project_id is required' });
        }

        let schema, version;
        try {
            const result = await getLatestNormalizedSchema(project_id);
            schema = result.schema;
            version = result.version;
        } catch (err) {
            return res.json([]); // Return empty findings if no schema found
        }
        const findings = analyzeSchema(schema);

        // Optional: Cache findings
        await supabase.from('schema_reviews').upsert({
            project_id,
            version_number: version,
            findings,
            created_at: new Date().toISOString()
        }, { onConflict: 'project_id,version_number' }).select();

        res.json(findings);
    } catch (error: any) {
        console.error('[schemaReview Route] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
