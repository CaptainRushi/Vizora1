
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing keys");
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    console.log("Checking 'user_feedback' table...");
    const { data: userFeedback, error: err1 } = await supabase.from('user_feedback').select('*');
    if (err1) console.error("Error reading user_feedback:", err1);
    else console.log(`user_feedback rows: ${userFeedback?.length}`, userFeedback);

    console.log("\nChecking 'beta_feedback' table...");
    const { data: betaFeedback, error: err2 } = await supabase.from('beta_feedback').select('*');
    if (err2) console.error("Error reading beta_feedback:", err2);
    else console.log(`beta_feedback rows: ${betaFeedback?.length}`, betaFeedback);
}

check();
