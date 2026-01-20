
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking "users" table schema...');

    // Query PostgREST's information_schema or just try to select everything
    const { data: columns, error } = await supabase.rpc('get_table_columns', { table_name: 'users' });

    if (error) {
        console.log('RPC get_table_columns failed, trying raw query...');
        const { data, error: queryError } = await supabase
            .from('users')
            .select('*')
            .limit(0);

        if (queryError) {
            console.error('Query Error:', queryError);
        } else {
            console.log('Successfully queried users table.');
        }
    } else {
        console.log('Columns:', columns);
    }
}

checkSchema();
