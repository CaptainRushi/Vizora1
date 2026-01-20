import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Users, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface Workspace {
    id: string;
    name: string;
    type: 'personal' | 'team';
}

export function GlobalSidebarWorkspaces() {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const fetchWorkspaces = async () => {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            // Fetch workspaces where user is owner or member
            const { data: ownedWorkspaces } = await supabase
                .from('workspaces')
                .select('id, name, type')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false });

            const { data: memberWorkspaces } = await supabase
                .from('workspace_members')
                .select('workspace:workspace_id(id, name, type)')
                .eq('user_id', user.id);

            // Combine and dedupe
            const allWorkspaces: Workspace[] = [];
            const seenIds = new Set<string>();

            for (const ws of ownedWorkspaces || []) {
                if (!seenIds.has(ws.id)) {
                    seenIds.add(ws.id);
                    allWorkspaces.push(ws);
                }
            }

            for (const m of memberWorkspaces || []) {
                const ws = m.workspace as unknown as Workspace;
                if (ws && !seenIds.has(ws.id)) {
                    seenIds.add(ws.id);
                    allWorkspaces.push(ws);
                }
            }

            setWorkspaces(allWorkspaces);
            setLoading(false);
        };

        fetchWorkspaces();

        // Subscribe to changes
        const channel = supabase
            .channel('global-workspace-list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'workspaces' }, () => {
                fetchWorkspaces();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [location.pathname]); // Re-fetch when navigation changes

    const isActive = (id: string) => location.pathname.startsWith(`/workspaces/${id}`);

    if (loading) return null;

    return (
        <>
            {/* Workspaces Label / Divider */}
            <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <div className="px-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap px-2">
                        Workspaces
                    </span>
                </div>
            </div>

            {/* Workspace List */}
            {workspaces.map(ws => {
                const active = isActive(ws.id);
                return (
                    <button
                        key={ws.id}
                        onClick={() => navigate(`/workspaces/${ws.id}`)}
                        className={`
                            relative flex items-center h-10 px-2 rounded-lg transition-all duration-200 group/item min-w-0
                            ${active ? 'bg-indigo-50/50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}
                        `}
                        title={ws.name}
                    >
                        {active && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-indigo-600 rounded-r" />
                        )}

                        <div className={`shrink-0 ${active ? 'text-indigo-600' : 'text-gray-500 dark:text-slate-400 group-hover/item:text-gray-900 dark:group-hover/item:text-white'}`}>
                            {ws.type === 'team' ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
                        </div>

                        <span className={`
                            ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate
                            ${active ? 'text-indigo-900 dark:text-indigo-400' : 'text-gray-600 dark:text-slate-300'}
                        `}>
                            {ws.name}
                        </span>
                    </button>
                );
            })}

            {/* Create New Workspace */}
            <button
                onClick={() => navigate('/workspaces/create')}
                className={`
                    relative flex items-center h-10 px-2 rounded-lg transition-all duration-200 group/item min-w-0
                    hover:bg-indigo-50 dark:hover:bg-indigo-900/10 mt-1
                `}
            >
                <div className="shrink-0 text-indigo-600 dark:text-indigo-400">
                    <Plus className="w-5 h-5" />
                </div>
                <span className="ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-indigo-600 dark:text-indigo-400">
                    New Workspace
                </span>
            </button>
        </>
    );
}
