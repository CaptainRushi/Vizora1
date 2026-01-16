import { Sparkles, Beaker } from 'lucide-react';

interface BillingGateProps {
    featureName: string;
    description: string;
}

export function BillingGate({ featureName }: BillingGateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[3rem] border-4 border-dashed border-indigo-50 shadow-2xl shadow-indigo-100/20">
            <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 relative">
                <Beaker className="h-8 w-8 text-indigo-400" />
                <div className="absolute -top-2 -right-2 bg-indigo-600 rounded-full p-2 shadow-lg shadow-indigo-200">
                    <Sparkles className="h-4 w-4 text-white" />
                </div>
            </div>

            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
                Developing {featureName}
            </h3>

            <p className="text-gray-500 font-medium max-w-sm mb-10 leading-relaxed text-sm">
                This feature is currently being refined during our private beta. We're working hard to make it perfect for you.
            </p>

            <button
                disabled={true}
                className="group flex items-center gap-3 bg-gray-50 text-gray-400 px-10 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-none cursor-not-allowed border-2 border-dashed border-gray-100 transition-all"
            >
                Beta Access Only
            </button>
        </div>
    );
}

interface UnlockPromptProps {
    message: string;
}

export function UnlockPrompt({ message }: UnlockPromptProps) {
    return (
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-3xl text-white shadow-xl shadow-indigo-900/20">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                    <Beaker className="h-6 w-6 text-indigo-300" />
                </div>
                <div>
                    <p className="text-sm font-black tracking-tight leading-tight">{message}</p>
                    <p className="text-[10px] text-indigo-200 font-medium uppercase tracking-widest mt-1">Private Beta Period</p>
                </div>
            </div>
            <button
                disabled={true}
                className="px-6 py-3 bg-white/10 text-white/50 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] cursor-not-allowed border border-white/10"
            >
                Beta Status
            </button>
        </div>
    );
}
