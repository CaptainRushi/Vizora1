
import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Key, Link as LinkIcon, Plus, MoreVertical, Edit3, Copy, Settings } from 'lucide-react';
import { UnifiedColumn } from '../../lib/schema-types';

export const TableNode = memo(({ id, data, selected }: NodeProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(data.label);
    const [showMenu, setShowMenu] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Sync edit value when data.label changes
    useEffect(() => {
        setEditValue(data.label);
    }, [data.label]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    const handleRenameSubmit = () => {
        if (editValue.trim() && editValue !== data.label) {
            data.onUpdateTableName?.(id, editValue.trim());
        } else {
            setEditValue(data.label);
        }
        setIsEditing(false);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setEditValue(data.label);
            setIsEditing(false);
        }
    };

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`
                relative bg-white border-2 rounded-2xl shadow-xl overflow-visible min-w-[240px] group transition-all duration-300
                ${selected ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200'}
            `}
        >
            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between border-b transition-colors ${selected ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50/50 border-slate-100'}`}>
                <div className="flex items-center gap-2 flex-1">
                    <div className={`w-2 h-2 rounded-full ${selected ? 'bg-indigo-500 animate-pulse' : 'bg-slate-300'}`} />
                    {isEditing ? (
                        <input
                            ref={inputRef}
                            className="bg-white border border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 rounded-lg px-2 py-1 font-black text-slate-800 text-xs uppercase tracking-wider w-full outline-none"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={handleRenameKeyDown}
                            placeholder="Table Name"
                        />
                    ) : (
                        <span
                            className="font-black text-slate-800 text-xs uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors"
                            onDoubleClick={() => setIsEditing(true)}
                            title="Double-click to rename"
                        >
                            {data.label}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
                    <button
                        onClick={() => data.onDeleteTable?.(id)}
                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors"
                        title="Delete table"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                        className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                    >
                        <MoreVertical className="h-4 w-4" />
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                ref={menuRef}
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                className="absolute top-full right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden"
                            >
                                <button
                                    onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <Edit3 className="w-4 h-4 text-slate-400" />
                                    Rename Table
                                </button>
                                <button
                                    onClick={() => { data.onAddColumn?.(id); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <Plus className="w-4 h-4 text-slate-400" />
                                    Add Column
                                </button>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(data.label); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <Copy className="w-4 h-4 text-slate-400" />
                                    Copy Name
                                </button>
                                <button
                                    onClick={() => { data.onSelectNode?.(id); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <Settings className="w-4 h-4 text-slate-400" />
                                    Properties
                                </button>
                                <div className="border-t border-slate-100" />
                                <button
                                    onClick={() => { data.onDeleteTable?.(id); setShowMenu(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Table
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Body */}
            <div className="py-1 bg-white flex flex-col">
                {Object.entries(data.columns as Record<string, UnifiedColumn>).map(([name, col]) => (
                    <ColumnRow
                        key={name}
                        id={id}
                        name={name}
                        col={col}
                        selected={selected}
                        label={data.label}
                        hoveredColumn={data.hoveredColumn}
                        onUpdateColumnName={data.onUpdateColumnName}
                    />
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

// Separate component for column rows to handle their own editing state
function ColumnRow({
    id,
    name,
    col,
    selected,
    label,
    hoveredColumn,
    onUpdateColumnName
}: {
    id: string;
    name: string;
    col: UnifiedColumn;
    selected: boolean;
    label: string;
    hoveredColumn?: string;
    onUpdateColumnName?: (tableId: string, oldName: string, newName: string) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(name);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditValue(name);
    }, [name]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleSubmit = () => {
        if (editValue.trim() && editValue !== name) {
            onUpdateColumnName?.(id, name, editValue.trim());
        } else {
            setEditValue(name);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            setEditValue(name);
            setIsEditing(false);
        }
    };

    return (
        <div
            className={`
                relative flex items-center justify-between px-4 py-2 hover:bg-indigo-50/30 group/col text-[11px] transition-colors cursor-pointer
                ${hoveredColumn === name ? 'bg-indigo-50/50' : ''}
            `}
        >
            <Handle
                type="target"
                position={Position.Left}
                id={`${label}.${name}.target`}
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
                {isEditing ? (
                    <input
                        ref={inputRef}
                        className="bg-white border border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 rounded px-1.5 py-0.5 font-bold text-slate-700 w-full outline-none text-[11px]"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSubmit}
                        onKeyDown={handleKeyDown}
                        placeholder="column_name"
                    />
                ) : (
                    <span
                        className="font-bold text-slate-700 truncate cursor-pointer hover:text-indigo-600 transition-colors"
                        onDoubleClick={() => setIsEditing(true)}
                        title="Double-click to rename"
                    >
                        {name}
                    </span>
                )}
                <span className="text-[9px] text-slate-400 font-mono uppercase italic opacity-60 ml-auto shrink-0">{col.type}</span>
            </div>

            <Handle
                type="source"
                position={Position.Right}
                id={`${label}.${name}.source`}
                className={`!w-2.5 !h-2.5 !border-2 !border-white !bg-indigo-400 transition-all
                    ${selected ? 'opacity-100' : 'opacity-40 group-hover/col:opacity-100'}
                `}
                style={{ right: -5 }}
            />
        </div>
    );
}

TableNode.displayName = 'TableNode';
