# Single Source of Truth Schema

I have consolidated the entire database schema into a single file:  
`supabase/schema.sql`

This file contains **everything** needed to recreate the Vizora database from scratch, including:
- **Core Entities**: Profiles, Workspaces, Projects
- **Billing System**: Plans, Payments, Usage, Expiry logic
- **Features**: Versions, Diagrams, Code, Docs, AI Explanations
- **Security**: Complete Row Level Security (RLS) policies
- **Automation**: Triggers for new projects and workspaces

## How to Apply This Schema

### 1. For a Fresh Start (Reset Database)
If you want to completely wipe the database and start fresh with this clean schema:

1. Go to Supabase Dashboard > SQL Editor
2. Run:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```
3. Copy the content of `supabase/schema.sql`
4. Paste into SQL Editor and Run.

### 2. For Reference
Use this file as the definitive reference for:
- Table relationships
- Column types
- RLS policy logic
- Billing plan definitions

## Key Features in This Schema
- **Workspace-First**: All projects belong to workspaces.
- **Cascade Deletes**: Deleting a workspace deletes all its projects and billing data.
- **Secure by Default**: RLS policies ensure users only access their own data.
- **One-Time Billing**: Optimized for the non-subscription billing model.
