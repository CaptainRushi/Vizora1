
import { useState, useEffect } from 'react';
import { UnifiedSchema, UnifiedColumn } from '../../lib/schema-types';
import { X, Plus, Trash2, Key, ChevronRight, Hash, Type, Calendar, Database, ShieldCheck, Link2 } from 'lucide-react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';

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

    const dragControls = useDragControls();

    return (
        <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragMomentum={false}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-24 right-8 w-[380px] max-h-[75vh] bg-white/80 backdrop-blur-2xl border border-white/20 rounded-[2.5rem] flex flex-col shadow-[0_30px_90px_rgba(0,0,0,0.15)] z-[100] overflow-hidden"
        >
            {/* Header / Drag Handle */}
            <div
                onPointerDown={(e) => dragControls.start(e)}
                className="h-16 border-b border-slate-100/50 flex items-center justify-between px-6 bg-gradient-to-r from-slate-50/80 to-white/80 cursor-grab active:cursor-grabbing select-none"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <Database className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] leading-none mb-1">Entity Config</span>
                        <h2 className="text-sm font-black text-slate-800 tracking-tight truncate max-w-[180px]">{selectedNodeId}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-0.5 mr-2 opacity-20 group-hover:opacity-40 transition-opacity">
                        <div className="w-4 h-0.5 bg-slate-400 rounded-full" />
                        <div className="w-4 h-0.5 bg-slate-400 rounded-full" />
                        <div className="w-4 h-0.5 bg-slate-400 rounded-full" />
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-slate-200/50 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
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
                                onClick={() => selectedNodeId && onAddColumn(selectedNodeId)}
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
                            if (selectedNodeId && window.confirm(`Are you sure you want to delete table "${selectedNodeId}"?`)) {
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
                        <span className="text-sm font-black text-slate-700">{table ? Object.keys(table.columns).length : 0}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Links</span>
                        <span className="text-sm font-black text-slate-700">{table ? table.relations.length : 0}</span>
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

    const getTypeConfig = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('int') || t.includes('serial') || t.includes('numeric') || t.includes('decimal'))
            return { icon: Hash, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Numeric' };
        if (t.includes('date') || t.includes('time'))
            return { icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Temporal' };
        if (t.includes('uuid'))
            return { icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Identity' };
        if (t.includes('json'))
            return { icon: Database, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Structured' };
        if (t.includes('bool'))
            return { icon: ShieldCheck, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Boolean' };
        return { icon: Type, color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', label: 'String' };
    };

    const typeConfig = getTypeConfig(column.type);
    const TypeIcon = typeConfig.icon;

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

    // Count active constraints
    const constraintCount = [column.primary, column.unique, !column.nullable, column.foreign_key].filter(Boolean).length;

    return (
        <motion.div
            layout
            className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${isExpanded
                ? 'bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-200'
                : 'bg-slate-50/80 hover:bg-white hover:shadow-lg hover:shadow-slate-100'
                }`}
        >
            {/* Main Row */}
            <div className="relative p-4 flex items-center gap-4">
                {/* Type Visual Indicator */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`relative w-12 h-12 rounded-xl ${typeConfig.bg} ${typeConfig.border} border flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${isExpanded ? 'shadow-lg' : ''}`}
                >
                    <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center border border-slate-100"
                    >
                        <ChevronRight className={`w-3 h-3 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </motion.div>
                </button>

                {/* Column Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <input
                            value={localName}
                            onChange={(e) => setLocalName(e.target.value)}
                            onBlur={handleNameCommit}
                            onKeyDown={(e) => e.key === 'Enter' && handleNameCommit()}
                            className="bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-300 w-full"
                            placeholder="field_name"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${typeConfig.color}`}>
                            {column.type}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] text-slate-400 font-medium">
                            {typeConfig.label}
                        </span>
                    </div>
                </div>

                {/* Constraint Pills */}
                <div className="flex items-center gap-1.5">
                    {column.primary && (
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg flex items-center gap-1"
                        >
                            <Key className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase">PK</span>
                        </motion.div>
                    )}
                    {column.foreign_key && (
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="px-2 py-1 bg-sky-100 text-sky-700 rounded-lg flex items-center gap-1"
                        >
                            <Link2 className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase">FK</span>
                        </motion.div>
                    )}
                    {column.unique && !column.primary && (
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg flex items-center gap-1"
                        >
                            <ShieldCheck className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase">UQ</span>
                        </motion.div>
                    )}
                    {!column.nullable && !column.primary && (
                        <motion.div
                            initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="w-6 h-6 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center"
                            title="Required"
                        >
                            <span className="text-[10px] font-black">!</span>
                        </motion.div>
                    )}
                </div>

                {/* Delete Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                >
                    <Trash2 className="h-4 w-4" />
                </button>
            </div>

            {/* Expanded Panel */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-5 pt-2 border-t border-dashed border-slate-200">
                            {/* Type Selector */}
                            <div className="mb-5">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Data Type
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { value: 'uuid', label: 'UUID', icon: ShieldCheck, activeClass: 'bg-emerald-50 border-emerald-300 text-emerald-700', iconActive: 'text-emerald-500' },
                                        { value: 'text', label: 'TEXT', icon: Type, activeClass: 'bg-slate-100 border-slate-300 text-slate-700', iconActive: 'text-slate-500' },
                                        { value: 'int', label: 'INT', icon: Hash, activeClass: 'bg-blue-50 border-blue-300 text-blue-700', iconActive: 'text-blue-500' },
                                        { value: 'boolean', label: 'BOOL', icon: ShieldCheck, activeClass: 'bg-rose-50 border-rose-300 text-rose-700', iconActive: 'text-rose-500' },
                                        { value: 'timestamp', label: 'TIME', icon: Calendar, activeClass: 'bg-purple-50 border-purple-300 text-purple-700', iconActive: 'text-purple-500' },
                                        { value: 'jsonb', label: 'JSON', icon: Database, activeClass: 'bg-orange-50 border-orange-300 text-orange-700', iconActive: 'text-orange-500' },
                                        { value: 'varchar', label: 'VARCHAR', icon: Type, activeClass: 'bg-slate-100 border-slate-300 text-slate-700', iconActive: 'text-slate-500' },
                                        { value: 'bigint', label: 'BIGINT', icon: Hash, activeClass: 'bg-blue-50 border-blue-300 text-blue-700', iconActive: 'text-blue-500' },
                                    ].map((t) => {
                                        const isActive = column.type.toLowerCase() === t.value;
                                        return (
                                            <button
                                                key={t.value}
                                                onClick={() => handleTypeChange(t.value)}
                                                className={`p-2.5 rounded-xl border text-center transition-all active:scale-95 ${isActive
                                                    ? `${t.activeClass} shadow-sm`
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                                    }`}
                                            >
                                                <t.icon className={`w-4 h-4 mx-auto mb-1 ${isActive ? t.iconActive : 'text-slate-400'}`} />
                                                <span className="text-[9px] font-bold uppercase tracking-wide">{t.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Constraints */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                    Constraints
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <ConstraintToggle
                                        label="Primary Key"
                                        shortLabel="PK"
                                        active={!!column.primary}
                                        onToggle={() => handlePropToggle('primary')}
                                        icon={Key}
                                        activeColor="amber"
                                    />
                                    <ConstraintToggle
                                        label="Required"
                                        shortLabel="NOT NULL"
                                        active={!column.nullable}
                                        onToggle={() => handlePropToggle('nullable')}
                                        icon={Database}
                                        activeColor="rose"
                                    />
                                    <ConstraintToggle
                                        label="Unique"
                                        shortLabel="UNIQUE"
                                        active={!!column.unique}
                                        onToggle={() => handlePropToggle('unique')}
                                        icon={ShieldCheck}
                                        activeColor="emerald"
                                    />
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                    <span className="font-medium">{constraintCount} constraint{constraintCount !== 1 ? 's' : ''} active</span>
                                </div>
                                <button
                                    onClick={() => setIsExpanded(false)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                                >
                                    Collapse
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

function ConstraintToggle({
    label,
    shortLabel,
    active,
    onToggle,
    icon: Icon,
    activeColor
}: {
    label: string,
    shortLabel: string,
    active: boolean,
    onToggle: () => void,
    icon: any,
    activeColor: string
}) {
    const colorMap: Record<string, { active: string, inactive: string }> = {
        amber: {
            active: 'bg-amber-100 border-amber-300 text-amber-700',
            inactive: 'bg-white border-slate-200 text-slate-400 hover:border-amber-200 hover:bg-amber-50'
        },
        rose: {
            active: 'bg-rose-100 border-rose-300 text-rose-700',
            inactive: 'bg-white border-slate-200 text-slate-400 hover:border-rose-200 hover:bg-rose-50'
        },
        emerald: {
            active: 'bg-emerald-100 border-emerald-300 text-emerald-700',
            inactive: 'bg-white border-slate-200 text-slate-400 hover:border-emerald-200 hover:bg-emerald-50'
        },
    };

    const colors = colorMap[activeColor] || colorMap.amber;

    return (
        <button
            onClick={onToggle}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all active:scale-95 ${active ? colors.active : colors.inactive}`}
            title={label}
        >
            <Icon className={`w-4 h-4 ${active ? '' : 'opacity-40'}`} />
            <span className={`text-[8px] font-black uppercase tracking-wider ${active ? '' : 'opacity-60'}`}>
                {shortLabel}
            </span>
        </button>
    );
}
