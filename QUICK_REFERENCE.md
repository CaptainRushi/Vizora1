# Vizora - Quick Reference

## 🎯 The Golden Rule

```
NO PROJECT = NO SCHEMA FEATURES
```

## 📍 URL Structure

### Global Routes (Always Accessible)
```
/                    → Redirects to /projects
/projects            → Project list & creation
/help                → Help documentation
```

### Project Routes (Require Active Project)
```
/project/input       → Schema Input
/project/diagram     → ER Diagram
/project/ai-explain  → AI Explanations
/project/docs        → Auto Documentation
/project/history     → Version History
/project/changes     → Change Tracking
/project/settings    → Project Settings
```

## 🔄 User Flow

```
┌─────────────────┐
│  Land on Site   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  /projects      │  ← Global scope
│  (No features)  │
└────────┬────────┘
         │
         │ Click "Create Project"
         ▼
┌─────────────────┐
│  Create Modal   │
│  - Name         │
│  - Schema Type  │
└────────┬────────┘
         │
         │ Submit
         ▼
┌─────────────────┐
│ /project/input  │  ← Project scope
│ (Features ON)   │
└────────┬────────┘
         │
         │ Paste Schema
         ▼
┌─────────────────┐
│  All Features   │
│  Unlocked! 🎉   │
└─────────────────┘
```

## 🧩 Component Hierarchy

```
App
├── MainLayout
│   └── Sidebar (context-aware)
│       ├── Global Nav (no project)
│       └── Project Nav (has project)
│
└── Routes
    ├── Global Routes
    │   ├── /projects
    │   └── /help
    │
    └── Project Routes (wrapped in ProjectLayout)
        ├── /project/input
        ├── /project/diagram
        ├── /project/ai-explain
        └── /project/docs
```

## 🔒 Enforcement Points

### Frontend
- **ProjectLayout** component
  - Checks `projectId` from `useProject()` hook
  - Redirects to `/projects` if no project

### Backend
- **requireProjectContext** middleware
  - Validates `project_id` parameter
  - Returns 404 if project doesn't exist
  - Applied to all schema routes

## 📊 Data Model

```
projects
├── id (primary key)
├── name
├── schema_type
└── current_step

schema_versions
├── id
├── project_id (FK → projects.id)  ← SCOPED
├── version
├── raw_schema
└── normalized_schema

diagram_states
├── id
├── project_id (FK → projects.id)  ← SCOPED
└── diagram_json

schema_explanations
├── id
├── project_id (FK → projects.id)  ← SCOPED
├── version
└── content

documentation_outputs
├── id
├── project_id (FK → projects.id)  ← SCOPED
├── version
└── pdf_url
```

**Every schema-related table has `project_id`.**

## ⚡ Quick Commands

### Check if in project context
```typescript
const { projectId } = useProject();
if (!projectId) {
  // Redirect or show empty state
}
```

### Navigate to project feature
```typescript
navigate('/project/input');  // Will auto-redirect if no project
```

### Backend: Require project
```typescript
app.post('/projects/:id/schema', requireProjectContext, async (req, res) => {
  // project_id is validated
});
```

## 🎨 Sidebar States

### No Project Selected
```
┌─────────────────────┐
│ Vizora              │
├─────────────────────┤
│ 📁 Projects         │
│ ❓ Help / Docs      │
├─────────────────────┤
│ Select or create a  │
│ project to access   │
│ schema features     │
└─────────────────────┘
```

### Project Selected
```
┌─────────────────────┐
│ Vizora              │
├─────────────────────┤
│ CORE FEATURES       │
│ 💻 Schema Input     │
│ 🔗 ER Diagram       │
│ ✨ AI Explain       │
│ 📄 Auto Docs        │
├─────────────────────┤
│ HISTORY & SETTINGS  │
│ 🕐 Version History  │
│ 🔀 Change Tracking  │
│ ⚙️  Project Settings│
├─────────────────────┤
│ 📁 All Projects     │
└─────────────────────┘
```

## 🚫 What NOT to Do

❌ Don't create schema features outside projects
❌ Don't allow schema operations without `project_id`
❌ Don't show schema nav items when no project selected
❌ Don't create global schema state
❌ Don't bypass ProjectLayout for schema pages

## ✅ What TO Do

✅ Always wrap schema pages in `<ProjectLayout>`
✅ Always use `requireProjectContext` middleware
✅ Always check `projectId` before schema operations
✅ Always redirect to `/projects` when no project
✅ Always scope data by `project_id`

---

**Remember: Project-first, always.**
