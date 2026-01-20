
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { error: usersError } = await supabase.from('users').select('*').limit(0);
    console.log('Users table exists:', !usersError);
    if (usersError) console.log('Users error:', usersError.message);

    const { error: profilesError } = await supabase.from('profiles').select('*').limit(0);
    console.log('Profiles table exists:', !profilesError);
    if (profilesError) console.log('Profiles error:', profilesError.message);
}

check();
