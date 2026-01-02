
import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = (envUrl && envUrl.trim().length > 0) ? envUrl.trim() : 'https://placeholder.supabase.co';
const supabaseAnonKey = (envKey && envKey.trim().length > 0) ? envKey.trim() : 'placeholder';

if (!envUrl || !envKey) {
    console.warn('WARNING: Supabase environment variables missing or empty. App will render but API calls will fail.');
}

let client;
try {
    client = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
    console.error('Supabase Client Init Error:', error);
    console.error('Attempted URL:', supabaseUrl);
    // Fallback to prevent app crash
    client = createClient('https://placeholder.supabase.co', 'placeholder');
}

export const supabase = client;
