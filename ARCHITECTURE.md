# Vizora Architecture Documentation

This document provides a high-level overview of the Vizora platform architecture, including system design, data flow, and key components.

## 1. System Overview

Vizora is a Schema Intelligence Platform that transforms database schemas into interactive diagrams, AI-powered documentation, and architectural insights. It is built as a modern web application with a decoupled frontend and backend, leveraging serverless database and authentication services.

### Core Capabilities
- **Schema Visualization:** Interactive ER diagrams generated from SQL, Prisma, or Drizzle schemas.
- **AI Intelligence:** Automated explanation of database structures at the database, table, and relationship levels.
- **Documentation:** Auto-generated Markdown and PDF documentation.
- **Collaboration:** Team-based workspaces with role-based access control.

## 2. Technology Stack

### Frontend (`/src`)
- **Framework:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **State Management:** React Context (Auth, Project)
- **Visualization:** React Flow (for diagrams), Dagre (for layout)
- **Editor:** Monaco Editor (for schema input)
- **Routing:** React Router DOM

### Backend (`/server`)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **AI Integration:** OpenAI API (GPT-4o-mini)
- **PDF Generation:** Puppeteer
- **Payment Processing:** Razorpay
- **Real-time:** Socket.IO (for collaboration)

### Infrastructure & Services
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth (JWT)
- **Storage:** Supabase Storage (for PDF artifacts)
- **Hosting:** Vercel (Frontend), Railway/Render (Backend)

## 3. Data Flow

1.  **User Authentication:** Users sign in via Supabase Auth. A JWT is issued and sent with API requests.
2.  **Schema Ingestion:**
    - User inputs schema (SQL/Prisma/Drizzle) in the Frontend.
    - Backend parses the schema into a `NormalizedSchema` JSON format.
    - Schema is hashed to detect changes and versioned in the database.
3.  **Visualization:**
    - The `NormalizedSchema` is converted into React Flow nodes and edges.
    - `dagre` algorithm calculates the layout.
4.  **Intelligence Generation:**
    - Backend sends schema chunks to OpenAI.
    - AI generates explanations for tables and relationships.
    - Explanations are stored in the `schema_explanations` table.
5.  **Documentation:**
    - Backend combines schema structure and AI explanations into Markdown.
    - Puppeteer renders the Markdown to HTML and prints to PDF.
    - PDF is uploaded to Supabase Storage.

## 4. Directory Structure

```
Vizora/
├── src/                        # Frontend Application
│   ├── components/             # Reusable UI components
│   ├── context/                # Global state (Auth, Project)
│   ├── layouts/                # Page layouts (Main, Project)
│   ├── lib/                    # Utilities (Supabase client)
│   ├── pages/                  # Route components
│   │   ├── Intelligence/       # AI-related pages
│   │   ├── Workspace/          # Workspace management
│   │   └── ...
│   └── ...
├── server/                     # Backend API
│   ├── src/
│   │   ├── routes/             # API Route handlers
│   │   ├── services/           # Business logic
│   │   ├── collaboration/      # Real-time logic
│   │   └── app.ts              # Express app setup
│   ├── index.ts                # Entry point & Legacy routes
│   ├── parser.ts               # Schema parsing logic
│   └── ...
├── supabase/                   # Database Configuration
│   └── migrations/             # SQL migrations
└── ...
```

## 5. Key Components

### Schema Parser (`server/parser.ts`)
A deterministic parser that converts raw schema strings (SQL, Prisma, Drizzle) into a standardized JSON format (`NormalizedSchema`). This ensures that the rest of the system (visualization, AI) works independently of the input format.

### AI Engine
Located in `server/index.ts` (scheduled for refactoring), this component orchestrates calls to OpenAI. It respects billing limits and "AI Access Levels" (DB-only, Table-level, or Full).

### Auto-Docs Engine
Generates comprehensive documentation. It merges structural data (columns, types) with semantic data (AI descriptions) to create useful artifacts.

## 6. Database Schema (Simplified)

- **workspaces:** Top-level container for teams.
- **projects:** Schemas belong to projects.
- **schema_versions:** Immutable history of schema changes.
- **schema_explanations:** AI-generated content linked to versions.
- **schema_changes:** Diff calculation between versions.
- **users:** Profiles (linked to Supabase Auth).

## 7. Security

- **RLS (Row Level Security):** Supabase RLS protects direct DB access.
- **API Security:** Backend verifies JWT tokens and checks Workspace/Project ownership before processing requests.
- **Payment Verification:** Razorpay signatures are verified server-side.

## 8. Deployment

- **Frontend:** Build with `npm run build` -> Static hosting.
- **Backend:** Build with `npm run build` -> Node.js server.
- **Env Variables:** Managed via `.env` files (see README.md).
