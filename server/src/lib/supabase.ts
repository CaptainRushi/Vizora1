import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const sanitize = (val: string | undefined) => (val || '').trim().replace(/^["']|["']$/g, '');

const supabaseUrl = sanitize(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
const supabaseKey = sanitize(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseKey) {
    console.error("FATAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
