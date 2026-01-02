
import { useState, useEffect } from 'react';
import { UnifiedSchema, UnifiedColumn } from '../../lib/schema-types';
import { X, Plus, Trash2, Key, RefreshCw } from 'lucide-react';

interface PropertiesPanelProps {
    selectedNodeId: string | null;
    schema: UnifiedSchema;
    onUpdateTable: (oldName: string, newName: string, description?: string) => void;
    onUpdateColumn: (tableName: string, oldColName: string, newColName: string, colData: UnifiedColumn) => void;
    onAddColumn: (tableName: string) => void;
    onDeleteColumn: (tableName: string, colName: string) => void;
    onDeleteTable: (tableName: string) => void;
    onClose: () => void;
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
    if (!table) return null; // Selected node might not be a table (could be edge, or deleted)

    const [tableName, setTableName] = useState(selectedNodeId);

    // Sync local state when selection changes
    useEffect(() => {
        setTableName(selectedNodeId);
    }, [selectedNodeId]);

    const handleTableNameBlur = () => {
        if (tableName !== selectedNodeId && tableName.trim()) {
            onUpdateTable(selectedNodeId, tableName);
        }
    };

    return (
        <div className="w-[360px] h-full bg-white border-l border-slate-200 flex flex-col shadow-xl z-20 shrink-0 animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="h-14 border-b border-slate-100 flex items-center justify-between px-6 bg-slate-50/50">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Properties</span>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {/* Table Properties */}
                <div className="space-y-4">
                    <label className="block text-sm font-bold text-slate-900">Table Name</label>
                    <div className="flex gap-2">
                        <input
                            value={tableName}
                            onChange={(e) => setTableName(e.target.value)}
                            onBlur={handleTableNameBlur}
                            onKeyDown={(e) => e.key === 'Enter' && handleTableNameBlur()}
                            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                    </div>
                </div>

                {/* Columns List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="block text-sm font-bold text-slate-900">Columns</label>
                        <button
                            onClick={() => onAddColumn(selectedNodeId)}
                            className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="space-y-3">
                        {Object.entries(table.columns).map(([colName, col]) => (
                            <ColumnEditor
                                key={colName}
                                colName={colName}
                                column={col}
                                onUpdate={(oldN, newN, c) => onUpdateColumn(selectedNodeId, oldN, newN, c)}
                                onDelete={() => onDeleteColumn(selectedNodeId, colName)}
                            />
                        ))}
                    </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-8 border-t border-slate-100">
                    <button
                        onClick={() => onDeleteTable(selectedNodeId)}
                        className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete Table
                    </button>
                </div>
            </div>

            {/* Footer Status */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-400 font-medium flex justify-between">
                <span>{Object.keys(table.columns).length} Columns</span>
                <span>{table.relations.length} Relations</span>
            </div>
        </div>
    );
}

// Sub-component for individual column editing
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
    const [data, setData] = useState({ ...column, name: colName });

    const handleChange = (field: keyof UnifiedColumn | 'name', value: any) => {
        const newData = { ...data, [field]: value };
        setData(newData);
        // Auto save on boolean toggles or select changes? 
        // Ideally we wait for blur on text fields, but immediate for checkboxes.
        if (field !== 'name' && field !== 'type') {
            // For simplicity, constructing the object to pass back
            const { name, ...rest } = newData;
            onUpdate(colName, name, rest);
        }
    };

    // For name/type, save on blur or specific action to avoid jitter
    const handleCommit = () => {
        const { name, ...rest } = data;
        onUpdate(colName, name, rest);
    };

    return (
        <div className={`bg-slate-50 border border-slate-200 rounded-xl transition-all ${isExpanded ? 'shadow-md ring-1 ring-slate-200' : ''}`}>
            {/* Condensed Row */}
            <div className="flex items-center gap-2 p-3">
                <div
                    className="cursor-pointer p-1 text-slate-400 hover:text-slate-600"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <RefreshCw className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>

                <input
                    value={data.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    onBlur={handleCommit}
                    className="flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none min-w-0"
                />

                <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono uppercase">
                    {data.type}
                </span>

                {data.primary && <Key className="h-3 w-3 text-amber-500" />}

                <button onClick={onDelete} className="text-slate-300 hover:text-red-500 ml-1">
                    <Trash2 className="h-3 w-3" />
                </button>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-3 pb-3 pt-0 grid grid-cols-2 gap-3 animate-in slide-in-from-top-1 duration-200">
                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Type</label>
                        <select
                            value={data.type}
                            onChange={(e) => { handleChange('type', e.target.value); handleCommit(); }} // commit immediately
                            className="w-full mt-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium outline-none"
                        >
                            <option value="uuid">UUID</option>
                            <option value="text">TEXT</option>
                            <option value="varchar">VARCHAR</option>
                            <option value="integer">INTEGER</option>
                            <option value="boolean">BOOLEAN</option>
                            <option value="timestamp">TIMESTAMP</option>
                            <option value="jsonb">JSONB</option>
                        </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors">
                        <input type="checkbox" checked={data.primary} onChange={(e) => handleChange('primary', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-0" />
                        <span className="text-xs font-medium text-slate-600">Primary Key</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors">
                        <input type="checkbox" checked={data.nullable} onChange={(e) => handleChange('nullable', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-0" />
                        <span className="text-xs font-medium text-slate-600">Nullable</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors">
                        <input type="checkbox" checked={data.unique} onChange={(e) => handleChange('unique', e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-0" />
                        <span className="text-xs font-medium text-slate-600">Unique</span>
                    </label>
                </div>
            )}
        </div>
    );
}
