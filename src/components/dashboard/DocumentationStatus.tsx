
import { Clock, RefreshCw, FileText } from 'lucide-react';

interface Props {
    version: string;
    lastGenerated: string | null;
    isGenerating: boolean;
    onRegenerate: () => void;
}

export function DocumentationStatus({ version, lastGenerated, isGenerating, onRegenerate }: Props) {
    return (
        <div className="bg-white border border-gray-100 rounded-3xl p-6 space-y-6 flex flex-col shadow-sm">
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                    <FileText className="h-6 w-6" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-gray-900 tracking-tight">Auto Documentation</h3>
                        {lastGenerated && (
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                    </div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                        {lastGenerated ? `Synchronized v${version}` : 'Awaiting Generation'}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <button
                    onClick={onRegenerate}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                >
                    <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                    {isGenerating ? 'Processing...' : 'Regenerate Docs'}
                </button>

                {lastGenerated && (
                    <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        <Clock className="h-3 w-3" />
                        Capture: {lastGenerated.split(',')[0]}
                    </div>
                )}
            </div>
        </div>
    );
}
