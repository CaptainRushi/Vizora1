# 🔒 Strict Workspace Model Implementation

## 🎯 Core Philosophy
**"The Workspace IS The Product."**

We have moved from a "feature list" model to a "strict workspace" model.
Every project opens in its own isolated environment with zero leakage.

## 📍 Routing Structure

| Path | Context | Access |
|---|---|---|
| `/projects` | **Global** | Project List, Create Project |
| `/help` | **Global** | Documentation |
| `/workspace/:id/schema-input` | **Workspace** | Schema Ingestion (Entry Point) |
| `/workspace/:id/er-diagram` | **Workspace** | Visualizer |
| `/workspace/:id/explanations` | **Workspace** | AI Analysis |
| `/workspace/:id/docs` | **Workspace** | Documentation |
| `/workspace/:id/versions` | **Workspace** | Time Travel |
| `/workspace/:id/changes` | **Workspace** | Diff View |
| `/workspace/:id/settings` | **Workspace** | Deletion / Config |

## 🛡️ Isolation Mechanisms

### 1. URL-Deiven State
The `projectId` is **strictly derived from the URL**.
- We do NOT rely on `localStorage` for state.
- We do NOT rely on "last active" for routing.
- If you share a URL (`/workspace/123/er-diagram`), the recipient lands in exactly that workspace.

### 2. Context-Aware Middleware
The `useProject` hook has been refactored to be **URL-Aware**:
```typescript
const match = matchPath('/workspace/:projectId/*', location.pathname);
const urlProjectId = match?.params.projectId;
```
This ensures that the application state ALWAYS matches the URL.

### 3. Sidebar Scope
The Sidebar now has two distinct modes:

**Global Mode** (on `/projects`):
- Branding only
- Global links (Dashboard, Help)

**Workspace Mode** (on `/workspace/:id/*`):
- **Project Header**: Name, Icon, Type (SQL/Prisma)
- **Scoped Navigation**: Only links relevant to THIS project
- **Context**: No way to accidentally interact with another project

## 🚀 User Flow

1. **Dashboard (`/projects`)**:
   - User sees list of projects.
   - User creates project -> Backend returns ID.
   - **Frontend redirects immediately** to `/workspace/:new_id/schema-input`.

2. **Inside Workspace**:
   - User pastes schema constraint.
   - Version 1 is created for `project_id`.
   - All subsequent tabs (Diagram, Explain) read from this workspace's state.

3. **Switching Context**:
   - User clicks "← All Projects".
   - App navigates to `/projects`.
   - Workspace state clears.
   - Total isolation.

## 🔒 Backend Enforcement

All tables and API endpoints enforce `project_id`.
- `schema_versions(project_id)`
- `diagram_states(project_id)`
- `schema_explanations(project_id)`

There is no "global schema pool". Every artifact belongs to a workspace.

## ✅ Verification

Verified that:
- Direct URL access works and loads correct project.
- Invalid URLs redirect to dashboard.
- Creating a project enters the workspace instantly.
- Sidebar links update dynamically based on current workspace.
