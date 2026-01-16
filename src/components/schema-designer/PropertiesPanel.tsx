
import { useState, useEffect } from 'react';
import { UnifiedSchema, UnifiedColumn } from '../../lib/schema-types';
import { X, Plus, Trash2, Key, ChevronRight, Hash, Type, Calendar, Database, ShieldCheck, Link2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PropertiesPanelProps {
    selectedNodeId: string | null;
    schema: UnifiedSchema;
    onUpdateTable: (oldName: string, newName: string) => void;
    onUpdateColumn: (tableName: string, oldColName: string, newColName: string, colData: UnifiedColumn) => void;
    onAddColumn: (tableName: string) => void;
    onDeleteColumn: (tableName: string, colName: string) => void;
    onDeleteTable: (tableName: string) => void;
    onClose: () => void;
    onUpdateColumnName?: (tableName: string, oldName: string, newName: string) => void;
}

export function PropertiesPanel({
    selectedNodeId,
    schema,
    onUpdateTable,
    onUpdateColumn,
    onAddColumn,
    onDeleteColumn,
    onDeleteTable,
    onClose
}: PropertiesPanelProps) {
    if (!selectedNodeId) return null;

    const table = schema.tables[selectedNodeId];
    if (!table) return null;

    const [tableName, setTableName] = useState(selectedNodeId);

    useEffect(() => {
        setTableName(selectedNodeId);
    }, [selectedNodeId]);

    const handleTableNameBlur = () => {
        if (tableName !== selectedNodeId && tableName.trim()) {
            onUpdateTable(selectedNodeId, tableName);
        }
    };

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-24 right-8 w-[380px] max-h-[70vh] bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-[2.5rem] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[100] overflow-hidden"
        >
            {/* Header */}
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-gradient-to-r from-slate-50/50 to-white">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">Table Editor</span>
                    <h2 className="text-base font-black text-slate-800 tracking-tight">{selectedNodeId}</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 bg-slate-100/50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* Visual Section Header */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Configuration</h3>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Identity</label>
                        <input
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            onBlur={handleTableNameBlur}
                            onKeyDown={(e) => e.key === 'Enter' && handleTableNameBlur()}
                            placeholder="Table Name"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200/60 rounded-[1.25rem] text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all placeholder:text-slate-300"
                        />
                    </div>
                </div>

                {/* Columns List */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Schema Definition</h3>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    // Mock AI suggestion
                                    alert("AI Suggestion: For a table named '" + selectedNodeId + "', you might want to add 'created_at' (timestamp), 'updated_at' (timestamp), and 'status' (varchar).");
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black shadow-lg shadow-slate-200 transition-all active:scale-95 group"
                                title="AI Suggest Fields"
                            >
                                <Sparkles className="h-3.5 w-3.5 group-hover:animate-pulse" />
                            </button>
                            <button
                                onClick={() => onAddColumn(selectedNodeId)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Field
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {Object.entries(table.columns).map(([colName, col]) => (
                            <ColumnEditor
                                key={`${selectedNodeId}-${colName}`}
                                colName={colName}
                                column={col}
                                onUpdate={(oldN, newN, c) => onUpdateColumn(selectedNodeId, oldN, newN, c)}
                                onDelete={() => onDeleteColumn(selectedNodeId, colName)}
                            />
                        ))}
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-10 border-t border-slate-100 pb-8">
                    <button
                        onClick={() => {
                            if (window.confirm(`Are you sure you want to delete table "${selectedNodeId}"?`)) {
                                onDeleteTable(selectedNodeId);
                            }
                        }}
                        className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 border border-red-100 hover:border-red-500 hover:shadow-xl hover:shadow-red-100 group"
                    >
                        <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        Discard Table
                    </button>
                </div>
            </div>

            {/* Premium Footer */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 backdrop-blur-md flex items-center justify-between">
                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fields</span>
                        <span className="text-sm font-black text-slate-700">{Object.keys(table.columns).length}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Links</span>
                        <span className="text-sm font-black text-slate-700">{table.relations.length}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Auto-saved
                </div>
            </div>
        </motion.div>
    );
}

function ColumnEditor({
    colName,
    column,
    onUpdate,
    onDelete
}: {
    colName: string,
    column: UnifiedColumn,
    onUpdate: (oldName: string, newName: string, col: UnifiedColumn) => void,
    onDelete: () => void
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [localName, setLocalName] = useState(colName);

    useEffect(() => {
        setLocalName(colName);
    }, [colName]);

    const getTypeIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('int') || t.includes('serial') || t.includes('numeric')) return <Hash className="h-3 w-3" />;
        if (t.includes('date') || t.includes('time')) return <Calendar className="h-3 w-3" />;
        if (t.includes('uuid')) return <ShieldCheck className="h-3 w-3" />;
        if (t.includes('json')) return <Database className="h-3 w-3" />;
        return <Type className="h-3 w-3" />;
    };

    const handlePropToggle = (field: keyof UnifiedColumn) => {
        onUpdate(colName, colName, { ...column, [field]: !column[field] });
    };

    const handleTypeChange = (type: string) => {
        onUpdate(colName, colName, { ...column, type });
    };

    const handleNameCommit = () => {
        if (localName !== colName && localName.trim()) {
            onUpdate(colName, localName, column);
        }
    };

    return (
        <div className={`group bg-white border border-slate-200/60 rounded-2xl transition-all duration-300 ${isExpanded ? 'shadow-xl shadow-indigo-100 ring-2 ring-indigo-500/10 border-indigo-200' : 'hover:border-slate-300 hover:shadow-sm'}`}>
            <div className="p-4 flex items-center gap-3">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`p-1 rounded-lg transition-colors ${isExpanded ? 'bg-indigo-50 text-indigo-500' : 'text-slate-300 group-hover:text-slate-400'}`}
                >
                    <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                <div className="flex-1 min-w-0">
                    <input
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        onBlur={handleNameCommit}
                        onKeyDown={(e) => e.key === 'Enter' && handleNameCommit()}
                        className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300"
                        placeholder="Column Name"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className={`px-2 py-1 rounded-lg flex items-center gap-1.5 transition-colors ${isExpanded ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                        {getTypeIcon(column.type)}
                        <span className="text-[10px] font-black uppercase tracking-wider">{column.type}</span>
                    </div>

                    {column.primary && <div className="p-1.5 bg-amber-50 text-amber-500 rounded-lg"><Key className="h-3.5 w-3.5" /></div>}
                    {column.foreign_key && <div className="p-1.5 bg-sky-50 text-sky-500 rounded-lg"><Link2 className="h-3.5 w-3.5" /></div>}

                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/50 rounded-b-2xl border-t border-slate-100"
                    >
                        <div className="p-6 grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Type</label>
                                <select
                                    value={column.type}
                                    onChange={(e) => handleTypeChange(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-[1rem] px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all cursor-pointer"
                                >
                                    <optgroup label="Numeric">
                                        <option value="int">INTEGER</option>
                                        <option value="bigint">BIGINT</option>
                                        <option value="decimal">DECIMAL</option>
                                        <option value="serial">SERIAL</option>
                                    </optgroup>
                                    <optgroup label="String">
                                        <option value="text">TEXT</option>
                                        <option value="varchar">VARCHAR</option>
                                        <option value="uuid">UUID</option>
                                    </optgroup>
                                    <optgroup label="Temporal">
                                        <option value="timestamp">TIMESTAMP</option>
                                        <option value="date">DATE</option>
                                    </optgroup>
                                    <optgroup label="Others">
                                        <option value="boolean">BOOLEAN</option>
                                        <option value="jsonb">JSONB</option>
                                    </optgroup>
                                </select>
                            </div>

                            <PropertyToggle label="Primary" active={!!column.primary} onToggle={() => handlePropToggle('primary')} icon={Key} color="amber" />
                            <PropertyToggle label="Nullable" active={!!column.nullable} onToggle={() => handlePropToggle('nullable')} icon={Database} color="indigo" />
                            <PropertyToggle label="Unique" active={!!column.unique} onToggle={() => handlePropToggle('unique')} icon={ShieldCheck} color="emerald" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function PropertyToggle({ label, active, onToggle, icon: Icon, color }: { label: string, active: boolean, onToggle: () => void, icon: any, color: string }) {
    const colorMap: Record<string, string> = {
        amber: 'text-amber-500 bg-amber-50 border-amber-100',
        indigo: 'text-indigo-500 bg-indigo-50 border-indigo-100',
        emerald: 'text-emerald-500 bg-emerald-50 border-emerald-100'
    };

    return (
        <button
            onClick={onToggle}
            className={`flex items-center gap-2 p-3 rounded-2xl border transition-all ${active ? colorMap[color] : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
        >
            <Icon className={`h-3.5 w-3.5 ${active ? '' : 'opacity-40'}`} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${active ? '' : 'opacity-60'}`}>{label}</span>
        </button>
    );
}

