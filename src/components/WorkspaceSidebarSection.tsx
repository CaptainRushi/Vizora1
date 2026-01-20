import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
    Plus,
    ChevronDown,
    ChevronRight,
    Layers,
    Users,
    Search,
    ExternalLink,
    Sparkles,
    Clock,
    Crown,
    Folder,
    GitBranch,
    FileCode,
    Activity,
    Zap,
    Trash2,
    AlertTriangle,
    X,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Workspace {
    id: string;
    name: string;
    type: 'personal' | 'team';
    owner_id?: string;
    created_at?: string;
    updated_at?: string;
}

export function WorkspaceSidebarSection() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [versionCounts, setVersionCounts] = useState<Record<string, number>>({});
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; workspace: Workspace | null }>({ open: false, workspace: null });
    const [deleting, setDeleting] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

    const handleDeleteWorkspace = async () => {
        if (!deleteModal.workspace || !user) return;

        setDeleting(true);
        try {
            const response = await fetch(`${API_URL}/workspace/${deleteModal.workspace.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requesterId: user.id })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to delete workspace');
            }

            toast.success(data.message || 'Workspace deleted successfully');
            setDeleteModal({ open: false, workspace: null });

            // Navigate to projects if currently viewing the deleted workspace
            if (location.pathname.startsWith(`/workspaces/${deleteModal.workspace.id}`)) {
                navigate('/projects');
            }
        } catch (err: any) {
            console.error('[Delete Workspace] Error:', err);
            toast.error(err.message || 'Failed to delete workspace');
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        const fetchWorkspaces = async (isInitialLoad = false) => {
            // Only show loading spinner on initial load to prevent flashing
            if (isInitialLoad && workspaces.length === 0) {
                setLoading(true);
            }
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) {
                setLoading(false);
                return;
            }

            try {
                // Fetch both owned and member workspaces in parallel
                const [ownedResult, memberResult] = await Promise.all([
                    supabase
                        .from('workspaces')
                        .select('id, name, type, owner_id, created_at, updated_at')
                        .eq('owner_id', authUser.id)
                        .order('updated_at', { ascending: false }),
                    supabase
                        .from('workspace_members')
                        .select('workspace:workspace_id(id, name, type, owner_id, created_at, updated_at)')
                        .eq('user_id', authUser.id)
                ]);

                // Combine and dedupe
                const allWorkspaces: Workspace[] = [];
                const seenIds = new Set<string>();

                for (const ws of ownedResult.data || []) {
                    if (!seenIds.has(ws.id)) {
                        seenIds.add(ws.id);
                        allWorkspaces.push(ws);
                    }
                }

                for (const m of memberResult.data || []) {
                    const ws = m.workspace as unknown as Workspace;
                    if (ws && !seenIds.has(ws.id)) {
                        seenIds.add(ws.id);
                        allWorkspaces.push(ws);
                    }
                }

                setWorkspaces(allWorkspaces);
                setLoading(false);

                // Fetch version counts in parallel (non-blocking - UI is already showing)
                if (allWorkspaces.length > 0) {
                    const countPromises = allWorkspaces.map(ws =>
                        supabase
                            .from('schema_versions')
                            .select('*', { count: 'exact', head: true })
                            .eq('workspace_id', ws.id)
                            .then(({ count }) => ({ id: ws.id, count: count || 0 }))
                    );

                    const countResults = await Promise.all(countPromises);
                    const counts: Record<string, number> = {};
                    countResults.forEach(({ id, count }) => {
                        counts[id] = count;
                    });
                    setVersionCounts(counts);
                }
            } catch (err) {
                console.error('[Workspace Sidebar] Fetch error:', err);
                setLoading(false);
            }
        };

        fetchWorkspaces(true); // Pass true for initial load

        // Subscribe to workspace changes for real-time updates
        const channel = supabase
            .channel('workspace-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, () => {
                // Silent refresh - don't show loading state
                fetchWorkspaces();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_members' }, () => {
                // Also refresh when membership changes
                fetchWorkspaces();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]); // Only re-fetch when user changes, not on every navigation

    const isActive = (id: string) => location.pathname.startsWith(`/workspaces/${id}`);

    const isOwner = (ws: Workspace) => user?.id === ws.owner_id;

    const filteredWorkspaces = useMemo(() => {
        if (!searchQuery.trim()) return workspaces;
        return workspaces.filter(ws =>
            ws.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [workspaces, searchQuery]);

    // Separate owned and member workspaces
    const ownedWorkspaces = useMemo(() =>
        filteredWorkspaces.filter(ws => ws.owner_id === user?.id),
        [filteredWorkspaces, user]
    );

    const memberWorkspaces = useMemo(() =>
        filteredWorkspaces.filter(ws => ws.owner_id !== user?.id),
        [filteredWorkspaces, user]
    );

    const formatTimeAgo = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return date.toLocaleDateString();
    };

    const WorkspaceCard = ({ ws }: { ws: Workspace }) => {
        const active = isActive(ws.id);
        const hovered = hoveredId === ws.id;
        const versions = versionCounts[ws.id] || 0;

        return (
            <div
                className={`
                    relative group px-2.5 py-2.5 mx-1 rounded-xl cursor-pointer transition-all duration-200
                    ${active
                        ? 'bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 dark:from-indigo-900/30 dark:via-purple-900/20 dark:to-indigo-900/30 shadow-sm ring-1 ring-indigo-200/50 dark:ring-indigo-500/20'
                        : 'hover:bg-gray-50/80 dark:hover:bg-slate-800/70'
                    }
                `}
                onClick={() => navigate(`/workspaces/${ws.id}`)}
                onMouseEnter={() => setHoveredId(ws.id)}
                onMouseLeave={() => setHoveredId(null)}
            >
                {/* Active indicator */}
                {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-600 rounded-r-full shadow-lg shadow-indigo-500/50" />
                )}

                <div className="flex items-center gap-3">
                    {/* Icon with gradient background */}
                    <div className={`
                        relative shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
                        ${active
                            ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 shadow-lg shadow-indigo-500/30'
                            : 'bg-gradient-to-br from-gray-100 to-gray-50 dark:from-slate-800 dark:to-slate-900 group-hover:from-indigo-100 group-hover:to-purple-100 dark:group-hover:from-indigo-900/30 dark:group-hover:to-purple-900/30'
                        }
                    `}>
                        {ws.type === 'team' ? (
                            <Users className={`w-4.5 h-4.5 ${active ? 'text-white' : 'text-gray-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`} />
                        ) : (
                            <FileCode className={`w-4.5 h-4.5 ${active ? 'text-white' : 'text-gray-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`} />
                        )}
                        {isOwner(ws) && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-sm border-2 border-white dark:border-slate-900">
                                <Crown className="w-2 h-2 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`
                                text-[13px] font-bold truncate transition-colors
                                ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-700 dark:text-slate-200 group-hover:text-gray-900 dark:group-hover:text-white'}
                            `}>
                                {ws.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`
                                text-[10px] font-semibold px-1.5 py-0.5 rounded-md
                                ${ws.type === 'team'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                }
                            `}>
                                {ws.type === 'team' ? 'Team' : 'Solo'}
                            </span>
                            {versions > 0 && (
                                <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-0.5">
                                    <GitBranch className="w-2.5 h-2.5" />
                                    v{versions}
                                </span>
                            )}
                            {ws.updated_at && (
                                <span className="text-[10px] text-gray-400 dark:text-slate-500 flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5" />
                                    {formatTimeAgo(ws.updated_at)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className={`
                        flex items-center gap-0.5 transition-opacity duration-200
                        ${hovered || active ? 'opacity-100' : 'opacity-0'}
                    `}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/workspaces/${ws.id}`);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            title="Open Workspace"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    {/* Delete button - Always visible for owners */}
                    {isOwner(ws) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setDeleteModal({ open: true, workspace: ws });
                            }}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors opacity-70 hover:opacity-100"
                            title="Delete Workspace"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
            {/* Section Header */}
            <div
                className="px-3 mb-3 flex items-center justify-between group cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2.5">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-lg blur opacity-40 group-hover:opacity-60 transition-opacity"></div>
                        <div className="relative w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                            <Layers className="w-3.5 h-3.5 text-white" />
                        </div>
                    </div>
                    <div>
                        <span className="text-[12px] font-bold text-gray-800 dark:text-slate-200 tracking-wide">
                            Workspaces
                        </span>
                        {workspaces.length > 0 && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-bold shadow-sm">
                                {workspaces.length}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {workspaces.length > 2 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSearch(!showSearch);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${showSearch ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                        >
                            <Search className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <div className="p-1 transition-transform duration-200">
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300" />
                        ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-slate-300" />
                        )}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="space-y-1">
                    {/* Search Input */}
                    {showSearch && (
                        <div className="px-2 pb-3 animate-in slide-in-from-top-2 duration-150">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search workspaces..."
                                    className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="px-3 py-6 flex flex-col items-center gap-3">
                            <div className="relative w-10 h-10">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 opacity-20 animate-ping"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-indigo-200 dark:border-indigo-900/50"></div>
                                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div>
                                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                                    <Layers className="w-3 h-3 text-indigo-500" />
                                </div>
                            </div>
                            <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Loading workspaces...</span>
                        </div>
                    ) : filteredWorkspaces.length === 0 ? (
                        <div className="px-3 py-8 text-center">
                            {searchQuery ? (
                                <>
                                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                                        <Search className="w-6 h-6 text-gray-400" />
                                    </div>
                                    <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">No matches found</p>
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="text-[11px] text-indigo-600 hover:text-indigo-500 font-semibold"
                                    >
                                        Clear search
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="relative w-20 h-20 mx-auto mb-5">
                                        {/* Animated background */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-indigo-500/20 rounded-3xl animate-pulse"></div>
                                        <div className="absolute inset-1 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center shadow-inner">
                                            <Layers className="w-9 h-9 text-indigo-400/60" />
                                        </div>
                                        {/* Floating particles */}
                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                            <Sparkles className="w-3 h-3 text-white" />
                                        </div>
                                        <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                                            <Zap className="w-2.5 h-2.5 text-white" />
                                        </div>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800 dark:text-slate-200 mb-1">
                                        No workspaces yet
                                    </p>
                                    <p className="text-[11px] text-gray-500 dark:text-slate-500 mb-5 px-2 leading-relaxed">
                                        Create your first workspace to start<br />
                                        collaborating on schema code
                                    </p>
                                    <button
                                        onClick={() => navigate('/workspaces/create')}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_100%] rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:bg-[100%_0] transition-all duration-300 transform hover:scale-105"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Workspace
                                    </button>
                                </>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* My Workspaces Section */}
                            {ownedWorkspaces.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-3 py-1.5 flex items-center gap-2">
                                        <Folder className="w-3 h-3 text-amber-500" />
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                                            My Workspaces
                                        </span>
                                        <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full font-bold">
                                            {ownedWorkspaces.length}
                                        </span>
                                    </div>
                                    {ownedWorkspaces.map(ws => (
                                        <WorkspaceCard key={ws.id} ws={ws} />
                                    ))}
                                </div>
                            )}

                            {/* Shared With Me Section */}
                            {memberWorkspaces.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-3 py-1.5 flex items-center gap-2">
                                        <Users className="w-3 h-3 text-blue-500" />
                                        <span className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                                            Shared With Me
                                        </span>
                                        <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-bold">
                                            {memberWorkspaces.length}
                                        </span>
                                    </div>
                                    {memberWorkspaces.map(ws => (
                                        <WorkspaceCard key={ws.id} ws={ws} />
                                    ))}
                                </div>
                            )}

                            {/* Create New Workspace Button */}
                            <button
                                onClick={() => navigate('/workspaces/create')}
                                className={`
                                    w-full mx-1 mt-3 flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group/new
                                    border-2 border-dashed border-indigo-200 dark:border-indigo-800/50
                                    bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-indigo-50/80 dark:from-indigo-900/10 dark:via-purple-900/10 dark:to-indigo-900/10
                                    hover:border-indigo-400 dark:hover:border-indigo-600
                                    hover:from-indigo-100/80 hover:via-purple-100/80 hover:to-indigo-100/80 dark:hover:from-indigo-900/20 dark:hover:via-purple-900/20 dark:hover:to-indigo-900/20
                                    hover:shadow-lg hover:shadow-indigo-500/10
                                    ${location.pathname === '/workspaces/create' ? 'ring-2 ring-indigo-500/30 border-indigo-400 border-solid' : ''}
                                `}
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-indigo-500/20 dark:from-indigo-500/30 dark:via-purple-500/30 dark:to-indigo-500/30 flex items-center justify-center group-hover/new:from-indigo-500 group-hover/new:via-purple-500 group-hover/new:to-indigo-600 transition-all duration-300 shadow-inner group-hover/new:shadow-lg group-hover/new:shadow-indigo-500/30">
                                    <Plus className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover/new:text-white transition-colors duration-200" />
                                </div>
                                <div className="flex-1 text-left">
                                    <span className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400 group-hover/new:text-indigo-700 dark:group-hover/new:text-indigo-300 block">
                                        New Workspace
                                    </span>
                                    <p className="text-[10px] text-gray-500 dark:text-slate-500 group-hover/new:text-gray-600 dark:group-hover/new:text-slate-400">
                                        Create a collaborative schema space
                                    </p>
                                </div>
                                <Activity className="w-4 h-4 text-indigo-400/50 group-hover/new:text-indigo-500 transition-colors" />
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.open && deleteModal.workspace && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6 mx-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Workspace</h3>
                                    <p className="text-sm text-gray-500 dark:text-slate-400">This action cannot be undone</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDeleteModal({ open: false, workspace: null })}
                                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4 mb-6">
                            <p className="text-sm text-red-700 dark:text-red-300">
                                You are about to permanently delete <strong>"{deleteModal.workspace.name}"</strong>.
                                This will remove:
                            </p>
                            <ul className="mt-2 text-sm text-red-600 dark:text-red-400 list-disc list-inside space-y-1">
                                <li>All schema versions</li>
                                <li>All team members</li>
                                <li>All activity history</li>
                                <li>All pending invites</li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteModal({ open: false, workspace: null })}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteWorkspace}
                                disabled={deleting}
                                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                {deleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete Workspace
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
