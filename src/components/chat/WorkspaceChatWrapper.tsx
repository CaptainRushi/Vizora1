import { useState } from 'react';
import { useCollaborationContext } from '../../context/CollaborationContext';
import { useAuth } from '../../context/AuthContext';
import { WorkspaceChat } from './WorkspaceChat';
import { MessageSquare } from 'lucide-react';

export function WorkspaceChatWrapper() {
    const { users, role, isConnected, messages } = useCollaborationContext();
    const { user, identity } = useAuth();
    const [isOpen, setIsOpen] = useState(true);

    if (!isConnected || !user) return null;

    const me = users.find(u => u.id === user.id);

    const currentUser = {
        id: user.id,
        username: identity?.username ? `@${identity.username}` : (user.email?.split('@')[0] || 'Me'),
        role: role,
        color: me?.color || '#6366f1' // Default indigo
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="workspace-chat-wrapper fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-500/30 transition-all group animate-in slide-in-from-bottom-4 duration-300"
            >
                <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    {/* Unread dot or live indicator */}
                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full animate-pulse" />
                </div>
                <div className="text-left">
                    <p className="text-[11px] font-black text-gray-900 dark:text-white uppercase tracking-widest leading-none mb-1">
                        Workspace Chat
                    </p>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                            {users.length} Live · {messages.length} messages
                        </p>
                    </div>
                </div>
            </button>
        );
    }

    return (
        <WorkspaceChat
            currentUser={currentUser}
            onClose={() => setIsOpen(false)}
        />
    );
}
