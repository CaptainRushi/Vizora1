import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRoles() {
    console.log('Updating all users to admin role...');
    const { data, error, count } = await supabase
        .from('users')
        .update({ role: 'admin' })
        .neq('role', 'admin');

    if (error) {
        console.error('Error updating roles:', error);
    } else {
        console.log(`Successfully updated user roles.`);
    }
}

fixRoles();
