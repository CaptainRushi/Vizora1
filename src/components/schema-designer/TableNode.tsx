
import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { Trash2, Key, Link as LinkIcon, Plus, MoreVertical } from 'lucide-react';
import { UnifiedColumn } from '../../lib/schema-types';

export const TableNode = memo(({ id, data, selected }: NodeProps) => {
    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`
                relative bg-white border-2 rounded-2xl shadow-xl overflow-hidden min-w-[240px] group transition-all duration-300
                ${selected ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200'}
            `}
        >
            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between border-b transition-colors ${selected ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50/50 border-slate-100'}`}>
                <div className="flex items-center gap-2 flex-1">
                    <div className={`w-2 h-2 rounded-full ${selected ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`} />
                    <input
                        className="bg-transparent border-none focus:ring-0 font-black text-slate-800 text-xs uppercase tracking-wider w-full outline-none"
                        value={data.label}
                        onChange={(e) => data.onUpdateTableName?.(id, e.target.value)}
                        placeholder="Table Name"
                    />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => data.onDeleteTable?.(id)} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors">
                        <Trash2 className="h-3 w-3" />
                    </button>
                    <MoreVertical className="h-4 w-4 text-slate-400" />
                </div>
            </div>

            {/* Body */}
            <div className="py-1 bg-white flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar">
                {Object.entries(data.columns as Record<string, UnifiedColumn>).map(([name, col]) => (
                    <div
                        key={name}
                        className={`
                            relative flex items-center justify-between px-4 py-2 hover:bg-indigo-50/30 group/col text-[11px] transition-colors cursor-pointer
                            ${data.hoveredColumn === name ? 'bg-indigo-50/50' : ''}
                        `}
                    >
                        <Handle
                            type="target"
                            position={Position.Left}
                            id={`${data.label}.${name}.target`}
                            className={`!w-2.5 !h-2.5 !border-2 !border-white !bg-slate-300 transition-all
                                ${selected ? 'opacity-100' : 'opacity-40 group-hover/col:opacity-100'}
                            `}
                            style={{ left: -5 }}
                        />

                        <div className="flex items-center gap-2.5 min-w-0 pr-4 w-full">
                            {col.primary ? (
                                <Key className="h-3 w-3 text-amber-500 shrink-0" />
                            ) : col.foreign_key ? (
                                <LinkIcon className="h-3 w-3 text-indigo-400 shrink-0" />
                            ) : (
                                <div className="w-3" />
                            )}
                            <input
                                className="bg-transparent border-none focus:ring-0 font-bold text-slate-700 w-full outline-none truncate"
                                value={name}
                                onChange={(e) => data.onUpdateColumnName?.(id, name, e.target.value)}
                                placeholder="column_name"
                            />
                            <span className="text-[9px] text-slate-400 font-mono uppercase italic opacity-60 ml-auto shrink-0">{col.type}</span>
                        </div>

                        <Handle
                            type="source"
                            position={Position.Right}
                            id={`${data.label}.${name}.source`}
                            className={`!w-2.5 !h-2.5 !border-2 !border-white !bg-indigo-400 transition-all
                                ${selected ? 'opacity-100' : 'opacity-40 group-hover/col:opacity-100'}
                            `}
                            style={{ right: -5 }}
                        />
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="px-4 py-2 border-t border-slate-50 flex items-center justify-center bg-slate-50/30">
                <button
                    onClick={() => data.onAddColumn?.(id)}
                    className="flex items-center gap-1.5 px-3 py-1 hover:bg-white hover:shadow-sm rounded-lg text-[10px] font-black text-indigo-600 uppercase tracking-widest transition-all border border-transparent hover:border-indigo-100"
                >
                    <Plus className="h-3 w-3" />
                    Add Field
                </button>
            </div>
        </motion.div>
    );
});

TableNode.displayName = 'TableNode';
