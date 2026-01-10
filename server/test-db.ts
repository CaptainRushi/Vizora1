
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env from server dir and root
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("--- DB CONNECTION TEST ---");
console.log("URL:", url);
console.log("Service Key defined:", !!key);
console.log("Anon Key defined:", !!anonKey);

async function test() {
    let client;
    let mode;

    if (key) {
        console.log("Using Service Role Key");
        client = createClient(url!, key);
        mode = 'service';
    } else if (anonKey) {
        console.log("Using Anon Key (Expect Failure for Protected Tables)");
        client = createClient(url!, anonKey);
        mode = 'anon';
    } else {
        console.error("No keys found!");
        process.exit(1);
    }

    try {
        const { data, error } = await client.from('projects').select('id').limit(1);
        if (error) {
            console.error("Query Error:", error.message);
            console.error("Details:", error);
        } else {
            console.log("Query Success! Projects found:", data?.length);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

test();
