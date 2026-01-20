
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(userId: string) {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    console.log('Profile for', userId, 'exists:', !!profile);

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    console.log('User for', userId, 'exists:', !!user);
}

// I need to get the user ID again
async function run() {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    if (users && users.length) {
        await checkUser(users[0].id);
    }
}

run();
