# Vizora - Project-Scoped Architecture

## 🎯 Core Principle

**"Create a project → paste schema → everything else appears."**

Vizora enforces a strict **project-first** architecture where all schema intelligence features exist ONLY within a project context.

---

## 🏗️ System Architecture

### Global Platform Structure (High Level)

```
Platform (Global Scope)
├── Projects (list & create)
├── Help / Docs
└── [No schema features visible]

Project (Project Scope)
├── Schema Input
├── ER Diagram
├── AI Explain
├── Auto Docs
├── Version History
├── Change Tracking
└── Project Settings
```

### The Hard Boundary

**Outside a Project:**
- ✅ View/create projects
- ✅ Access help documentation
- ❌ NO schema input
- ❌ NO diagrams
- ❌ NO AI features
- ❌ NO documentation

**Inside a Project:**
- ✅ All 4 core features unlocked
- ✅ Schema-scoped intelligence
- ✅ Version history
- ✅ Change tracking

---

## 📁 Project Creation Flow

### Step 1: Create Project
User provides:
- Project name
- Schema input type (SQL / Prisma / DDL)

Backend:
- Creates `projects` row
- Sets `current_step: 'schema'`
- Returns project ID

### Step 2: Enter Project Context
Once inside a project:
- Sidebar switches to project-scoped navigation
- Schema features become visible
- All operations tied to `project_id`

---

## 🧭 Navigation Structure

### Global Navigation (No Project Selected)

**Sidebar shows:**
- Projects (Manage all projects)
- Help / Docs

**Empty State Message:**
> "Select or create a project to access schema features"

### Project Navigation (Project Selected)

**Core Features:**
1. **Schema Input** - Paste your schema
2. **ER Diagram** - Visualize schema
3. **AI Explain** - Understand schema
4. **Auto Docs** - Generate docs

**History & Settings:**
- Version History
- Change Tracking
- Project Settings

**Quick Access:**
- All Projects (back to global view)

---

## 🔒 Backend Enforcement

### Middleware: `requireProjectContext`

All schema-related API endpoints enforce project context:

```typescript
const requireProjectContext = async (req, res, next) => {
    const projectId = req.params.id;
    
    if (!projectId) {
        return res.status(400).json({ 
            error: "Project context required",
            message: "All schema operations must be performed within a project"
        });
    }

    // Verify project exists
    const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();

    if (!project) {
        return res.status(404).json({ 
            error: "Project not found"
        });
    }

    next();
};
```

### Protected Routes

All these routes require `project_id`:

- `POST /projects/:id/schema` - Ingest schema
- `POST /projects/:id/diagram` - Generate diagram
- `POST /projects/:id/explanation` - AI explanations
- `POST /projects/:id/docs` - Generate documentation
- `GET /projects/:id/convert` - Convert schema format
- `GET /projects/:id/diff` - Schema diff
- `PUT /projects/:id/normalized-schema` - Update schema

### Global Routes

Only one schema-related route is global:

- `POST /projects` - Create new project

---

## 🎨 Frontend Implementation

### Route Structure

```typescript
// GLOBAL ROUTES - No project required
<Route path="/" element={<Navigate to="/projects" />} />
<Route path="/projects" element={<Projects />} />
<Route path="/help" element={<HelpDocs />} />

// PROJECT-SCOPED ROUTES - Require active project
<Route path="/project/input" element={<ProjectLayout><SchemaInput /></ProjectLayout>} />
<Route path="/project/diagram" element={<ProjectLayout><ERDiagrams /></ProjectLayout>} />
<Route path="/project/ai-explain" element={<ProjectLayout><AiExplanations /></ProjectLayout>} />
<Route path="/project/docs" element={<ProjectLayout><AutoDocs /></ProjectLayout>} />
```

### ProjectLayout Guard

The `ProjectLayout` component enforces project context:

```typescript
export function ProjectLayout({ children }) {
    const { projectId, loading } = useProject();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !projectId) {
            // No project selected - redirect to projects page
            navigate('/projects', { replace: true });
        }
    }, [projectId, loading, navigate]);

    if (!projectId) return null;
    return <>{children}</>;
}
```

### Context-Aware Sidebar

The sidebar dynamically changes based on project context:

```typescript
const { projectId } = useProject();
const inProjectContext = !!projectId;

{!inProjectContext ? (
    // Show: Projects, Help
    <GlobalNavigation />
) : (
    // Show: Core 4 + History + Settings
    <ProjectNavigation />
)}
```

---

## ✅ Why This Design is Correct

### From UX Perspective
- ✅ Reduces cognitive load
- ✅ Clear mental model
- ✅ Matches how developers think: project-first

### From Engineering Perspective
- ✅ Clean data isolation
- ✅ No orphan schemas
- ✅ Easy future auth / team access
- ✅ Prevents accidental cross-project data leaks

### From Business Perspective
- ✅ Projects become billable units
- ✅ Team plans map naturally
- ✅ Easier pricing enforcement later
- ✅ Clear usage metrics per project

---

## 🚀 User Journey

1. **Land on platform** → Redirected to `/projects`
2. **Create project** → Enter project name + schema type
3. **Enter project** → Sidebar shows 4 core features
4. **Paste schema** → Schema Input page
5. **Everything unlocks** → Diagram, AI Explain, Docs all available
6. **Version tracking** → Every schema change creates new version
7. **Switch projects** → Context switches, features remain scoped

---

## 📊 Data Flow

```
User creates project
    ↓
Project ID generated
    ↓
User pastes schema → schema_versions table (project_id)
    ↓
Diagram generated → diagram_states table (project_id)
    ↓
AI explains → schema_explanations table (project_id, version)
    ↓
Docs generated → documentation_outputs table (project_id, version)
```

**Every table has `project_id` as a foreign key.**

---

## 🔐 Security Implications

Future auth implementation will be straightforward:

```sql
-- Row Level Security (RLS) example
CREATE POLICY "Users can only access their own projects"
ON projects FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Users can only access schemas in their projects"
ON schema_versions FOR ALL
USING (
    project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
    )
);
```

---

## 📝 Summary

**The Rule:**
> No project = no schema intelligence.

**The Flow:**
> Create project → paste schema → everything appears.

**The Boundary:**
> `ProjectLayout` component + `requireProjectContext` middleware.

**The Result:**
> Clean, scalable, project-scoped architecture.

---

## 🛠️ Developer Notes

- Always check `projectId` exists before schema operations
- Use `ProjectLayout` wrapper for all schema-related pages
- Backend middleware automatically validates project existence
- Sidebar automatically adapts to project context
- All schema data is isolated by `project_id`

**This architecture is locked and should not be changed without careful consideration.**
