

import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../hooks/useProject';
import { useOptimizedFetch, invalidateCache } from '../hooks/useOptimizedFetch';
import { Folder, Plus, Trash2, Check, Loader2, MousePointer2, Clock, Terminal, ArrowRight, Beaker } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AboutBetaModal } from '../components/beta/AboutBetaModal';
import { FeedbackNudge } from '../components/beta/FeedbackNudge';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useWorkspaceRole } from '../hooks/useWorkspaceRole';
import { LoadingSection } from '../components/LoadingSection';

interface Project {
    id: string;
    name: string;
    schema_type: string;
    created_at: string;
    current_step: string;
}

export function Projects() {
    const navigate = useNavigate();
    const { identity } = useAuth();
    const { projectId: currentProjectId, switchProject } = useProject();

    // Workspace & Role state
    const workspaceId = identity?.workspace_id || null;
    const { isAdmin, loading: roleLoading } = useWorkspaceRole({ workspaceId });

    // New Project Form
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('sql');
    const [creating, setCreating] = useState(false);
    const [showBetaLimit, setShowBetaLimit] = useState(false);

    // Optimized data fetching with caching
    const fetchProjects = useCallback(async () => {
        const { data, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('[Projects] Fetch error:', error);
        console.log('[Projects] Fetched:', data?.length || 0, 'projects');
        return data || [];
    }, []);

    const { data, loading: projectsLoading, refetch } = useOptimizedFetch<Project[]>(
        'projects-list',
        fetchProjects,
        { cacheTime: 2 * 60 * 1000 } // Cache for 2 minutes
    );

    // Ensure projects is always an array
    const projects: Project[] = data ?? [];

    const loading = projectsLoading || roleLoading;


    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            console.log('Creating project:', { name: newName, type: newType });

            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Not authenticated');

            // Get user's workspace
            let targetWorkspaceId = workspaceId;

            // Fallback: If context is somehow missing workspace_id (rare race condition on fresh login)
            if (!targetWorkspaceId) {
                console.warn('[Projects] Workspace ID missing from context, attempting fetch...');
                try {
                    const freshIdentity = await api.user.getMe(user.id);
                    if (freshIdentity?.workspace_id) {
                        targetWorkspaceId = freshIdentity.workspace_id;
                    }
                } catch (fetchErr) {
                    console.error('[Projects] Failed to fetch identity backup:', fetchErr);
                }
            }

            if (!targetWorkspaceId) {
                throw new Error('Workspace not initialized. Please refresh the page or go to your account to set up a workspace.');
            }

            // Create Project via Backend API (Enforces limits)
            const project = await api.createProject(newName, newType, targetWorkspaceId, user.id);

            console.log('Project created:', project);

            // Invalidate cache to show new project
            invalidateCache('projects-list');
            invalidateCache(`workspace-usage-${targetWorkspaceId}`);

            // Navigate to workspace-scoped schema input
            navigate(`/workspace/${project.id}/schema-input`);
        } catch (err: any) {
            console.error("Create project error:", err);
            const serverMsg = err.response?.data?.message || err.response?.data?.error;
            const msg = serverMsg || err.message || "Unknown error";
            const details = err.response?.data?.details ? JSON.stringify(err.response.data.details) : '';

            if (err.response?.status === 403) {
                alert(`Permission Denied: ${msg}`);
            } else if (err.response?.status === 500) {
                alert(`Server Error: ${msg}\n${details}`);
            } else {
                alert(`Failed to create project: ${msg}`);
            }
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!isAdmin) {
            alert("Only workspace admins can delete projects.");
            return;
        }
        if (!confirm("Are you sure? This will delete all versions, documentation, and metadata for this project. This action is irreversible.")) return;
        try {
            console.log(`[Projects] Requesting deletion for project: ${id}`);

            // Delete project via Backend API
            // This ensures all server-side cleanup and potentially addresses ghost project issues
            await api.deleteProject(id);

            // Invalidate cache
            invalidateCache('projects-list');

            if (id === currentProjectId) {
                // If we deleted the active project, clear the session area
                navigate('/projects');
                window.location.reload(); // Force refresh to clear project context
            } else {
                refetch();
            }
        } catch (err: any) {
            console.error("[Projects] Delete failed:", err);
            alert(`Failed to delete project: ${err.message || 'Unknown error'}`);
        }
    };

    return (
        <div className="app-container py-12">
            <div className="space-y-12 pb-20">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 shadow-inner">
                        <Folder className="h-8 w-8" />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Project Management</h1>
                    <p className="text-gray-500 max-w-lg mx-auto">
                        Start a new database clarity journey or switch between existing projects.
                    </p>
                </div>

                {/* Beta Usage Banner */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-3xl p-1 shadow-xl shadow-indigo-100/50">
                    <div className="bg-white rounded-[calc(1.5rem-4px)] p-6 flex flex-wrap items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="bg-indigo-50 p-3 rounded-2xl ring-4 ring-indigo-50">
                                <Beaker className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-black text-gray-900 leading-tight text-lg">Beta Access Active</h3>
                                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wide">
                                        Free Plan (Override)
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium mt-1">
                                    You have full access to Vizora features during the private beta period.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-8">
                            {/* Limits Badges */}
                            <div className="hidden sm:flex items-center gap-3">
                                <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wide">Max 4 Versions / Project</span>
                                </div>
                            </div>

                            <div className="h-8 w-px bg-slate-100 hidden sm:block"></div>

                            {/* Project Counter */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tight text-slate-400">
                                    <span>Active Projects</span>
                                    <span className={projects.length >= 2 ? "text-amber-500" : "text-indigo-600"}>
                                        {projects.length} / 2
                                    </span>
                                </div>
                                <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden p-[2px]">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${projects.length >= 2 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                                        style={{ width: `${Math.min((projects.length / 2) * 100, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Create Section */}
                <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-100 bg-white p-8 shadow-2xl shadow-indigo-100/50">
                    <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-indigo-50 opacity-50 blur-3xl pointer-events-none" />

                    <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <Plus className="h-5 w-5 text-indigo-600" />
                        Initialize New Project
                    </h2>

                    <div className="grid gap-8 lg:grid-cols-2">
                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700">Project Name</label>
                            <input
                                type="text"
                                placeholder="e.g. E-Commerce Backend"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 px-5 text-lg font-medium focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-bold text-gray-700">Schema Type</label>
                            <div className="flex gap-3">
                                {['sql', 'prisma', 'drizzle'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setNewType(type)}
                                        className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 py-4 px-4 text-sm font-black transition-all ${newType === type
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md ring-4 ring-indigo-500/10'
                                            : 'border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Terminal className="h-4 w-4" />
                                        {type.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <button
                            onClick={handleCreate}
                            disabled={creating || !newName.trim()}
                            className="group flex items-center gap-3 rounded-2xl bg-gray-900 px-10 py-4 text-sm font-black text-white shadow-xl shadow-gray-900/20 hover:bg-black hover:shadow-gray-900/30 disabled:opacity-50 transition-all active:scale-95"
                        >
                            {creating ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Create Project
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* List Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-lg font-bold text-gray-900">Existing Exploration</h2>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{projects.length} Total</span>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 rounded-3xl border-2 border-dashed border-indigo-100 bg-indigo-50/20">
                            <LoadingSection title="Loading Projects..." subtitle="Retrieving your latest architectural workspaces." />
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                            {projects.map((p) => {
                                const isActive = p.id === currentProjectId;
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => !isActive && switchProject(p.id)}
                                        className={`group relative overflow-hidden rounded-3xl border-2 p-8 transition-all cursor-pointer ${isActive
                                            ? 'border-indigo-600 bg-indigo-50/50 shadow-xl'
                                            : 'border-gray-100 bg-white hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/30'}`}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-black ${isActive ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                    {p.name[0].toUpperCase()}
                                                </div>
                                                <h3 className={`font-black text-xl tracking-tight ${isActive ? 'text-indigo-900' : 'text-gray-900'}`}>
                                                    {p.name}
                                                </h3>
                                            </div>
                                            {isActive ? (
                                                <span className="flex items-center gap-1.5 rounded-full bg-indigo-200/50 px-3 py-1 text-[10px] font-black uppercase text-indigo-700 tracking-tighter ring-1 ring-indigo-700/20">
                                                    <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                                                    Active Session
                                                </span>
                                            ) : (
                                                <MousePointer2 className="h-5 w-5 text-gray-200 group-hover:text-indigo-300 transition-colors" />
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-4 items-center text-xs font-bold text-gray-400">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg">
                                                <Terminal className="h-3.5 w-3.5" />
                                                {p.schema_type?.toUpperCase() || 'SQL'}
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg uppercase">
                                                <Check className="h-3.5 w-3.5" />
                                                {p.current_step}
                                            </div>
                                        </div>

                                        {isAdmin && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(p.id);
                                                }}
                                                className="absolute bottom-6 right-6 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete Project"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {showBetaLimit && (
                    <>
                        <AboutBetaModal
                            onClose={() => setShowBetaLimit(false)}
                            limitReached={true}
                            type="project"
                        />
                        <FeedbackNudge context="limit_hit" delay={1000} />
                    </>
                )}
            </div>
        </div>
    );
}
