
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log('Testing Supabase Connection...');
    console.log('URL:', supabaseUrl);

    const { data, error } = await supabase.from('users').select('*').limit(1);

    if (error) {
        console.error('Error fetching from users table:', error.message);
        if (error.message.includes('relation "users" does not exist')) {
            console.log('CRITICAL: Table "users" does not exist. Migration required.');
        }
    } else {
        console.log('Successfully connected and queried "users" table.');
        console.log('Data:', data);
    }
}

test();
