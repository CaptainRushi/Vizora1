import { createContext, useContext, ReactNode, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useCollaboration, CollaborativeUser, ChatMessage, BlockAttribution } from '../hooks/useCollaboration';
import { useProjectContext } from './ProjectContext';
import { useParams } from 'react-router-dom';

interface CollaborationContextType {
    isConnected: boolean;
    users: CollaborativeUser[];
    canEdit: boolean;
    role: string;
    messages: ChatMessage[];
    blockAttributions: BlockAttribution[];
    typingUsers: string[];
    sendUpdate: (content: string) => void;
    saveVersion: (message?: string) => void;
    commitAttribution: (block: { start: number; end: number }) => void;
    sendMessage: (content: string) => void;
    sendTyping: (isTyping: boolean) => void;
    promoteMessage: (messageId: string) => void;
    socket: Socket | null;
    currentContext: any | null; // Simplified
    setCurrentContext: (context: any | null) => void;
    highlightRange: (range: [number, number] | null) => void;
    activeHighlightRange: [number, number] | null;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

function useOptionalProject() {
    try {
        return useProjectContext();
    } catch {
        return { project: null };
    }
}

export function CollaborationProvider({ children }: { children: ReactNode }) {
    const { project } = useOptionalProject();
    const { workspaceId: urlWorkspaceId } = useParams();
    const [currentContext, setCurrentContext] = useState<any | null>(null);
    const [lastHighlightedRange, setLastHighlightedRange] = useState<[number, number] | null>(null);

    const highlightRange = (range: [number, number] | null) => {
        setLastHighlightedRange(range);
    };

    const workspaceId = project?.workspace_id || urlWorkspaceId;

    const collab = useCollaboration({
        workspaceId: workspaceId || '',
    });

    const contextValue: CollaborationContextType = {
        ...collab,
        currentContext,
        setCurrentContext,
        highlightRange,
        activeHighlightRange: lastHighlightedRange
    } as any; // Cast as any to avoid strict type mismatch during transition

    return (
        <CollaborationContext.Provider value={contextValue}>
            {children}
        </CollaborationContext.Provider>
    );
}

export function useCollaborationContext() {
    const context = useContext(CollaborationContext);
    if (context === undefined) {
        throw new Error('useCollaborationContext must be used within a CollaborationProvider');
    }
    return context;
}
