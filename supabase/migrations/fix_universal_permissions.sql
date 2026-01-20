-- Fix permission denied for universal_users and related tables
-- Run this in your Supabase SQL Editor

-- 1. Grant Permissions to authenticated and anon (fallback if service role key is missing/wrong)
GRANT ALL ON TABLE public.universal_users TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.universal_workspaces TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.billing_accounts TO authenticated, anon, service_role;

-- 2. Enable RLS (Good practice, but flexible for now)
ALTER TABLE public.universal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.universal_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_accounts ENABLE ROW LEVEL SECURITY;

-- 3. Create Permissive Policies (Since backend acts as admin, or user acts as self)
-- Universal Users
DROP POLICY IF EXISTS "Universal Users - View" ON universal_users;
DROP POLICY IF EXISTS "Universal Users - View Self" ON universal_users;
DROP POLICY IF EXISTS "Universal Users - Update Self" ON universal_users;
DROP POLICY IF EXISTS "Universal Users - Insert" ON universal_users;
DROP POLICY IF EXISTS "Universal Users - Insert Self" ON universal_users;

-- Allow reading yourself (or finding by username)
CREATE POLICY "Universal Users - View" ON universal_users FOR SELECT USING (true);
-- Allow updating yourself
CREATE POLICY "Universal Users - Update Self" ON universal_users FOR UPDATE USING (auth_user_id = auth.uid());
-- Allow inserting (backend might do this via RPC, but good to have)
CREATE POLICY "Universal Users - Insert" ON universal_users FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- Universal Workspaces
DROP POLICY IF EXISTS "Universal Workspaces - View" ON universal_workspaces;
DROP POLICY IF EXISTS "Universal Workspaces - Manage" ON universal_workspaces;
CREATE POLICY "Universal Workspaces - View" ON universal_workspaces FOR SELECT USING (true);
CREATE POLICY "Universal Workspaces - Manage" ON universal_workspaces FOR ALL USING (
    universal_id IN (
        SELECT universal_id FROM universal_users WHERE auth_user_id = auth.uid()
    )
);

-- Billing Accounts
DROP POLICY IF EXISTS "Billing - View" ON billing_accounts;
CREATE POLICY "Billing - View" ON billing_accounts FOR SELECT USING (true);
