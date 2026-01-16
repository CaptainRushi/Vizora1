import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../hooks/useProject';
import { History, Calendar, ChevronRight, X, Copy, Check, Terminal } from 'lucide-react';
import { generateSql, type NormalizedSchema } from '../lib/generators';
import { useOptimizedFetch } from '../hooks/useOptimizedFetch';
import { LoadingSection } from '../components/LoadingSection';

interface Version {
    version: number;
    created_at: string;
    schema_hash: string;
}

export function VersionHistory() {
    const { projectId, loading: projectLoading } = useProject();
    // Optimized data fetching
    const fetchVersions = useCallback(async () => {
        if (!projectId) return [];
        const { data, error } = await supabase
            .from('schema_versions')
            .select('version, created_at, schema_hash')
            .eq('project_id', projectId)
            .order('version', { ascending: false });

        if (error) throw error;
        return data || [];
    }, [projectId]);

    const { data: versionsData, loading: versionsLoading } = useOptimizedFetch<Version[]>(
        `versions-${projectId}`,
        fetchVersions,
        { enabled: !!projectId && !projectLoading, cacheTime: 60 * 1000 }
    );

    const versions = versionsData || [];
    const loading = versionsLoading;

    // Viewer State
    const [viewingCode, setViewingCode] = useState<string | null>(null);
    const [viewingVersion, setViewingVersion] = useState<number | null>(null);
    const [verLoading, setVerLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleViewSource = async (versionNum: number) => {
        if (!projectId) return;
        setVerLoading(true);
        try {
            const { data, error } = await supabase
                .from('schema_versions')
                .select('normalized_schema')
                .eq('project_id', projectId)
                .eq('version', versionNum)
                .single();

            if (error) throw error;
            if (data && data.normalized_schema) {
                const sql = generateSql(data.normalized_schema as NormalizedSchema);
                setViewingCode(sql);
                setViewingVersion(versionNum);
            }
        } catch (err) {
            console.error("Failed to load source:", err);
            alert("Failed to load source code for this version.");
        } finally {
            setVerLoading(false);
        }
    };

    const handleCopy = () => {
        if (!viewingCode) return;
        navigator.clipboard.writeText(viewingCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (projectLoading) return null;

    return (
        <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-500 pb-20">
            <div>
                <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                        <History className="h-6 w-6 text-white" />
                    </div>
                    Version History
                </h2>
                <p className="mt-2 text-gray-500 font-medium">
                    Immutable timeline of your schema evolution.
                </p>
            </div>

            <div className="rounded-[2.5rem] border-4 border-gray-50 bg-white shadow-2xl shadow-gray-200/50 overflow-hidden">
                <ul className="divide-y divide-gray-50">
                    {versions.map((ver) => (
                        <li
                            key={ver.version}
                            onClick={() => handleViewSource(ver.version)}
                            className="group flex items-center justify-between p-8 hover:bg-gray-50/50 transition-all cursor-pointer"
                        >
                            <div className="flex items-center gap-6">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 text-lg font-black font-mono shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    v{ver.version}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-black text-gray-900 tracking-tight">
                                            Schema Snapshot
                                        </h4>
                                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-black text-gray-400 font-mono tracking-widest uppercase">
                                            {ver.schema_hash?.substring(0, 7) || 'NO-HASH'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400 font-bold">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {new Date(ver.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewSource(ver.version);
                                    }}
                                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                >
                                    {verLoading && viewingVersion === ver.version ? 'Loading...' : 'View Source'}
                                </button>
                                <ChevronRight className="h-5 w-5 text-indigo-600" />
                            </div>
                        </li>
                    ))}
                    {versions.length === 0 && !loading && (
                        <div className="p-20 text-center">
                            <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <History className="h-10 w-10 text-gray-200" />
                            </div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No variations found</p>
                        </div>
                    )}
                    {loading && (
                        <div className="p-20">
                            <LoadingSection variant="inline" title="History Syncing..." subtitle="Retrieving immutable records." />
                        </div>
                    )}
                </ul>
            </div>

            {/* Code Viewer Modal */}
            {viewingCode && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 slide-in-from-bottom-4 h-[80vh]">
                        <div className="p-5 border-b flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                    <Terminal className="h-4 w-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-xs">Snapshot v{viewingVersion}</h3>
                                    <p className="text-[10px] text-slate-400 font-medium">Generated SQL Source</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleCopy}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-green-100 text-green-700' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    {copied ? 'Copied' : 'Copy'}
                                </button>
                                <button
                                    className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                    onClick={() => {
                                        setViewingCode(null);
                                        setViewingVersion(null);
                                    }}
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <pre className="flex-1 p-8 overflow-auto font-mono text-sm bg-slate-900 text-indigo-100 leading-relaxed custom-scrollbar">
                            {viewingCode}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
}
