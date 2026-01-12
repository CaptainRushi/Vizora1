import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function getLatestNormalizedSchema(projectId: string) {
    const { data, error } = await supabase
        .from('schema_versions')
        .select('normalized_schema, version')
        .eq('project_id', projectId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('[schemaUtils] Error fetching schema:', error);
        throw new Error('Failed to fetch latest schema');
    }

    return {
        schema: data.normalized_schema,
        version: data.version
    };
}

export async function getSchemaComments(projectId: string) {
    const { data, error } = await supabase
        .from('schema_comments')
        .select('entity_name, comment')
        .eq('project_id', projectId);

    if (error) {
        console.warn('[schemaUtils] Warning fetching comments:', error.message);
        return {};
    }

    return (data || []).reduce((acc: Record<string, string>, item: any) => {
        acc[item.entity_name] = item.comment;
        return acc;
    }, {});
}
