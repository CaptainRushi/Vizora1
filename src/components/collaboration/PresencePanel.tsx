/**
 * PresencePanel - Shows active collaborators in a workspace
 * Displays user avatars, names, and status (active, idle, viewing)
 * Click to expand the full member list
 */

import { useState, useRef, useEffect } from 'react';
import { CollaborativeUser } from '../../hooks/useCollaboration';
import { Users, Wifi, WifiOff } from 'lucide-react';

interface PresencePanelProps {
    users: CollaborativeUser[];
    currentUserId?: string;
    isConnected: boolean;
    isCompact?: boolean;
}

export function PresencePanel({ users, currentUserId, isConnected, isCompact = false }: PresencePanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Close panel when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsExpanded(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isConnected) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <WifiOff className="w-3 h-3 text-amber-500" />
                <span className="text-[10px] font-medium text-amber-400">Connecting...</span>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-500';
            case 'idle': return 'bg-yellow-500';
            case 'viewing': return 'bg-blue-500';
            default: return 'bg-gray-500';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'active': return 'editing';
            case 'idle': return 'idle';
            case 'viewing': return 'viewing';
            default: return '';
        }
    };

    // If only current user, show their avatar with "Solo" indicator
    if (users.length <= 1) {
        const currentUserData = users[0];
        return (
            <div className="flex items-center gap-2">
                {currentUserData && (
                    <div className="relative" title={`${currentUserData.username} (you)`}>
                        <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#1e1e1e] shadow-sm"
                            style={{ backgroundColor: currentUserData.color }}
                        >
                            {((currentUserData.username?.startsWith('@') ? currentUserData.username.slice(1) : currentUserData.username)?.[0] || 'U').toUpperCase()}
                        </div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#1e1e1e] bg-green-500" />
                    </div>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700/50 border border-slate-600/30 rounded-full">
                    <Wifi className="w-3 h-3 text-green-500" />
                    <span className="text-[10px] font-medium text-slate-400">Connected</span>
                </div>
            </div>
        );
    }

    if (isCompact) {
        // Compact mode: Clickable avatars that expand to full list
        return (
            <div className="relative" ref={panelRef}>
                {/* Clickable compact view */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center hover:opacity-90 transition-opacity cursor-pointer"
                >
                    <div className="flex -space-x-2">
                        {users.slice(0, 4).map((user) => (
                            <div
                                key={user.id}
                                className="relative"
                                title={`${user.username} (${getStatusLabel(user.status)})`}
                            >
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#1e1e1e] shadow-sm hover:scale-110 transition-transform"
                                    style={{ backgroundColor: user.color }}
                                >
                                    {((user.username.startsWith('@') ? user.username.slice(1) : user.username)[0] || 'U').toUpperCase()}
                                </div>
                                <div
                                    className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#1e1e1e] ${getStatusColor(user.status)}`}
                                />
                            </div>
                        ))}
                        {users.length > 4 && (
                            <div className="w-7 h-7 rounded-full bg-[#37373d] flex items-center justify-center text-[9px] font-bold text-slate-300 border-2 border-[#1e1e1e]">
                                +{users.length - 4}
                            </div>
                        )}
                    </div>
                    <div className="ml-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full hover:bg-green-500/20 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-green-400">{users.length} LIVE</span>
                    </div>
                </button>

                {/* Expanded dropdown */}
                {isExpanded && (
                    <div className="absolute right-0 top-full mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-[#252526] border border-[#3c3c3c] rounded-xl shadow-2xl min-w-[280px] overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-[#3c3c3c] bg-gradient-to-r from-green-500/10 to-emerald-500/10">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 rounded-lg bg-green-500/20">
                                        <Users className="w-4 h-4 text-green-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-white">Live Collaborators</div>
                                        <div className="text-[10px] text-slate-400">
                                            {users.length} {users.length === 1 ? 'person' : 'people'} editing now
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    <span className="text-[10px] font-bold text-green-400">LIVE</span>
                                </div>
                            </div>

                            {/* User List */}
                            <div className="max-h-[300px] overflow-y-auto">
                                {users.map((user) => (
                                    <div
                                        key={user.id}
                                        className={`flex items-center gap-3 p-3 border-b border-[#3c3c3c]/50 last:border-0 ${user.id === currentUserId
                                            ? 'bg-indigo-500/10'
                                            : 'hover:bg-[#2d2d2d]'
                                            } transition-colors`}
                                    >
                                        {/* Avatar */}
                                        <div className="relative">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg"
                                                style={{ backgroundColor: user.color }}
                                            >
                                                {((user.username.startsWith('@') ? user.username.slice(1) : user.username)[0] || 'U').toUpperCase()}
                                            </div>
                                            <div
                                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#252526] ${getStatusColor(user.status)}`}
                                            />
                                        </div>

                                        {/* User Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-semibold text-white truncate">
                                                    {user.username}
                                                </span>
                                                {user.id === currentUserId && (
                                                    <span className="text-[9px] px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded-full font-bold">
                                                        You
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(user.status)}`} />
                                                <span className="text-[11px] text-slate-400 capitalize">
                                                    {getStatusLabel(user.status)}
                                                </span>
                                                {['owner', 'admin'].includes(user.role) && (
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded font-medium capitalize">
                                                        {user.role}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="p-3 bg-[#1e1e1e] border-t border-[#3c3c3c]">
                                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
                                    <Wifi className="w-3 h-3 text-green-500" />
                                    Real-time sync enabled
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Full mode: Detailed list (non-compact)
    return (
        <div className="bg-[#252526] border border-[#3c3c3c] rounded-lg p-3 min-w-[200px]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#3c3c3c]">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-white">
                    {users.length} {users.length === 1 ? 'person' : 'people'} editing live
                </span>
            </div>

            <div className="space-y-2">
                {users.map((user) => (
                    <div
                        key={user.id}
                        className={`flex items-center gap-2 p-2 rounded-md ${user.id === currentUserId ? 'bg-[#37373d]' : 'hover:bg-[#2d2d2d]'}`}
                    >
                        <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: user.color }}
                        >
                            {((user.username.startsWith('@') ? user.username.slice(1) : user.username)[0] || 'U').toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium text-white truncate">
                                    {user.username}
                                </span>
                                {user.id === currentUserId && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded font-medium">
                                        you
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(user.status)}`} />
                                <span className="text-[10px] text-slate-500 capitalize">
                                    {getStatusLabel(user.status)}
                                </span>
                                {['owner', 'admin'].includes(user.role) && (
                                    <span className="text-[9px] text-slate-600 ml-1">
                                        • {user.role}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
