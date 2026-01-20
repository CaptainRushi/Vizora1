
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    console.log('Sample Data Key Names:', data ? Object.keys(data[0] || {}) : 'No data');

    // Check if we can select display_name explicitly
    const { error: colError } = await supabase.from('users').select('display_name').limit(1);
    if (colError) {
        console.error('Column display_name error:', colError.message);
    } else {
        console.log('Column display_name exists!');
    }
}

checkColumns();
