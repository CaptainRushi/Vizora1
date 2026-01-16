
import { motion } from 'framer-motion';
import { X, RotateCcw, ChevronRight, Hash } from 'lucide-react';
import { UnifiedSchema } from '../../lib/schema-types';

interface HistoryPanelProps {
    history: UnifiedSchema[];
    currentSchema: UnifiedSchema;
    onRestore: (schema: UnifiedSchema) => void;
    onClose: () => void;
}

export function HistoryPanel({
    history,
    currentSchema,
    onRestore,
    onClose
}: HistoryPanelProps) {
    // We combine history and current for the list
    const allVersions = [...history, currentSchema].reverse();

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-24 right-8 w-[380px] max-h-[70vh] bg-white/90 backdrop-blur-xl border border-slate-200/60 rounded-[2.5rem] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-[100] overflow-hidden"
        >
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-6 bg-gradient-to-r from-slate-50/50 to-white">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">Session History</span>
                    <h2 className="text-base font-black text-slate-800 tracking-tight">Timeline</h2>
                </div>
                <button onClick={onClose} className="p-2 bg-slate-100/50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                {allVersions.map((rev, idx) => {
                    const isCurrent = rev === currentSchema;
                    const tableCount = Object.keys(rev.tables).length;

                    return (
                        <div
                            key={idx}
                            onClick={() => !isCurrent && onRestore(rev)}
                            className={`
                                group relative p-5 rounded-2xl border transition-all cursor-pointer
                                ${isCurrent
                                    ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100'
                                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-100'
                                }
                            `}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${isCurrent ? 'bg-white/20' : 'bg-slate-100'}`}>
                                        <RotateCcw className={`h-3 w-3 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-indigo-100' : 'text-slate-400'}`}>
                                        {isCurrent ? 'Current Version' : `Revision ${allVersions.length - idx}`}
                                    </span>
                                </div>
                                {!isCurrent && <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />}
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <Hash className={`h-4 w-4 ${isCurrent ? 'text-indigo-200' : 'text-slate-300'}`} />
                                    <span className={`text-sm font-black ${isCurrent ? 'text-white' : 'text-slate-700'}`}>{tableCount} Tables</span>
                                </div>
                                <div className="h-1 w-1 rounded-full bg-slate-300" />
                                <span className={`text-xs font-medium ${isCurrent ? 'text-indigo-100' : 'text-slate-500'}`}>
                                    {isCurrent ? 'Saving automatically...' : 'Click to restore'}
                                </span>
                            </div>

                            {isCurrent && (
                                <motion.div
                                    layoutId="active-rev"
                                    className="absolute inset-0 rounded-2xl ring-2 ring-indigo-500 ring-offset-2 pointer-events-none"
                                />
                            )}
                        </div>
                    );
                })}

                {allVersions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                        <div className="p-4 bg-slate-50 rounded-full">
                            <RotateCcw className="h-8 w-8 text-slate-200" />
                        </div>
                        <p className="text-sm font-bold text-slate-400">No history available for this session.</p>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-start gap-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5" />
                    <div className="flex-1">
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Real-time Backup</h4>
                        <p className="text-[10px] font-medium text-slate-500 leading-relaxed mt-1">Every change you make is recorded.</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
