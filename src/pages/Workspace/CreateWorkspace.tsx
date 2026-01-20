import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Layout,
    Users,
    User,
    ArrowLeft,
    Database,
    FileCode,
    Sparkles,
    AlertCircle,
    Check,
    Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export function CreateWorkspace() {
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const [name, setName] = useState('');
    const [type, setType] = useState<'personal' | 'team'>('personal');
    const [loading, setLoading] = useState(false);


    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !user) return;

        setLoading(true);
        try {
            // 1. Create workspace
            const { data: workspace, error: wsError } = await supabase
                .from('workspaces')
                .insert({
                    name: name.trim(),
                    type,
                    owner_id: user.id
                })
                .select()
                .single();

            if (wsError) throw wsError;

            // 2. Add owner as admin member (for consistent membership queries)
            await supabase.from('workspace_members').insert({
                workspace_id: workspace.id,
                user_id: user.id,
                role: 'admin', // Owner is also admin in members table
            });

            toast.success('Workspace created successfully!');
            navigate(`/workspaces/${workspace.id}`);

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to create workspace');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg px-6 py-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-xl w-full">
                    {/* Header Section */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/30 mb-4">
                            <Layers className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                            Create New Workspace
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400">
                            A workspace is your collaborative space for schema code.
                            Every change is tracked and versioned.
                        </p>
                    </div>

                    {/* Form Card */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700 overflow-hidden">
                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            {/* Workspace Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                                    Workspace Name
                                </label>
                                <div className="relative">
                                    <FileCode className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Acme Corp Database Schema"
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none text-base"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-2">
                                    Choose a descriptive name for your schema workspace
                                </p>
                            </div>

                            {/* Workspace Type */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-3">
                                    Workspace Type
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Solo Option */}
                                    <button
                                        type="button"
                                        onClick={() => setType('personal')}
                                        className={`
                                            relative p-5 rounded-xl border-2 text-left transition-all group
                                            ${type === 'personal'
                                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-600 shadow-lg shadow-indigo-500/10'
                                                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-md'}
                                        `}
                                    >
                                        {type === 'personal' && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${type === 'personal' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 group-hover:bg-gray-200'}`}>
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className={`font-bold text-base mb-1 ${type === 'personal' ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-slate-300'}`}>
                                            Solo
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">
                                            Perfect for personal projects and individual work
                                        </div>
                                    </button>

                                    {/* Team Option */}
                                    <button
                                        type="button"
                                        onClick={() => setType('team')}
                                        className={`
                                            relative p-5 rounded-xl border-2 text-left transition-all group
                                            ${type === 'team'
                                                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-600 shadow-lg shadow-indigo-500/10'
                                                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:shadow-md'}
                                        `}
                                    >
                                        {type === 'team' && (
                                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors ${type === 'team' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-400 group-hover:bg-gray-200'}`}>
                                            <Users className="w-5 h-5" />
                                        </div>
                                        <div className={`font-bold text-base mb-1 ${type === 'team' ? 'text-indigo-900 dark:text-indigo-200' : 'text-gray-700 dark:text-slate-300'}`}>
                                            Team
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">
                                            Collaborate with others using role-based access
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Features Preview */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                                    What you'll get
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Sparkles className="w-4 h-4 text-indigo-500" />
                                        VS Code-like editor
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Database className="w-4 h-4 text-indigo-500" />
                                        SQL & Prisma support
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <FileCode className="w-4 h-4 text-indigo-500" />
                                        Immutable versions
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Layout className="w-4 h-4 text-indigo-500" />
                                        GitHub-like diff view
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading || !name.trim()}
                                className={`
                                    w-full py-4 px-4 rounded-xl text-white font-bold text-base shadow-lg transition-all transform 
                                    ${loading || !name.trim()
                                        ? 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed shadow-none'
                                        : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98]'}
                                `}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating Workspace...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <Layers className="w-5 h-5" />
                                        Create Workspace
                                    </span>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Info Footer */}
                    <div className="mt-6 text-center text-xs text-gray-400 dark:text-slate-500">
                        <AlertCircle className="w-4 h-4 inline-block mr-1" />
                        All workspaces include version history and can be shared with teammates
                    </div>
                </div>
            </div>
        </div>
    );
}
