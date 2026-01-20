/**
 * Vizora Live Collaboration Server
 * Real-time collaborative editing for workspaces using Socket.IO + Yjs
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import * as Y from 'yjs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types
interface User {
    id: string;
    email: string;
    username?: string;
    role: 'owner' | 'admin' | 'member' | 'editor' | 'viewer';
    color: string;
}

interface CursorPosition {
    lineNumber: number;
    column: number;
}

interface SelectionRange {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
}

interface UserPresence extends User {
    status: 'active' | 'idle' | 'viewing';
    cursor?: CursorPosition;
    selection?: SelectionRange;
    lastActive: number;
}

// --- FEATURE: EDIT ATTRIBUTION (PERSISTENT) ---
export interface BlockAttribution {
    blockId: string;
    startLine: number;
    endLine: number;
    lastEditorId: string;
    lastEditorName: string;
    updatedAt: number;
}

interface WorkspaceRoom {
    id: string;
    doc: Y.Doc;
    users: Map<string, UserPresence>;
    blockAttributions: Map<string, BlockAttribution>;
    lastSaved: number;
    isDirty: boolean;
    messages: ChatMessage[];
}

// Color palette for user cursors
const CURSOR_COLORS = [
    '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
    '#2196F3', '#00BCD4', '#009688', '#4CAF50',
    '#8BC34A', '#FF9800', '#FF5722', '#795548'
];

class CollaborationServer {
    private io: Server;
    private supabase: SupabaseClient;
    private rooms: Map<string, WorkspaceRoom> = new Map();
    private userColors: Map<string, string> = new Map();
    private colorIndex = 0;

    constructor(httpServer: HttpServer, supabase: SupabaseClient) {
        this.supabase = supabase;
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:5173',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        this.setupHandlers();
        // this.startCleanupInterval(); // Removed as presence logic is removed

        console.log('[Collaboration] Server initialized');
    }

    private getUserColor(userId: string): string {
        if (!this.userColors.has(userId)) {
            const color = CURSOR_COLORS[this.colorIndex % CURSOR_COLORS.length] ?? CURSOR_COLORS[0] ?? '#6366f1';
            this.userColors.set(userId, color);
            this.colorIndex++;
            return color;
        }
        return this.userColors.get(userId) ?? CURSOR_COLORS[0] ?? '#6366f1';
    }

    private async validateToken(token: string): Promise<User | null> {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser(token);
            if (error || !user || !user.email) return null;

            // Try to get profile from database for better identity resolution
            const { data: profile } = await this.supabase
                .from('users')
                .select('username, display_name')
                .eq('id', user.id)
                .maybeSingle();

            const username = profile?.username ? `@${profile.username}` : (profile?.display_name || user.user_metadata?.username);

            return {
                id: user.id,
                email: user.email,
                username: username,
                role: 'viewer', // Default
                color: this.getUserColor(user.id)
            };
        } catch (err) {
            console.error('[Collaboration] Token validation error:', err);
            return null;
        }
    }

    private async getUserRole(userId: string, workspaceId: string): Promise<'owner' | 'admin' | 'member' | 'editor' | 'viewer'> {
        // Check if owner
        const { data: workspace } = await this.supabase
            .from('workspaces')
            .select('owner_id')
            .eq('id', workspaceId)
            .single();

        if (workspace?.owner_id === userId) {
            return 'owner';
        }

        // Check membership
        const { data: member } = await this.supabase
            .from('workspace_members')
            .select('role')
            .eq('workspace_id', workspaceId)
            .eq('user_id', userId)
            .single();

        // Database uses 'admin' and 'member' roles, handle both 'member' and legacy 'editor'
        return (member?.role as 'admin' | 'member' | 'editor' | 'viewer') || 'viewer';
    }

    private async getOrCreateRoom(workspaceId: string): Promise<WorkspaceRoom> {
        if (this.rooms.has(workspaceId)) {
            return this.rooms.get(workspaceId)!;
        }

        // Create new Yjs document
        const doc = new Y.Doc();
        const text = doc.getText('code');

        // Load latest version from database
        const { data: version } = await this.supabase
            .from('schema_versions')
            .select('code, raw_schema')
            .eq('workspace_id', workspaceId)
            .order('version_number', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (version) {
            const code = version.code || version.raw_schema || '';
            text.insert(0, code);
        }

        // Load block attributions from database
        const { data: attributions } = await this.supabase
            .from('code_block_attributions')
            .select('*')
            .eq('workspace_id', workspaceId);

        const attributionMap = new Map<string, BlockAttribution>();
        if (attributions) {
            attributions.forEach((a: any) => {
                attributionMap.set(a.block_id, {
                    blockId: a.block_id,
                    startLine: a.start_line,
                    endLine: a.end_line,
                    lastEditorId: a.last_editor_id,
                    lastEditorName: a.last_editor_name,
                    updatedAt: new Date(a.updated_at).getTime()
                });
            });
        }

        const room: WorkspaceRoom = {
            id: workspaceId,
            doc,
            users: new Map(),
            blockAttributions: attributionMap,
            lastSaved: Date.now(),
            isDirty: false,
            messages: []
        };

        this.rooms.set(workspaceId, room);
        return room;
    }

    private setupHandlers(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log(`[Collaboration] Client connected: ${socket.id}`);

            let currentUser: User | null = null;
            let currentWorkspaceId: string | null = null;

            // Handle workspace join
            socket.on('workspace:join', async (data: { workspaceId: string; token: string }) => {
                try {
                    const { workspaceId, token } = data;

                    // Validate user
                    const user = await this.validateToken(token);
                    if (!user) {
                        socket.emit('error', { message: 'Authentication failed' });
                        return;
                    }

                    // Get role for this workspace
                    const role = await this.getUserRole(user.id, workspaceId);
                    user.role = role;

                    currentUser = user;
                    currentWorkspaceId = workspaceId;

                    // Get or create room
                    const room = await this.getOrCreateRoom(workspaceId);

                    // Check editor limit (max 10) - includes 'member' role which has edit permissions
                    const editorsCount = Array.from(room.users.values())
                        .filter(u => ['owner', 'admin', 'member', 'editor'].includes(u.role)).length;

                    if (editorsCount >= 10 && ['owner', 'admin', 'member', 'editor'].includes(role)) {
                        socket.emit('error', { message: 'Maximum editors reached (10). Try again later.' });
                        return;
                    }

                    // Add user to room
                    const presence: UserPresence = {
                        ...user,
                        status: 'active',
                        lastActive: Date.now()
                    };
                    room.users.set(user.id, presence);

                    // Join socket room
                    socket.join(workspaceId);

                    console.log(`[Collaboration] ${user.email} joining room ${workspaceId.slice(0, 8)}... (${room.users.size} users now in room)`);

                    // Send initial sync
                    const text = room.doc.getText('code');
                    socket.emit('workspace:sync', {
                        content: text.toString(),
                        users: Array.from(room.users.values()),
                        blockAttributions: Array.from(room.blockAttributions.values()),
                        role: user.role,
                        canEdit: ['owner', 'admin', 'member', 'editor'].includes(role)
                    });

                    console.log(`[Collaboration] Sent sync to ${user.email}: ${text.length} chars, ${room.users.size} users, role=${role}, canEdit=${['owner', 'admin', 'member', 'editor'].includes(role)}`);

                    // Send chat history
                    socket.emit('chat:history', { messages: room.messages });

                    // Broadcast user update to others
                    this.broadcastUsers(room);

                    console.log(`[Collaboration] ${user.email} joined ${workspaceId} as ${role}`);

                } catch (err) {
                    console.error('[Collaboration] Join error:', err);
                    socket.emit('error', { message: 'Failed to join workspace' });
                }
            });

            // --- CHAT HANDLERS ---
            socket.on('chat:send', (data: { content: any; context?: any }) => {
                if (!currentUser || !currentWorkspaceId) return;
                const room = this.rooms.get(currentWorkspaceId);
                if (!room) return;

                // Validate content
                if (!data.content || !data.content.value) return;

                const message: ChatMessage = {
                    id: Math.random().toString(36).substring(2, 11),
                    sender: {
                        id: currentUser.id,
                        name: currentUser.username || (currentUser.email.split('@')[0]) || 'Unknown',
                        color: currentUser.color,
                        role: currentUser.role
                    },
                    content: {
                        type: data.content.type || 'text',
                        value: data.content.value
                    },
                    context: {
                        ...data.context,
                        live_editing: true,
                        is_dirty: room.isDirty
                    },
                    reactions: [],
                    timestamp: Date.now()
                };

                room.messages.push(message);

                // Broadcast to all
                this.io.to(currentWorkspaceId).emit('chat:message', message);
            });

            socket.on('chat:react', (data: { messageId: string; emoji: string }) => {
                if (!currentUser || !currentWorkspaceId) return;
                const room = this.rooms.get(currentWorkspaceId);
                if (!room) return;

                const message = room.messages.find(m => m.id === data.messageId);
                if (!message) return;

                // Prevent duplicates per user
                const existingReaction = message.reactions.find(
                    r => r.userId === currentUser!.id && r.emoji === data.emoji
                );

                if (existingReaction) {
                    // Toggle off
                    message.reactions = message.reactions.filter(r => r !== existingReaction);
                } else {
                    message.reactions.push({
                        emoji: data.emoji,
                        userId: currentUser.id,
                        timestamp: Date.now()
                    });
                }

                // Broadcast update
                this.io.to(currentWorkspaceId).emit('chat:reaction_update', {
                    messageId: message.id,
                    reactions: message.reactions
                });
            });

            socket.on('chat:promote', async (data: { messageId: string }) => {
                if (!currentUser || !currentWorkspaceId) return;

                // Only Owner/Admin can promote
                if (!['owner', 'admin'].includes(currentUser.role)) {
                    socket.emit('error', { message: 'Only admins can promote to intent' });
                    return;
                }

                const room = this.rooms.get(currentWorkspaceId);
                if (!room) return;

                const message = room.messages.find(m => m.id === data.messageId);
                if (!message) return;

                // Mark promoted
                message.isPromoted = true;

                this.io.to(currentWorkspaceId).emit('chat:message_update', message);
            });

            // Handle document updates
            socket.on('workspace:update', (data: { content: string }) => {
                if (!currentUser || !currentWorkspaceId) {
                    console.log('[Collaboration] Update rejected: no user or workspace');
                    return;
                }

                const room = this.rooms.get(currentWorkspaceId);
                if (!room) {
                    console.log('[Collaboration] Update rejected: room not found');
                    return;
                }

                // Check edit permission - includes 'member' role which has edit access
                if (!['owner', 'admin', 'member', 'editor'].includes(currentUser.role)) {
                    console.log(`[Collaboration] Update rejected: ${currentUser.email} has role ${currentUser.role}`);
                    socket.emit('error', { message: 'No edit permission' });
                    return;
                }

                console.log(`[Collaboration] Content update from ${currentUser.email}, broadcasting to room ${currentWorkspaceId.slice(0, 8)}...`);

                // Update Yjs doc
                const text = room.doc.getText('code');
                room.doc.transact(() => {
                    text.delete(0, text.length);
                    text.insert(0, data.content);
                });

                room.isDirty = true;

                // Broadcast to other users
                socket.to(currentWorkspaceId).emit('workspace:update', {
                    content: data.content,
                    userId: currentUser.id,
                    username: currentUser.username || (currentUser.email.split('@')[0])
                });

                console.log(`[Collaboration] Broadcast complete. Room has ${room.users.size} users.`);
            });

            // Handle cursor updates
            socket.on('workspace:cursor', (data: { position: CursorPosition; selection?: SelectionRange }) => {
                if (!currentUser || !currentWorkspaceId) return;

                const room = this.rooms.get(currentWorkspaceId);
                if (!room) return;

                const presence = room.users.get(currentUser.id);
                if (presence) {
                    presence.cursor = data.position;
                    if (data.selection) {
                        presence.selection = data.selection;
                    } else {
                        delete presence.selection;
                    }
                    presence.status = 'active';
                    presence.lastActive = Date.now();
                }

                console.log(`[Collaboration] Cursor from ${currentUser.username || currentUser.email} at line ${data.position?.lineNumber}, broadcasting to ${room.users.size - 1} other users`);

                // Broadcast cursor to others (debounced on client side)
                socket.to(currentWorkspaceId).emit('workspace:cursor', {
                    userId: currentUser.id,
                    username: currentUser.username || (currentUser.email.split('@')[0]),
                    color: currentUser.color,
                    position: data.position,
                    selection: data.selection
                });
            });

            // Handle save request
            socket.on('workspace:save', async (data: { message?: string }) => {
                if (!currentUser || !currentWorkspaceId) return;

                const room = this.rooms.get(currentWorkspaceId);
                if (!room) return;

                // Check save permission - includes 'member' role which has save access
                if (!['owner', 'admin', 'member', 'editor'].includes(currentUser.role)) {
                    socket.emit('error', { message: 'No save permission' });
                    return;
                }

                try {
                    const text = room.doc.getText('code');
                    const code = text.toString();

                    // Get next version number
                    const { data: latestVersion } = await this.supabase
                        .from('schema_versions')
                        .select('version_number')
                        .eq('workspace_id', currentWorkspaceId)
                        .order('version_number', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    const nextVersion = (latestVersion?.version_number || 0) + 1;

                    // Insert new version
                    const { error } = await this.supabase
                        .from('schema_versions')
                        .insert({
                            workspace_id: currentWorkspaceId,
                            version: nextVersion,
                            version_number: nextVersion,
                            code,
                            raw_schema: code,
                            normalized_schema: {}, // Required NOT NULL
                            created_by: currentUser.id,
                            message: data.message || `Collaborative session save`
                        });

                    if (error) throw error;

                    room.lastSaved = Date.now();
                    room.isDirty = false;

                    // Broadcast save confirmation
                    this.io.to(currentWorkspaceId).emit('workspace:saved', {
                        version: nextVersion,
                        savedBy: currentUser.username || (currentUser.email.split('@')[0]),
                        timestamp: new Date().toISOString()
                    });

                    console.log(`[Collaboration] Version ${nextVersion} saved by ${currentUser.email}`);

                } catch (err) {
                    console.error('[Collaboration] Save error:', err);
                    socket.emit('error', { message: 'Failed to save version' });
                }
            });

            // Handle disconnect
            socket.on('disconnect', () => {
                if (currentUser && currentWorkspaceId) {
                    const room = this.rooms.get(currentWorkspaceId);
                    if (room) {
                        room.users.delete(currentUser.id);
                        this.broadcastUsers(room);

                        // Clean up empty rooms after 10 minutes (session idle timeout)
                        // When last user disconnects, the session ends and chat is destroyed
                        if (room.users.size === 0) {
                            setTimeout(() => {
                                const currentRoom = this.rooms.get(currentWorkspaceId!);
                                if (currentRoom && currentRoom.users.size === 0) {
                                    // Session ends: chat memory is wiped, editor state resets to last saved version
                                    this.rooms.delete(currentWorkspaceId!);
                                    console.log(`[Collaboration] Session ended, chat destroyed: ${currentWorkspaceId}`);
                                }
                            }, 10 * 60 * 1000);
                        }
                    }
                    console.log(`[Collaboration] ${currentUser.email} left ${currentWorkspaceId}`);
                }
            });

            // Handle status updates (idle/active)
            socket.on('workspace:status', (data: { status: 'active' | 'idle' | 'viewing' }) => {
                if (!currentUser || !currentWorkspaceId) return;

                const room = this.rooms.get(currentWorkspaceId);
                if (!room) return;

                const presence = room.users.get(currentUser.id);
                if (presence) {
                    presence.status = data.status;
                    presence.lastActive = Date.now();
                    // this.broadcastPresence(room); // Removed as presence logic is removed
                }
            });

            // Handle typing indicator for chat
            socket.on('chat:typing', (data: { isTyping: boolean }) => {
                if (!currentUser || !currentWorkspaceId) return;

                // Broadcast typing status to others
                socket.to(currentWorkspaceId).emit('chat:typing', {
                    userId: currentUser.id,
                    username: currentUser.username || (currentUser.email.split('@')[0]),
                    isTyping: data.isTyping
                });
            });

            // --- FEATURE 1: LIVE EDITING PRESENCE ---
            // socket.on('presence:type', (data: { line: number }) => { // Removed as presence logic is removed
            //     if (!currentUser || !currentWorkspaceId) return;
            //     const room = this.rooms.get(currentWorkspaceId);
            //     if (!room) return;

            //     const presence: LivePresence = {
            //         userId: currentUser.id,
            //         username: currentUser.username || currentUser.email.split('@')[0] || 'Unknown',
            //         color: currentUser.color || '#6366f1',
            //         line: data.line,
            //         lastActive: Date.now()
            //     };

            //     room.livePresence.set(currentUser.id, presence);

            //     // Broadcast to ALL (including sender)
            //     this.io.to(currentWorkspaceId).emit('presence:update', presence);
            // });

            // On save, we could technically calculate diffs here,
            // but for now we rely on the client sending attribution commits
            // when they finalize a block or hit save.

            // --- FEATURE 2: BLOCK ATTRIBUTION ---
            socket.on('attribution:commit', async (data: { block: { blockId: string; start: number; end: number } }) => {
                if (!currentUser || !currentWorkspaceId) return;
                const room = this.rooms.get(currentWorkspaceId);
                if (!room) return;

                const blockId = data.block.blockId;
                const attribution: BlockAttribution = {
                    blockId,
                    startLine: data.block.start,
                    endLine: data.block.end,
                    lastEditorId: currentUser.id,
                    lastEditorName: currentUser.username || currentUser.email.split('@')[0] || 'Unknown',
                    updatedAt: Date.now()
                };

                room.blockAttributions.set(blockId, attribution);

                // Persist to database
                const { error: upsertError } = await this.supabase
                    .from('code_block_attributions')
                    .upsert({
                        workspace_id: currentWorkspaceId,
                        block_id: blockId,
                        start_line: data.block.start,
                        end_line: data.block.end,
                        last_editor_id: currentUser.id,
                        last_editor_name: attribution.lastEditorName,
                        updated_at: new Date().toISOString()
                    });

                if (upsertError) {
                    console.error('[Collaboration] Attribution persist error:', upsertError);
                }

                // Broadcast persistent attribution update
                this.io.to(currentWorkspaceId).emit('attribution:update', attribution);

                console.log(`[Collaboration] Attribution committed & broadcast for block ${blockId} by ${currentUser.email}`);
            });
        });
    }

    private broadcastUsers(room: WorkspaceRoom): void {
        const users = Array.from(room.users.values()).map(u => ({
            id: u.id,
            username: u.username || (u.email.split('@')[0]),
            email: u.email,
            role: u.role,
            color: u.color,
            status: u.status,
            cursor: u.cursor,
            selection: u.selection,
            lastActive: u.lastActive
        }));

        this.io.to(room.id).emit('workspace:presence', { users });
    }

    private startCleanupInterval(): void {
        // Clean up idle users every minute
        setInterval(() => {
            const now = Date.now();
            const idleThreshold = 5 * 60 * 1000; // 5 minutes

            for (const [workspaceId, room] of this.rooms) {
                for (const [userId, presence] of room.users) {
                    if (now - presence.lastActive > idleThreshold) {
                        presence.status = 'idle';
                    }
                }
                this.broadcastUsers(room);
            }
        }, 60 * 1000);
    }

    public getActiveUsers(workspaceId: string): UserPresence[] {
        const room = this.rooms.get(workspaceId);
        if (!room) return [];
        return Array.from(room.users.values());
    }
}

// --- CHAT INTERFACES ---
interface ChatContext {
    schema_version?: number;
    table?: string;
    line_range?: [number, number];
    live_editing?: boolean;
    is_dirty?: boolean;
}

interface ChatReaction {
    emoji: string;
    userId: string;
    timestamp: number;
}

interface ChatMessage {
    id: string;
    sender: {
        id: string;
        name: string;
        color: string;
        role: string;
    };
    content: {
        type: "text" | "reaction" | "context-ref";
        value: string;
    };
    context?: ChatContext;
    reactions: ChatReaction[]; // Aggregated reactions
    timestamp: number;
    isPromoted?: boolean;
}

export function initializeCollaboration(httpServer: HttpServer, supabase: SupabaseClient): CollaborationServer {
    return new CollaborationServer(httpServer, supabase);
}
