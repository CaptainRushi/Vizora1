
import { motion, useDragControls } from 'framer-motion';
import { X, Trash2, Link2, ShieldAlert } from 'lucide-react';
import { UnifiedSchema } from '../../lib/schema-types';

interface EdgePropertiesPanelProps {
    edge: any;
    schema: UnifiedSchema;
    onDelete: (edgeId: string) => void;
    onUpdateRelation: (sourceTable: string, relationIndex: number, data: any) => void;
    onClose: () => void;
}

export function EdgePropertiesPanel({
    edge,
    schema,
    onDelete,
    onUpdateRelation,
    onClose
}: EdgePropertiesPanelProps) {
    const sourceTable = edge.source;
    const sourceHandle = edge.sourceHandle;
    const targetTable = edge.target;
    const targetHandle = edge.targetHandle;

    const table = schema.tables[sourceTable];
    const sCol = sourceHandle?.split('.')[1];
    const tCol = targetHandle?.split('.')[1];

    const relationIndex = table?.relations.findIndex(r => r.from === sCol && r.to === `${targetTable}.${tCol}`);
    const relation = relationIndex !== -1 ? (table.relations[relationIndex] as any) : null;

    const dragControls = useDragControls();

    if (!relation) return null;

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
            <div
                onPointerDown={(e) => dragControls.start(e)}
                className="h-16 border-b border-slate-100/50 flex items-center justify-between px-6 bg-gradient-to-r from-slate-50/80 to-white/80 cursor-grab active:cursor-grabbing select-none"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                        <Link2 className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em] leading-none mb-1">Relationship</span>
                        <h2 className="text-sm font-black text-slate-800 tracking-tight">FK Constraint</h2>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-0.5 mr-2 opacity-20 group-hover:opacity-40 transition-opacity">
                        <div className="w-4 h-0.5 bg-slate-400 rounded-full" />
                        <div className="w-4 h-0.5 bg-slate-400 rounded-full" />
                        <div className="w-4 h-0.5 bg-slate-400 rounded-full" />
                    </div>
                    <button onClick={onClose} className="p-2.5 bg-slate-200/50 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-all">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span>Source</span>
                        <Link2 className="h-4 w-4 text-slate-300" />
                        <span>Target</span>
                    </div>
                    <div className="flex items-center justify-between items-center bg-white p-4 rounded-xl border border-slate-100">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-indigo-500 uppercase">{sourceTable}</span>
                            <span className="text-sm font-bold text-slate-700">{sCol}</span>
                        </div>
                        <div className="w-8 h-px bg-slate-200" />
                        <div className="flex flex-col text-right">
                            <span className="text-[10px] font-black text-indigo-500 uppercase">{targetTable}</span>
                            <span className="text-sm font-bold text-slate-700">{tCol}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Relationship Type</label>
                        <select
                            value={relation.type}
                            onChange={(e) => onUpdateRelation(sourceTable, relationIndex!, { ...relation, type: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200/60 rounded-[1.25rem] text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all cursor-pointer"
                        >
                            <option value="many_to_one">Many-to-One</option>
                            <option value="one_to_one">One-to-One</option>
                            <option value="one_to_many">One-to-Many</option>
                            <option value="many_to_many">Many-to-Many</option>
                        </select>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-500 uppercase ml-1">On Delete Action</label>
                        <select
                            value={relation.on_delete || 'NO ACTION'}
                            onChange={(e) => onUpdateRelation(sourceTable, relationIndex!, { ...relation, on_delete: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200/60 rounded-[1.25rem] text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all cursor-pointer"
                        >
                            <option value="CASCADE">CASCADE</option>
                            <option value="SET NULL">SET NULL</option>
                            <option value="RESTRICT">RESTRICT</option>
                            <option value="NO ACTION">NO ACTION</option>
                        </select>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-500 uppercase ml-1">On Update Action</label>
                        <select
                            value={relation.on_update || 'NO ACTION'}
                            onChange={(e) => onUpdateRelation(sourceTable, relationIndex!, { ...relation, on_update: e.target.value })}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200/60 rounded-[1.25rem] text-sm font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all cursor-pointer"
                        >
                            <option value="CASCADE">CASCADE</option>
                            <option value="SET NULL">SET NULL</option>
                            <option value="RESTRICT">RESTRICT</option>
                            <option value="NO ACTION">NO ACTION</option>
                        </select>
                    </div>

                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                        <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium text-amber-700 leading-relaxed">Referential integrity actions define what happens to the child record when the parent record is modified or deleted.</p>
                    </div>
                </div>

                <div className="pt-10 border-t border-slate-100 pb-8">
                    <button
                        onClick={() => onDelete(edge.id)}
                        className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-3 border border-red-100 group"
                    >
                        <Trash2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        Remove Link
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
