
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../hooks/useProject';
import { api } from '../lib/api';
import { GitCompare, ArrowRight, Table, Plus, Minus, Move, AlertCircle } from 'lucide-react';
import { LoadingSection } from '../components/LoadingSection';

export function VersionCompare() {
    const { projectId } = useProject();
    const [versions, setVersions] = useState<any[]>([]);
    const [fromVer, setFromVer] = useState<number | ''>('');
    const [toVer, setToVer] = useState<number | ''>('');
    const [diff, setDiff] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [comparing, setComparing] = useState(false);

    useEffect(() => {
        const fetchVersions = async () => {
            if (!projectId) return;
            const { data } = await supabase
                .from('schema_versions')
                .select('version, created_at')
                .eq('project_id', projectId)
                .order('version', { ascending: false });
            if (data) {
                setVersions(data);
                if (data.length >= 2) {
                    setToVer(data[0].version);
                    setFromVer(data[1].version);
                }
            }
            setLoading(false);
        };
        fetchVersions();
    }, [projectId]);

    const handleCompare = async () => {
        if (!fromVer || !toVer) return;
        setComparing(true);
        try {
            const res = await api.compareVersions(projectId!, Number(fromVer), Number(toVer));
            setDiff(res);
        } catch (err) {
            console.error(err);
        } finally {
            setComparing(false);
        }
    };

    if (loading) return <LoadingSection title="Loading history..." />;

    return (
        <div className="max-w-5xl mx-auto space-y-10 py-12 animate-in fade-in duration-500">
            <div className="flex items-center justify-between pb-8 border-b border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Version Comparison</h1>
                    <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                        <GitCompare className="h-4 w-4" />
                        Schema Evolution Diff
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                    <select
                        value={fromVer}
                        onChange={(e) => setFromVer(e.target.value ? Number(e.target.value) : '')}
                        className="bg-transparent text-sm font-bold p-2 outline-none"
                    >
                        <option value="">Scale From</option>
                        {versions.map(v => <option key={v.version} value={v.version}>v{v.version}</option>)}
                    </select>
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                    <select
                        value={toVer}
                        onChange={(e) => setToVer(e.target.value ? Number(e.target.value) : '')}
                        className="bg-transparent text-sm font-bold p-2 outline-none"
                    >
                        <option value="">Scale To</option>
                        {versions.map(v => <option key={v.version} value={v.version}>v{v.version}</option>)}
                    </select>
                    <button
                        onClick={handleCompare}
                        disabled={comparing || !fromVer || !toVer}
                        className="bg-gray-900 text-white px-6 py-2 rounded-xl text-xs font-black hover:bg-black transition-all disabled:opacity-50"
                    >
                        {comparing ? 'Diffing...' : 'Compare'}
                    </button>
                </div>
            </div>

            {diff ? (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    {diff.length === 0 ? (
                        <div className="bg-gray-50 border border-gray-100 p-12 rounded-[2.5rem] text-center">
                            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-black text-gray-900">Identical Snapshots</h3>
                            <p className="text-sm font-medium text-gray-500 mt-2">No structural changes detected between these versions.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {diff.map((change: any, idx: number) => (
                                <div key={idx} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm flex items-center p-6 gap-6">
                                    <div className={`p-3 rounded-2xl shrink-0 ${change.change_type.includes('added') ? 'bg-green-50 text-green-600' :
                                            change.change_type.includes('removed') ? 'bg-red-50 text-red-600' :
                                                'bg-blue-50 text-blue-600'
                                        }`}>
                                        {change.change_type.includes('added') ? <Plus className="h-5 w-5" /> :
                                            change.change_type.includes('removed') ? <Minus className="h-5 w-5" /> :
                                                <Move className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Table className="h-3 w-3 text-gray-400" />
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{change.change_type.replace('_', ' ')}</span>
                                        </div>
                                        <h4 className="text-lg font-black text-gray-900 tracking-tight">{change.entity_name}</h4>
                                        {change.details?.column && (
                                            <p className="text-xs font-mono text-gray-500 mt-1">
                                                Column: <span className="font-bold text-gray-700">{change.details.column}</span>
                                            </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Modified</p>
                                        <p className="text-xs font-bold text-gray-900 mt-1">v{change.to_version}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center p-20 border-4 border-dashed border-gray-100 rounded-[3rem] text-gray-300">
                    <GitCompare className="h-16 w-16 mb-4 opacity-20" />
                    <p className="text-sm font-black uppercase tracking-widest opacity-40">Select versions to compute delta</p>
                </div>
            )}
        </div>
    );
}
