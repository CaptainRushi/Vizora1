import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserColorClass } from '../../utils/userColors';
import { supabase } from '../../lib/supabase';
import { SchemaVersion, Workspace } from './types';
import {
    ArrowLeft,
    History,
    Clock,
    User,
    Eye,
    GitCompare,
    FileCode,
    Search,
    Calendar,
    MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function WorkspaceVersionHistory() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [versions, setVersions] = useState<SchemaVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVersions, setSelectedVersions] = useState<string[]>([]);

    useEffect(() => {
        if (!workspaceId) return;

        const loadData = async () => {
            try {
                setLoading(true);

                // Fetch workspace
                const { data: ws } = await supabase
                    .from('workspaces')
                    .select('*')
                    .eq('id', workspaceId)
                    .single();

                if (ws) setWorkspace(ws);

                // Fetch all versions with author info
                const { data: vers } = await supabase
                    .from('schema_versions')
                    .select(`
                        *,
                        author:created_by (
                            email
                        )
                    `)
                    .eq('workspace_id', workspaceId)
                    .order('version_number', { ascending: false });

                if (vers) setVersions(vers);

            } catch (err) {
                console.error(err);
                toast.error('Failed to load version history');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [workspaceId]);

    const formatTimestamp = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = diff / (1000 * 60 * 60);
        const days = diff / (1000 * 60 * 60 * 24);

        if (hours < 1) return 'Just now';
        if (hours < 24) return `${Math.floor(hours)} hours ago`;
        if (days < 7) return `${Math.floor(days)} days ago`;
        return date.toLocaleDateString();
    };


    // Get author display name - prioritize snapshotted username (source of truth)
    const getAuthorName = (ver: SchemaVersion) => {
        // Snapshotted username is the source of truth for attribution
        if (ver.created_by_username) {
            return `@${ver.created_by_username}`;
        }
        if (ver.author?.username) {
            return `@${ver.author.username}`;
        }
        if (ver.author?.email) {
            return ver.author.email.split('@')[0];
        }
        return 'Unknown';
    };

    const handleToggleSelect = (id: string) => {
        if (selectedVersions.includes(id)) {
            setSelectedVersions(selectedVersions.filter(v => v !== id));
        } else if (selectedVersions.length < 2) {
            setSelectedVersions([...selectedVersions, id]);
        } else {
            // Replace oldest selection
            setSelectedVersions([selectedVersions[1], id]);
        }
    };

    const handleCompareSelected = () => {
        if (selectedVersions.length !== 2) return;
        const v1 = versions.find(v => v.id === selectedVersions[0]);
        const v2 = versions.find(v => v.id === selectedVersions[1]);
        if (v1 && v2) {
            navigate(`/workspaces/${workspaceId}/compare?left=${Math.min(v1.version_number, v2.version_number)}&right=${Math.max(v1.version_number, v2.version_number)}`);
        }
    };

    // Filter versions by search
    const filteredVersions = versions.filter(v => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
            `v${v.version_number}`.includes(query) ||
            (v.message?.toLowerCase().includes(query)) ||
            getAuthorName(v).toLowerCase().includes(query)
        );
    });

    // Group versions by date
    const groupedVersions: { [date: string]: SchemaVersion[] } = {};
    filteredVersions.forEach(v => {
        const date = new Date(v.created_at).toLocaleDateString();
        if (!groupedVersions[date]) groupedVersions[date] = [];
        groupedVersions[date].push(v);
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
                    <p className="text-sm text-slate-400">Loading version history...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(`/workspaces/${workspaceId}`)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <History className="w-5 h-5 text-indigo-500" />
                                    Version History
                                </h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {workspace?.name} • {versions.length} versions
                                </p>
                            </div>
                        </div>

                        {selectedVersions.length === 2 && (
                            <button
                                onClick={handleCompareSelected}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm shadow-lg shadow-indigo-500/25 transition-colors"
                            >
                                <GitCompare className="w-4 h-4" />
                                Compare Selected
                            </button>
                        )}
                    </div>

                    {/* Search & Filters */}
                    <div className="mt-4 flex items-center gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search versions..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border border-transparent focus:border-indigo-500 rounded-lg text-sm outline-none transition-colors"
                            />
                        </div>
                        {selectedVersions.length > 0 && (
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                                {selectedVersions.length} selected
                                <button
                                    onClick={() => setSelectedVersions([])}
                                    className="ml-2 text-indigo-600 hover:text-indigo-500"
                                >
                                    Clear
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Version List */}
            <div className="max-w-5xl mx-auto px-6 py-6">
                {versions.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                            <History className="w-8 h-8 text-slate-400" />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No Versions Yet</h2>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            Save your code to create the first version.
                        </p>
                        <button
                            onClick={() => navigate(`/workspaces/${workspaceId}`)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm"
                        >
                            Open Editor
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(groupedVersions).map(([date, dateVersions]) => (
                            <div key={date}>
                                <div className="flex items-center gap-2 mb-3">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{date}</span>
                                    <span className="text-xs text-slate-400">({dateVersions.length} versions)</span>
                                </div>

                                <div className="space-y-2">
                                    {dateVersions.map((ver, idx) => (
                                        <div
                                            key={ver.id}
                                            className={`
                                                group relative bg-white dark:bg-slate-800 rounded-xl border transition-all cursor-pointer
                                                ${selectedVersions.includes(ver.id)
                                                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md'}
                                            `}
                                            onClick={() => handleToggleSelect(ver.id)}
                                        >
                                            <div className="p-4">
                                                <div className="flex items-start gap-4">
                                                    {/* Selection Indicator */}
                                                    <div className={`
                                                        w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors
                                                        ${selectedVersions.includes(ver.id)
                                                            ? 'bg-indigo-600 border-indigo-600'
                                                            : 'border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}
                                                    `}>
                                                        {selectedVersions.includes(ver.id) && (
                                                            <span className="text-white text-xs font-bold">
                                                                {selectedVersions.indexOf(ver.id) + 1}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Version Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                                                                v{ver.version_number}
                                                            </span>
                                                            {idx === 0 && date === Object.keys(groupedVersions)[0] && (
                                                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded">
                                                                    LATEST
                                                                </span>
                                                            )}
                                                        </div>

                                                        {ver.message && (
                                                            <div className="flex items-start gap-2 mb-2 text-sm text-slate-600 dark:text-slate-300">
                                                                <MessageSquare className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                                                                <span className="line-clamp-2">{ver.message}</span>
                                                            </div>
                                                        )}

                                                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                                            <span className="flex items-center gap-1">
                                                                <User className="w-3.5 h-3.5" />
                                                                {getAuthorName(ver)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {formatTimestamp(ver.created_at)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <FileCode className="w-3.5 h-3.5" />
                                                                {(ver.code || ver.raw_schema || '').split('\n').length} lines
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/workspaces/${workspaceId}?view=${ver.version_number}`);
                                                            }}
                                                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                                                            title="View this version"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        {idx < dateVersions.length - 1 || Object.keys(groupedVersions).indexOf(date) < Object.keys(groupedVersions).length - 1 ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const prevVer = versions.find(v => v.version_number === ver.version_number - 1);
                                                                    if (prevVer) {
                                                                        navigate(`/workspaces/${workspaceId}/compare?left=${prevVer.version_number}&right=${ver.version_number}`);
                                                                    }
                                                                }}
                                                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-purple-600 transition-colors"
                                                                title="Compare with previous"
                                                            >
                                                                <GitCompare className="w-4 h-4" />
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>

                                                {/* Attribution - ASCII Style (Unique color per user) */}
                                                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                                                        └── edited by <span className={getUserColorClass(ver.created_by_username || ver.author?.username)}>{getAuthorName(ver)}</span>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Timeline connector */}
                                            {idx < dateVersions.length - 1 && (
                                                <div className="absolute left-[22px] top-full w-0.5 h-2 bg-slate-200 dark:bg-slate-700" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
