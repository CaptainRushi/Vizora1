import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TeamManager } from '../dashboard/TeamManager';
import { Folder, Loader2 } from 'lucide-react';

export function TeamMembers() {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                // Fetch projects the user has access to
                // For now, fetching all projects since RLS/Auth is simplified or open
                const { data } = await supabase.from('projects').select('id, name').order('created_at', { ascending: false });
                setProjects(data || []);
                if (data && data.length > 0) {
                    setSelectedProjectId(data[0].id);
                }
            } catch (err) {
                console.error("Failed to fetch projects", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="text-center p-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900">No Projects Found</h3>
                <p className="text-xs text-slate-500 mt-1">Create a project first to manage team members.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Team Management</h2>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        Select a project to manage its members and invites.
                    </p>
                </div>

                <div className="relative min-w-[240px]">
                    <select
                        value={selectedProjectId || ''}
                        onChange={(e) => setSelectedProjectId(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 appearance-none shadow-sm transition-all cursor-pointer hover:bg-gray-50"
                    >
                        {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                    <Folder className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px]">
                <TeamManager projectId={selectedProjectId} />
            </div>
        </div>
    );
}
