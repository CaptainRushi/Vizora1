# Live Collaboration Session (Editor + Chat)

## Overview

The Live Collaboration Session is a tightly coupled system that integrates **real-time collaborative editing** with **ephemeral chat**. This feature ensures that chat exists only to support the live editing experience and automatically disappears when the session ends.

## Core Concept (Non-Negotiable)

- **Chat and live editing are the same session**
- There is no independent chat session
- If no one is live editing → chat does not exist
- If live editing session ends → chat is destroyed
- Chat is **purposeful**, **contextual**, and **never abused as a messaging system**

## Session Definition

A "Live Collaboration Session" exists when:
- ≥1 user has the workspace editor open
- Live editing is active

### Session Includes:
- Shared document state (Yjs CRDT)
- Live cursors & presence
- Live chat messages

### Session Ends When:
- Last user disconnects, OR
- Workspace idle timeout (10 minutes)

### On End:
- Editor state resets to last saved version
- Chat memory is wiped completely

## Architecture

```
┌──────────────────────────────────────┐
│ Monaco Editor (Live)                 │
│                                      │
│                                      │
│                           ┌──────────┐
│                           │ Live     │
│                           │ Chat     │
│                           └──────────┘
└──────────────────────────────────────┘
```

### Technology Stack
- **Backend**: Node.js + Express
- **Realtime**: Socket.IO WebSockets
- **Editor**: Monaco Editor
- **Collab Engine**: Yjs (CRDT)
- **Persistence**: ❌ No DB storage for chat

## Chat Visibility Rules

| State | Chat |
|-------|------|
| User editing live | ✅ Visible |
| User viewing live edits | ✅ Visible (read-only if viewer) |
| No live session | ❌ Hidden |
| Workspace closed | ❌ Destroyed |

- ❌ No manual toggle
- ❌ No persistent history

## Live-Aware Chat Behavior

### 1. Chat is Aware of Live Editing State

Each message automatically knows:
- Current schema version base
- Whether code is being modified
- Who is currently typing

The UI shows: **"Live editing · Based on v14"** above the input.

### 2. Chat Messages Auto-Attach Edit Context

If user has cursor inside a table or has selected lines, the message automatically includes:

```typescript
context: {
  table: "orders",
  line_range: [42, 47],
  live_session: true
}
```

User does not manually add context.

### 3. Chat Highlights Live Changes

When hovering a message that refers to:
- A table
- A line range

The code is temporarily highlighted and shows the live cursor owner if applicable.

## Message Model

```typescript
{
  id: string,
  sender: {
    id: uuid,
    name: string,
    color: string
  },
  text: string,
  context: {
    table?: string,
    line_range?: [number, number]
  },
  live_editing: true,
  timestamp: number
}
```

- ❌ No attachments
- ❌ No markdown
- ❌ No long messages (500 char limit)

## Reactions (Edit-Intent Only)

| Symbol | Meaning |
|--------|---------|
| ✅ | Change confirmed |
| ⚠️ | Risky change |
| ❓ | Clarify |
| 🔍 | Review needed |
| 🚫 | Stop / revert |
| 🧠 | Design insight |

Rules:
- One reaction per user per message
- Reactions are small semantic badges
- ❌ No emoji picker

## Chat + Versioning Bridge

When user clicks **Save Version**:
1. Show recent chat messages (last 2–3)
2. Allow Owner/Admin to select one
3. Selected message becomes version note

This converts **live discussion → permanent context** without storing chat history.

## Permissions

| Role | Live Edit | Chat | React |
|------|-----------|------|-------|
| Owner | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ✅ |
| Viewer | ❌ | 👀 Read-only | ❌ |

## Realtime Events

```
session:join
session:leave
editor:update
editor:cursor
chat:message
chat:reaction
chat:typing
session:end
```

Chat events are valid only while session is active.

## Implementation Files

### Backend
- `server/src/collaboration/index.ts` - Socket.IO server with Yjs, presence, chat

### Frontend
- `src/hooks/useCollaboration.ts` - WebSocket client hook
- `src/context/CollaborationContext.tsx` - React context provider
- `src/components/chat/WorkspaceChat.tsx` - Chat UI component
- `src/components/chat/WorkspaceChatWrapper.tsx` - Chat wrapper
- `src/pages/Workspace/WorkspaceEditor.tsx` - Editor with integrated chat

## What NOT to Add

- ❌ Async chat
- ❌ Chat history
- ❌ Threads
- ❌ Mentions
- ❌ Notifications
- ❌ Bots
- ❌ Emojis (only reactions)
- ❌ File sharing

## Acceptance Criteria

- ✅ Chat exists only during live editing
- ✅ Chat is destroyed after session ends
- ✅ Chat window is inside editor (right corner)
- ✅ Messages are context-aware
- ✅ Chat reflects live state
- ✅ No DB storage
- ✅ Viewer is read-only
- ✅ Chat enhances editing, not distracts
- ✅ Typing indicators for real-time feedback
- ✅ 10-minute idle timeout for session cleanup
