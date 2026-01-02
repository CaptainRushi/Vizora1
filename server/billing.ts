import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const sanitize = (val: string) => val.trim().replace(/^["']|["']$/g, '');
const supabaseUrl = sanitize(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '');
const supabaseKey = sanitize(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '');
const supabase = createClient(supabaseUrl, supabaseKey);

export interface Plan {
    id: string;
    name: string;
    project_limit: number;
    version_limit: number;
    ai_limit: 'limited' | 'full';
    export_enabled: boolean;
    designer_enabled: boolean;
    comments_enabled: boolean;
}

export const DEFAULT_PLANS: Record<string, Plan> = {
    free: {
        id: 'free',
        name: 'Free',
        project_limit: 1,
        version_limit: 2,
        ai_limit: 'limited',
        export_enabled: false,
        designer_enabled: false,
        comments_enabled: false
    },
    pro: {
        id: 'pro',
        name: 'Pro',
        project_limit: 5,
        version_limit: 20,
        ai_limit: 'full',
        export_enabled: true,
        designer_enabled: true,
        comments_enabled: false
    },
    teams: {
        id: 'teams',
        name: 'Teams',
        project_limit: 15,
        version_limit: 9999,
        ai_limit: 'full',
        export_enabled: true,
        designer_enabled: true,
        comments_enabled: true
    }
};

export async function getProjectPlan(projectId: string): Promise<Plan> {
    try {
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan_id')
            .eq('project_id', projectId)
            .eq('status', 'active')
            .maybeSingle();

        const planId = sub?.plan_id || 'free';
        return (DEFAULT_PLANS[planId] || DEFAULT_PLANS.free) as Plan;
    } catch (e) {
        return DEFAULT_PLANS.free as Plan;
    }
}

export async function getGlobalUsage() {
    // Current total projects
    const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    return { projectCount: count || 0 };
}

export async function incrementUsage(projectId: string, feature: 'ai_calls' | 'exports' | 'versions') {
    const { data: counter } = await supabase
        .from('usage_counters')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

    if (!counter) {
        await supabase.from('usage_counters').insert({
            project_id: projectId,
            [feature]: 1
        });
    } else {
        await supabase.from('usage_counters')
            .update({ [feature]: (counter[feature] || 0) + 1 })
            .eq('project_id', projectId);
    }
}

export async function getProjectUsage(projectId: string) {
    const { data: counter } = await supabase
        .from('usage_counters')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

    const { count: versions } = await supabase
        .from('schema_versions')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

    return {
        ai_calls: counter?.ai_calls || 0,
        exports: counter?.exports || 0,
        versions: versions || 0
    };
}
