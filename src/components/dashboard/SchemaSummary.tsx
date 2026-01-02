
import { Sparkles } from 'lucide-react';

interface Props {
    summary: string;
    mode: 'developer' | 'pm' | 'onboarding';
    onModeChange: (mode: 'developer' | 'pm' | 'onboarding') => void;
}

export function SchemaSummary({ summary, mode, onModeChange }: Props) {
    return (
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-xl">
                        <Sparkles className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">AI Architecture Summary</h3>
                        <p className="text-xs font-medium text-gray-500 mt-0.5">Automated high-level understanding</p>
                    </div>
                </div>

                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                    {(['developer', 'pm', 'onboarding'] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => onModeChange(m)}
                            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {m === 'pm' ? 'Product' : m}
                        </button>
                    ))}
                </div>
            </div>

            <div className="relative">
                <div className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {summary || "Generate AI explanations to see a summary of your database architecture here."}
                </div>

                {mode === 'onboarding' && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 italic">
                        <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1">Onboarding Guide</p>
                        <p className="text-xs text-amber-800 font-medium">Summarizing for team members who are new to this codebase.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
