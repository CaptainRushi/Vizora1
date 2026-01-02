import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupBilling() {
    console.log("Setting up billing tables...");

    // Normally this would be SQL, but I'll use RPC or check if I can just insert into potentially non-existent tables to trigger errors if they don't exist
    // Actually, I'll go ahead and assume I might need to provide a SQL snippet for the user to run in Supabase dashboard, 
    // but I can also try to manage metadata if I had the right permissions.

    // For now, I will create a plan definition map in the code and a route to fetch it.
    // I'll also try to detect if the tables exist.

    try {
        const { error: pErr } = await supabase.from('plans').select('id').limit(1);
        if (pErr) {
            console.log("Plans table might be missing. Please run the SQL schema in your Supabase SQL editor.");
            console.log(`
            CREATE TABLE plans (
              id text primary key,
              name text not null,
              price_inr int not null,
              project_limit int not null,
              version_limit int,
              ai_limit text, -- 'limited' or 'full'
              export_enabled boolean default false,
              designer_enabled boolean default false,
              comments_enabled boolean default false
            );

            CREATE TABLE subscriptions (
              id uuid primary key default gen_random_uuid(),
              project_id uuid references projects(id),
              plan_id text references plans(id),
              status text default 'active',
              started_at timestamptz default now(),
              expires_at timestamptz
            );

            CREATE TABLE usage_counters (
              project_id uuid primary key references projects(id),
              ai_calls int default 0,
              exports int default 0,
              versions int default 0
            );

            INSERT INTO plans (id, name, price_inr, project_limit, version_limit, ai_limit, export_enabled, designer_enabled, comments_enabled) VALUES
            ('free', 'Free', 0, 1, 2, 'limited', false, false, false),
            ('pro', 'Pro', 599, 5, 20, 'full', true, true, false),
            ('teams', 'Teams', 1999, 15, 9999, 'full', true, true, true);
            `);
        } else {
            console.log("Plans table exists. Ensuring data is correct...");
            const plans = [
                { id: 'free', name: 'Free', price_inr: 0, project_limit: 1, version_limit: 2, ai_limit: 'limited', export_enabled: false, designer_enabled: false, comments_enabled: false },
                { id: 'pro', name: 'Pro', price_inr: 599, project_limit: 5, version_limit: 20, ai_limit: 'full', export_enabled: true, designer_enabled: true, comments_enabled: false },
                { id: 'teams', name: 'Teams', price_inr: 1999, project_limit: 15, version_limit: 9999, ai_limit: 'full', export_enabled: true, designer_enabled: true, comments_enabled: true }
            ];
            for (const plan of plans) {
                await supabase.from('plans').upsert(plan);
            }
            console.log("Plans initialized.");
        }
    } catch (e) {
        console.error("Setup error:", e);
    }
}

setupBilling();
