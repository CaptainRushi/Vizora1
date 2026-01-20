import { supabase } from '../lib/supabase.js';

export const BETA_MODE = true;
export const BETA_PROJECT_LIMIT = 2;
export const BETA_VERSION_LIMIT = 4;
export const BETA_LABEL = "Private Beta";

export async function trackBetaUsage(userId: string | null | undefined, action: 'project' | 'version' | 'diagram' | 'docs') {
    if (!BETA_MODE || !userId) return;
    try {
        await supabase.rpc('increment_beta_usage', { u_id: userId, field: action });
    } catch (err: any) {
        console.warn(`[Beta Tracker] Failed to track ${action} for ${userId}:`, err.message);
    }
}
