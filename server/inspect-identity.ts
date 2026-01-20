
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('--- USERS ---');
    const { data: uData, error: uError } = await supabase.from('users').select('*').limit(1);
    if (uError) console.log('Users error:', uError.message);
    else console.log('Users columns:', uData.length > 0 ? Object.keys(uData[0]) : 'Empty table');

    console.log('\n--- PROFILES ---');
    const { data: pData, error: pError } = await supabase.from('profiles').select('*').limit(1);
    if (pError) console.log('Profiles error:', pError.message);
    else console.log('Profiles columns:', pData.length > 0 ? Object.keys(pData[0]) : 'Empty table');
}

inspect();
