# 🗄️ Database Schema Overview

> Complete database schema documentation for the Vizora platform

---

## 📊 Entity Relationship Diagram

```mermaid
erDiagram
    profiles ||--o{ workspaces : "owns"
    profiles ||--o{ workspace_members : "belongs to"
    workspaces ||--o{ workspace_members : "has"
    workspaces ||--o{ projects : "contains"
    workspaces ||--|| workspace_billing : "has"
    workspaces ||--|| workspace_usage : "tracks"
    workspaces ||--o{ workspace_invites : "creates"
    workspaces ||--o{ payments : "logs"
    
    projects ||--o{ schema_versions : "has"
    projects ||--o{ diagram_states : "stores"
    projects ||--o{ schema_explanations : "generates"
    projects ||--o{ documentation_outputs : "produces"
    projects ||--o{ schema_changes : "tracks"
    projects ||--o{ schema_reviews : "analyzes"
    projects ||--o{ onboarding_guides : "creates"
    projects ||--|| project_settings : "configures"
    
    billing_plans ||--o{ workspace_billing : "defines"
    billing_plans ||--o{ payments : "charged for"
```

---

## 📁 Table Categories

```mermaid
mindmap
  root((Database))
    User Management
      profiles
      auth.users
    Workspaces
      workspaces
      workspace_members
      workspace_invites
    Billing
      billing_plans
      workspace_billing
      workspace_usage
      payments
    Projects
      projects
      project_settings
    Schema Data
      schema_versions
      schema_changes
      schema_explanations
      schema_reviews
      schema_comments
    Output Data
      diagram_states
      documentation_outputs
      generated_code
      onboarding_guides
    Analytics
      beta_usage
      user_feedback
      activity_logs
      ask_schema_logs
```

---

## 📋 Table Index

| Table | Category | Description |
|-------|----------|-------------|
| [[Profiles Table]] | Users | User profiles extending auth.users |
| [[Workspaces Table]] | Workspaces | Organization containers |
| [[Workspace Members Table]] | Workspaces | User-workspace associations |
| [[Projects Table]] | Projects | Schema project containers |
| [[Schema Versions Table]] | Schema | Immutable version history |
| [[Billing Plans Table]] | Billing | Plan definitions |
| [[Workspace Billing Table]] | Billing | Active subscriptions |
| [[Payments Table]] | Billing | Transaction logs |

---

## 🔐 Row Level Security

All tables have RLS enabled with policies based on:
- User ownership
- Workspace membership
- Admin privileges

```sql
-- Example RLS Policy
CREATE POLICY "Projects - View workspace projects" ON projects 
FOR SELECT USING (
    public.is_member_of(workspace_id) OR 
    (SELECT owner_id FROM workspaces WHERE id = workspace_id) = auth.uid()
);
```

---

## 📁 Related Notes

- [[Profiles Table]]
- [[Workspaces Table]]
- [[Projects Table]]
- [[Billing System]]

---

#database #schema #overview
