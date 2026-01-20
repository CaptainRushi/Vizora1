# Version Diff with "Edited By" Attribution

## Overview

This feature answers three questions at the same time:
1. **What changed** between versions?
2. **Who made each change**?
3. **Which version** introduced the change?

## Mental Model — IMPORTANT

This is **post-edit, version-based attribution**, NOT:
- Git blame
- Live presence
- Cursor tracking
- CRDT-based collaboration

Attribution is **commit-based** — when a user saves a version, they become the author of all changes in that version.

## Data Model

### 1. Schema Versions Table (Updated)
```sql
schema_versions (
  id uuid,
  workspace_id uuid,
  version_number int,
  code text,
  created_by uuid,
  created_by_username text,  -- ⚠️ SNAPSHOTTED at save time
  created_at timestamptz
)
```

> **Important**: `created_by_username` is snapshotted at save time. Do NOT rely on mutable usernames from other tables.

### 2. Schema Version Diffs Table (NEW)
```sql
schema_version_diffs (
  id uuid,
  workspace_id uuid,
  from_version int,
  to_version int,
  block_index int,
  block_start int,
  block_end int,
  change_type text, -- 'added' | 'modified' | 'removed'
  before_text text,
  after_text text,
  edited_by_user_id uuid,
  edited_by_username text,  -- ⚠️ SNAPSHOTTED
  created_at timestamptz
)
```

This table is the **source of truth** for attribution.

## Version Save Flow

When a user saves their schema:

```
Step 1 — Identify editor
editorUser = currentUser
snapshotUsername = identity.username || email.split('@')[0]

Step 2 — Compute diff
diffBlocks = diff(oldSchema, newSchema)

Step 3 — Store version with snapshotted username
INSERT INTO schema_versions (
  ...,
  created_by_username: snapshotUsername
)

Step 4 — Store diff blocks with attribution
FOR each diffBlock:
  INSERT INTO schema_version_diffs (
    ...,
    edited_by_username: snapshotUsername
  )
```

## Frontend UI

### Diff Block View Structure
```
Version 14 → Version 15

┌─────────────────────────────────────┐
│ [ MODIFIED ]  Lines 20–21           │
├─────────────────────────────────────┤
│ - user_id UUID NOT NULL             │
│ - status TEXT                       │
│ + user_id UUID PRIMARY KEY          │
│ + status TEXT DEFAULT 'active'      │
├─────────────────────────────────────┤
│ └── edited by @alex                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [ ADDED ]  Line 35                  │
├─────────────────────────────────────┤
│ + created_at TIMESTAMP              │
├─────────────────────────────────────┤
│ └── edited by @rushi                │
└─────────────────────────────────────┘
```

### UI Rules (Strict)
- "edited by" appears **per change block**
- Appears **below** the diff content
- Uses ASCII style: `└── edited by @username`
- No timestamps by default
- No avatars
- Muted gray color with indigo highlight for username

## Files Changed

### New Files
- `supabase/migrations/20260119_version_diff_attribution.sql` — Database migration
- `src/utils/versionDiff.ts` — Diff computation utilities
- `src/pages/Workspace/WorkspaceVersionCompareEnhanced.tsx` — Enhanced comparison UI

### Modified Files
- `src/pages/Workspace/types.ts` — Added `VersionDiffBlock` type and `created_by_username` field
- `src/pages/Workspace/WorkspaceEditor.tsx` — Save handler computes and stores diff blocks
- `src/pages/Workspace/WorkspaceVersionHistory.tsx` — Uses snapshotted username
- `src/App.tsx` — Uses enhanced version compare component

## Why This Works

- Multiple users may edit live
- Only one user commits the version
- That user becomes the author of changes in **that version**
- This mirrors how real teams reason about changes

## Edge Cases

### Multiple Blocks, Same User
Each block shows the same attribution:
```
└── edited by @alex
```

### Multiple Users in Same Version
If a version contains blocks edited by different users (from separate saves), each block shows its own attribution. This is expected and correct.

### Rollbacks
When a user restores an old version and saves it as new, they become the author of that new version's changes.

### Username Changes
Snapshotted usernames mean attribution remains stable even if a user later changes their username.

## Migration

Run the migration to add the new table and columns:
```bash
# Apply to Supabase
supabase db push
```

Or manually execute:
```sql
\i supabase/migrations/20260119_version_diff_attribution.sql
```
