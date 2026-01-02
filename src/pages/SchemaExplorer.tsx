
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../hooks/useProject';
import { useSearchParams } from 'react-router-dom';
import { Search, Table as TableIcon, Database, ChevronDown, ChevronRight, Type, Key, Clock } from 'lucide-react';
import { LoadingSection } from '../components/LoadingSection';

interface Column {
    name: string;
    type: string;
    isPrimary?: boolean;
    isNullable?: boolean;
    isUnique?: boolean;
    defaultValue?: any;
    references?: { table: string; column: string };
    comment?: string;
}

interface Table {
    name: string;
    columns: Column[];
    comment?: string;
}

export function SchemaExplorer() {
    const { projectId } = useProject();
    const [searchParams] = useSearchParams();
    const versionParam = searchParams.get('v');

    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
    const [viewedVersion, setViewedVersion] = useState<number | null>(null);

    const fetchSchema = async () => {
        if (!projectId) return;
        setLoading(true);
        try {
            let query = supabase
                .from('schema_versions')
                .select('normalized_schema, version')
                .eq('project_id', projectId);

            if (versionParam) {
                query = query.eq('version', Number(versionParam));
            } else {
                query = query.order('version', { ascending: false }).limit(1);
            }

            const { data: ver } = await query.maybeSingle();

            if (ver?.normalized_schema) {
                setViewedVersion(ver.version);
                const schema = ver.normalized_schema as any;
                const tableList: Table[] = Object.entries(schema.tables || {}).map(([name, detail]: [string, any]) => ({
                    name,
                    columns: Object.entries(detail.columns || {}).map(([colName, col]: [string, any]) => ({
                        name: colName,
                        type: col.type,
                        isPrimary: col.primary,
                        isNullable: col.nullable !== false, // nullable: true is default if not specified as false
                        isUnique: col.unique,
                        defaultValue: col.default,
                        references: col.foreign_key ? {
                            table: col.foreign_key.split('.')[0],
                            column: col.foreign_key.split('.')[1]
                        } : undefined
                    })),
                    comment: detail.comment
                }));
                setTables(tableList);
                if (tableList.length > 0) setExpandedTables(new Set([tableList[0].name]));
            }
        } catch (err) {
            console.error("Schema explorer error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSchema();
    }, [projectId, versionParam]);

    const toggleTable = (name: string) => {
        const next = new Set(expandedTables);
        if (next.has(name)) next.delete(name);
        else next.add(name);
        setExpandedTables(next);
    };

    const filteredTables = tables.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.columns.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) return <LoadingSection title="Exploring database architecture..." />;

    return (
        <div className="max-w-6xl mx-auto space-y-10 py-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Schema Explorer</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-sm font-medium text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Database className="h-4 w-4" />
                            Live Blueprint Inspection
                        </p>
                        {viewedVersion && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-full border border-amber-100 italic text-[10px] font-bold text-amber-700">
                                <Clock className="h-3 w-3" />
                                Viewing Snapshot v{viewedVersion}
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tables or columns..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Stats Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Architecture</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500 uppercase">Tables</span>
                                <span className="text-xs font-black text-gray-900 leading-none px-2 py-1 bg-gray-100 rounded-lg">{tables.length}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-500 uppercase">Total Columns</span>
                                <span className="text-xs font-black text-gray-900 leading-none px-2 py-1 bg-gray-100 rounded-lg">
                                    {tables.reduce((acc, t) => acc + t.columns.length, 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table List */}
                <div className="lg:col-span-3 space-y-4">
                    {filteredTables.map((table) => (
                        <div key={table.name} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <button
                                onClick={() => toggleTable(table.name)}
                                className="w-full flex items-center justify-between px-8 py-5 hover:bg-gray-50/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-xl ${expandedTables.has(table.name) ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                        <TableIcon className="h-5 w-5" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-black text-gray-900 tracking-tight">{table.name}</h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{table.columns.length} Columns</p>
                                    </div>
                                </div>
                                {expandedTables.has(table.name) ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                            </button>

                            {expandedTables.has(table.name) && (
                                <div className="border-t border-gray-50 bg-white p-8">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-gray-100">
                                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Identity</th>
                                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">F.K</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {table.columns.map((col) => (
                                                    <tr key={col.name} className="group">
                                                        <td className="py-4 font-bold text-gray-800 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                {col.name}
                                                                {!col.isNullable && <span className="text-rose-500 font-bold">*</span>}
                                                            </div>
                                                        </td>
                                                        <td className="py-4">
                                                            <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded w-fit">
                                                                <Type className="h-3 w-3" />
                                                                {col.type}
                                                            </div>
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            {col.isPrimary && (
                                                                <div className="inline-flex items-center justify-center p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                                                                    <Key className="h-3.5 w-3.5" />
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="py-4 text-center">
                                                            {col.references && (
                                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                                    {col.references.table}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
