# Vizora Backend Server - Setup & Verification Guide

## ✅ Current Status

Your backend server is **ALREADY RUNNING** on port **3001**.

---

## 📋 Quick Verification Checklist

### 1. Check if Server is Running

Open your browser or use curl:
```
http://localhost:3001/
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Vizora Backend Server Running",
  "version": "1.0.0",
  "timestamp": "2026-01-01T15:24:17.000Z",
  "port": 3001
}
```

### 2. Verify package.json

✅ **Your `package.json` is correctly configured:**

```json
{
  "name": "vizora-backend",
  "type": "module",
  "scripts": {
    "start": "tsx index.ts",
    "dev": "tsx watch index.ts"
  }
}
```

**Key Points:**
- ✅ `"start"` script exists
- ✅ `"type": "module"` for ES6 imports
- ✅ Using `tsx` for TypeScript execution

### 3. Verify Dependencies Installed

Run in `server/` directory:
```bash
npm list express cors dotenv
```

**Should show:**
```
vizora-backend@1.0.0
├── cors@2.8.5
├── dotenv@17.2.3
└── express@5.2.1
```

---

## 🚀 Server Commands

### Start Server (Production Mode)
```bash
cd server
npm start
```

### Start Server (Development Mode with Auto-Reload)
```bash
cd server
npm run dev
```

### Stop Server
Press `Ctrl + C` in the terminal

### Kill Server on Port (if stuck)
```bash
npx kill-port 3001
```

---

## 🔍 Health Check Endpoints

### Root Endpoint
```
GET http://localhost:3001/
```
Returns server status and version info.

### Test Project Creation
```bash
curl -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "schema_type": "sql"}'
```

---

## 📊 Server Architecture

```
server/
├── index.ts              ← Main server file
├── parser.ts             ← Schema parsing logic
├── package.json          ← Dependencies & scripts
├── .env                  ← Environment variables
└── tsconfig.json         ← TypeScript config
```

---

## 🔧 Environment Variables Required

Create `.env` file in `server/` directory:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration (for AI explanations)
OPENAI_API_KEY=your_openai_api_key

# Server Port (optional, defaults to 3001)
PORT=3001
```

---

## 🛠️ Common Issues & Fixes

### ❌ Error: `npm ERR! missing script: start`

**Cause:** No `start` script in `package.json`

**Fix:**
```json
"scripts": {
  "start": "tsx index.ts"
}
```

### ❌ Error: `Cannot find module 'express'`

**Cause:** Dependencies not installed

**Fix:**
```bash
cd server
npm install
```

### ❌ Error: `require is not defined`

**Cause:** Using `require()` with `"type": "module"`

**Fix:** Use ES6 imports:
```typescript
import express from 'express';  // ✅ Correct
// const express = require('express');  // ❌ Wrong
```

### ❌ Error: `PORT already in use`

**Cause:** Another process using port 3001

**Fix:**
```bash
# Option 1: Kill the port
npx kill-port 3001

# Option 2: Change port in .env
PORT=3002
```

### ❌ Error: `SUPABASE_URL is missing`

**Cause:** Missing environment variables

**Fix:** Create `.env` file with Supabase credentials

### ❌ Error: `dotenv.config is not a function`

**Cause:** Incorrect import

**Fix:**
```typescript
import dotenv from 'dotenv';
dotenv.config();
```

---

## 📡 API Endpoints

### Global Routes (No Project Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/projects` | Create new project |

### Project-Scoped Routes (Require `project_id`)

| Method | Endpoint | Description | Middleware |
|--------|----------|-------------|------------|
| POST | `/projects/:id/schema` | Ingest schema | ✅ `requireProjectContext` |
| POST | `/projects/:id/diagram` | Generate diagram | ✅ `requireProjectContext` |
| POST | `/projects/:id/explanation` | AI explanations | ✅ `requireProjectContext` |
| POST | `/projects/:id/docs` | Generate docs | ✅ `requireProjectContext` |
| GET | `/projects/:id/convert` | Convert schema | ✅ `requireProjectContext` |
| GET | `/projects/:id/diff` | Schema diff | ✅ `requireProjectContext` |
| PUT | `/projects/:id/normalized-schema` | Update schema | ✅ `requireProjectContext` |

---

## 🧪 Testing the Server

### 1. Health Check
```bash
curl http://localhost:3001/
```

### 2. Create Project
```bash
curl -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Database",
    "schema_type": "sql"
  }'
```

**Supported Schema Types:**
- `sql` - Raw SQL DDL statements
- `prisma` - Prisma schema definitions
- `drizzle` - Drizzle ORM schema definitions

### 3. Ingest Schema Examples

#### SQL Schema (requires project_id from step 2)
```bash
curl -X POST http://localhost:3001/projects/{PROJECT_ID}/schema \
  -H "Content-Type: application/json" \
  -d '{
    "raw_schema": "CREATE TABLE users (id INT PRIMARY KEY, name VARCHAR(255));"
  }'
```

#### Prisma Schema
```bash
curl -X POST http://localhost:3001/projects/{PROJECT_ID}/schema \
  -H "Content-Type: application/json" \
  -d '{
    "raw_schema": "model User {\n  id Int @id\n  name String\n}"
  }'
```

#### Drizzle Schema
```bash
curl -X POST http://localhost:3001/projects/{PROJECT_ID}/schema \
  -H "Content-Type: application/json" \
  -d '{
    "raw_schema": "export const users = pgTable(\"users\", {\n  id: integer(\"id\").primaryKey(),\n  name: text(\"name\").notNull()\n});"
  }'
```

---

## 📝 Server Logs

Your server logs should show:

```
Supabase client initialized successfully
Server running on http://localhost:3001
```

If you see errors, check:
1. `.env` file exists and has correct values
2. Supabase URL and key are valid
3. Port 3001 is not in use
4. Dependencies are installed

---

## 🔄 Restart Server

If you make changes to the code:

**Development Mode (auto-restart):**
```bash
npm run dev
```

**Production Mode (manual restart):**
```bash
# Stop: Ctrl + C
# Start:
npm start
```

---

## ✅ Verification Complete

Your server is correctly configured with:
- ✅ `npm start` script
- ✅ ES6 module support
- ✅ TypeScript execution via `tsx`
- ✅ Health check endpoint
- ✅ Project context enforcement
- ✅ All dependencies installed

**Server URL:** http://localhost:3001

**Status:** Running ✅
