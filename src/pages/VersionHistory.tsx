import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../hooks/useProject';
import { History, Calendar, ChevronRight } from 'lucide-react';

interface Version {
    version: number;
    created_at: string;
    schema_hash: string;
}

export function VersionHistory() {
    const { projectId, loading: projectLoading } = useProject();
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectLoading) return;
        if (!projectId) {
            setLoading(false);
            return;
        }

        const fetchVersions = async () => {
            try {
                const { data, error } = await supabase
                    .from('schema_versions')
                    .select('version, created_at, schema_hash')
                    .eq('project_id', projectId)
                    .order('version', { ascending: false });

                if (error) throw error;
                if (data) setVersions(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchVersions();
    }, [projectId, projectLoading]);

    if (projectLoading) return null;

    return (
        <div className="mx-auto max-w-4xl space-y-8 animate-in fade-in duration-500">
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
                        <li key={ver.version} className="group flex items-center justify-between p-8 hover:bg-gray-50/50 transition-all cursor-pointer">
                            <div className="flex items-center gap-6">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 text-lg font-black font-mono shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    v{ver.version}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h4 className="font-black text-gray-900 tracking-tight">
                                            Schema Snaphot
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
                                <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View Source</button>
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
                </ul>
            </div>
        </div>
    );
}
