
import { PlusCircle, MinusCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface Change {
    id: string;
    change_type: string;
    entity_name: string;
    details?: any;
}

interface Props {
    changes: Change[];
    onViewHistory: () => void;
    onCompare: () => void;
}

export function RecentChanges({ changes, onViewHistory, onCompare }: Props) {
    const getIcon = (type: string) => {
        if (type.includes('added')) return <PlusCircle className="h-4 w-4 text-green-500" />;
        if (type.includes('removed')) return <MinusCircle className="h-4 w-4 text-red-500" />;
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    };

    const getLabel = (type: string) => {
        if (type.includes('added')) return 'Added';
        if (type.includes('removed')) return 'Removed';
        return 'Modified';
    };

    const getColorClass = (type: string) => {
        if (type.includes('added')) return 'bg-green-50 text-green-700';
        if (type.includes('removed')) return 'bg-red-50 text-red-700';
        return 'bg-blue-50 text-blue-700';
    };

    return (
        <div className="bg-white border border-gray-100 rounded-3xl p-8 h-full flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Recent Changes</h3>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">Automated diff from latest version</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={onCompare} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-900 transition-colors">Compare versions</button>
                    <button onClick={onViewHistory} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View History</button>
                </div>
            </div>

            <div className="flex-1 space-y-4 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                {changes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <p className="text-sm font-bold text-gray-400 italic">No schema changes detected in the last version.</p>
                    </div>
                ) : (
                    changes.map((change) => (
                        <div key={change.id} className="flex items-center justify-between group py-1">
                            <div className="flex items-center gap-3">
                                {getIcon(change.change_type)}
                                <span className="text-sm font-bold text-gray-800">{change.entity_name}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${getColorClass(change.change_type)}`}>
                                    {getLabel(change.change_type)}
                                </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                {change.change_type.replace('_', ' ')}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={onViewHistory}
                className="mt-8 flex items-center justify-center gap-2 w-full py-3 bg-gray-50 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-100 transition-all active:scale-95"
            >
                View full change history
                <ArrowRight className="h-3 w-3" />
            </button>
        </div>
    );
}
