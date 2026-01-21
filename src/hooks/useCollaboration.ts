/**
 * useCollaboration - React hook for persistent edit attribution
 * Optimized for Vizora Post-Edit Attribution Model
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

// Types
export interface CollaborativeUser {
    id: string;
    username: string;
    email: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
    color: string;
    status: 'active' | 'idle' | 'viewing';
}

export interface BlockAttribution {
    blockId: string;
    startLine: number;
    endLine: number;
    lastEditorId: string;
    lastEditorName: string;
    updatedAt: number;
}

export interface ChatMessage {
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
    reactions: any[];
    timestamp: number;
    isPromoted?: boolean;
}

interface UseCollaborationOptions {
    workspaceId: string;
    onContentChange?: (content: string, userId: string, username: string) => void;
    onVersionSaved?: (version: number, savedBy: string) => void;
}

interface CollaborationState {
    isConnected: boolean;
    isReconnecting: boolean;
    users: CollaborativeUser[];
    canEdit: boolean;
    role: string;
    error: string | null;
}

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

export function useCollaboration({ workspaceId, onContentChange, onVersionSaved }: UseCollaborationOptions) {
    const { session } = useAuth();
    const socketRef = useRef<Socket | null>(null);

    const [state, setState] = useState<CollaborationState>({
        isConnected: false,
        isReconnecting: false,
        users: [],
        canEdit: false,
        role: 'viewer',
        error: null
    });

    const [blockAttributions, setBlockAttributions] = useState<Map<string, BlockAttribution>>(new Map());
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<Map<string, { username: string; timestamp: number }>>(new Map());

    const onContentChangeRef = useRef(onContentChange);
    const onVersionSavedRef = useRef(onVersionSaved);

    useEffect(() => {
        onContentChangeRef.current = onContentChange;
        onVersionSavedRef.current = onVersionSaved;
    }, [onContentChange, onVersionSaved]);

    useEffect(() => {
        if (!workspaceId || !session?.access_token) return;

        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setState(prev => ({ ...prev, isConnected: true, isReconnecting: false, error: null }));
            socket.emit('workspace:join', { workspaceId, token: session.access_token });
        });

        socket.on('disconnect', () => {
            setState(prev => ({ ...prev, isConnected: false }));
        });

        socket.on('workspace:sync', (data: any) => {
            setState(prev => ({
                ...prev,
                users: data.users || [],
                role: data.role,
                canEdit: data.canEdit,
                isConnected: true
            }));

            if (data.blockAttributions) {
                setBlockAttributions(new Map(data.blockAttributions.map((a: any) => [a.blockId, a])));
            }
        });

        socket.on('workspace:update', (data: any) => {
            onContentChangeRef.current?.(data.content, data.userId, data.username);
        });

        socket.on('workspace:presence', (data: { users: CollaborativeUser[] }) => {
            setState(prev => ({ ...prev, users: data.users }));
        });

        socket.on('workspace:saved', (data: any) => {
            onVersionSavedRef.current?.(data.version, data.savedBy);
        });

        socket.on('attribution:update', (attribution: BlockAttribution) => {
            console.log('[useCollaboration] Received attribution update:', attribution);
            setBlockAttributions(prev => {
                const next = new Map(prev);
                next.set(attribution.blockId, attribution);
                return next;
            });
        });

        socket.on('chat:history', (data: { messages: ChatMessage[] }) => {
            setMessages(data.messages);
        });

        socket.on('chat:message', (message: ChatMessage) => {
            setMessages(prev => [...prev, message]);

            // Play sound if sender is not me
            if (message.sender.id !== session?.user?.id) {
                // Custom sci-fi click sound provided by user
                const audio = new Audio('/notification.wav');
                audio.volume = 0.6; // Slightly louder for sci-fi click
                audio.play().catch(err => console.log('[useCollaboration] Sound play blocked:', err));
            }
        });

        // Handle typing indicator
        socket.on('chat:typing', (data: { userId: string; username: string; isTyping: boolean }) => {
            setTypingUsers(prev => {
                const next = new Map(prev);
                if (data.isTyping) {
                    next.set(data.userId, { username: data.username, timestamp: Date.now() });
                } else {
                    next.delete(data.userId);
                }
                return next;
            });
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [workspaceId, session?.access_token]);

    const sendUpdate = useCallback((content: string) => {
        if (socketRef.current?.connected && state.canEdit) {
            socketRef.current.emit('workspace:update', { content });
        }
    }, [state.canEdit]);

    const saveVersion = useCallback((message?: string) => {
        if (socketRef.current?.connected && state.canEdit) {
            socketRef.current.emit('workspace:save', { message });
        }
    }, [state.canEdit]);

    const commitAttribution = useCallback((block: { blockId: string; start: number; end: number }) => {
        if (socketRef.current?.connected) {
            console.log('[useCollaboration] Committing attribution:', block);
            socketRef.current.emit('attribution:commit', { block });
        }
    }, []);

    const sendMessage = useCallback((content: string) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('chat:send', {
                content: { type: 'text', value: content.slice(0, 500) }
            });
        }
    }, []);

    const sendTyping = useCallback((isTyping: boolean) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('chat:typing', { isTyping });
        }
    }, []);

    // Auto-cleanup stale typing indicators (after 3 seconds)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setTypingUsers(prev => {
                const next = new Map(prev);
                let changed = false;
                for (const [userId, data] of prev) {
                    if (now - data.timestamp > 3000) {
                        next.delete(userId);
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const memoizedBlockAttributions = useMemo(() => Array.from(blockAttributions.values()), [blockAttributions]);
    const memoizedTypingUsers = useMemo(() => Array.from(typingUsers.values()).map(t => t.username), [typingUsers]);

    return useMemo(() => ({
        isConnected: state.isConnected,
        users: state.users,
        canEdit: state.canEdit,
        role: state.role,
        messages,
        blockAttributions: memoizedBlockAttributions,
        typingUsers: memoizedTypingUsers,
        sendUpdate,
        saveVersion,
        commitAttribution,
        sendMessage,
        sendTyping,
        socket: socketRef.current
    }), [
        state.isConnected,
        state.users,
        state.canEdit,
        state.role,
        messages,
        memoizedBlockAttributions,
        memoizedTypingUsers,
        sendUpdate,
        saveVersion,
        commitAttribution,
        sendMessage,
        sendTyping
    ]);
}
