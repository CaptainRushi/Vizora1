# Live Collaborative Workspaces - Implementation Plan

## Overview
This document outlines the implementation plan for real-time collaborative editing in Vizora workspaces using Socket.IO + Yjs for document synchronization.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client 1      │◄───►│   Socket.IO     │◄───►│   Client 2      │
│   (Monaco)      │     │   Server        │     │   (Monaco)      │
│   + Yjs         │     │   + Yjs         │     │   + Yjs         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │   Supabase      │
                        │   (Persistence) │
                        └─────────────────┘
```

## Implementation Phases

### Phase 1: Server Setup (Socket.IO + Yjs)
- [ ] Install dependencies: `socket.io`, `yjs`, `y-socket.io`
- [ ] Create `collaboration.ts` module for Socket.IO server
- [ ] Integrate with existing Express server
- [ ] Workspace room management
- [ ] Authentication via JWT tokens

### Phase 2: Document Synchronization
- [ ] Yjs document per workspace
- [ ] Sync with existing code on connection
- [ ] Auto-save to Supabase periodically
- [ ] Conflict-free merging with CRDT

### Phase 3: Presence System
- [ ] Track active users per workspace
- [ ] Broadcast join/leave events
- [ ] User status: active, idle, viewing
- [ ] Presence indicators in UI

### Phase 4: Cursor Synchronization
- [ ] Share cursor positions
- [ ] Color-coded cursors per user
- [ ] Username labels on cursors
- [ ] Selection highlighting

### Phase 5: Frontend Integration
- [ ] Update WorkspaceEditor with collaboration
- [ ] Presence panel component
- [ ] Live cursor rendering
- [ ] Connection status indicators

### Phase 6: Versioning Integration
- [ ] Save creates immutable version
- [ ] "Collaborative session" flag
- [ ] Author attribution

---

## File Structure

```
server/
├── src/
│   ├── collaboration/
│   │   ├── index.ts           # Main Socket.IO setup
│   │   ├── workspace-room.ts  # Room management
│   │   ├── presence.ts        # User presence tracking
│   │   └── auth.ts            # Socket authentication
│   └── ...
└── ...

src/
├── hooks/
│   ├── useCollaboration.ts    # Main collaboration hook
│   ├── usePresence.ts         # Presence tracking
│   └── useCursors.ts          # Cursor synchronization
├── components/
│   ├── collaboration/
│   │   ├── PresencePanel.tsx  # Who's online
│   │   ├── ActiveCursor.tsx   # Remote cursor display
│   │   └── ConnectionStatus.tsx
│   └── ...
└── ...
```

---

## Database Schema

```sql
-- Track presence (ephemeral, for fallback/analytics)
CREATE TABLE IF NOT EXISTS workspace_presence (
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    status TEXT CHECK (status IN ('active', 'idle', 'viewing')) DEFAULT 'active',
    cursor_position JSONB,
    PRIMARY KEY (workspace_id, user_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_workspace_presence_workspace 
ON workspace_presence(workspace_id);
```

---

## Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `workspace:join` | `{ workspaceId, token }` | Join workspace room |
| `workspace:leave` | `{ workspaceId }` | Leave workspace room |
| `workspace:update` | `{ delta }` | Yjs update (CRDT) |
| `workspace:cursor` | `{ position, selection }` | Cursor position |
| `workspace:save` | `{ message }` | Save new version |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `workspace:sync` | `{ state }` | Initial document state |
| `workspace:update` | `{ delta, userId }` | Broadcast update |
| `workspace:presence` | `{ users }` | Current users list |
| `workspace:cursor` | `{ userId, position }` | Remote cursor |
| `workspace:saved` | `{ version }` | Version saved confirmation |

---

## Security Rules

1. **Socket Authentication**
   - Verify JWT on connection
   - Validate workspace membership
   - Check role permissions

2. **Permission Enforcement**
   - Owner/Admin/Editor: Can edit
   - Viewer: Read-only, can see changes
   - All permissions checked server-side

3. **Rate Limiting**
   - Max 10 editors per workspace
   - Throttle cursor events (50ms)
   - Batch updates (100ms debounce)

---

## Dependencies to Install

### Server
```json
{
  "socket.io": "^4.7.0",
  "yjs": "^14.0.0",
  "y-protocols": "^1.0.0"
}
```

### Client
```json
{
  "socket.io-client": "^4.7.0",
  "yjs": "^14.0.0",
  "y-monaco": "^0.1.0"
}
```

---

## Next Steps

1. Install server dependencies
2. Create collaboration server module
3. Integrate with Express
4. Create frontend hooks
5. Update WorkspaceEditor
6. Test with multiple users
