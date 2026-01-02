import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

interface BillingGateProps {
    featureName: string;
    description: string;
}

export function BillingGate({ featureName, description }: BillingGateProps) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-[3rem] border-4 border-dashed border-indigo-50 shadow-2xl shadow-indigo-100/20">
            <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6 relative">
                <Lock className="h-8 w-8 text-indigo-400" />
                <div className="absolute -top-2 -right-2 bg-indigo-600 rounded-full p-2 shadow-lg shadow-indigo-200 animate-bounce">
                    <Sparkles className="h-4 w-4 text-white" />
                </div>
            </div>

            <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">
                Upgrade to unlock {featureName}
            </h3>

            <p className="text-gray-500 font-medium max-w-sm mb-10 leading-relaxed text-sm">
                {description}
            </p>

            <button
                onClick={() => navigate('/billing')}
                className="group flex items-center gap-3 bg-indigo-600 text-white px-10 py-5 rounded-[2rem] text-sm font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95"
            >
                View Plans & Upgrade
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
        </div>
    );
}

interface UpgradePromptProps {
    message: string;
}

export function UpgradePrompt({ message }: UpgradePromptProps) {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-between p-6 bg-indigo-900 rounded-3xl text-white shadow-xl shadow-indigo-900/20">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                    <Sparkles className="h-6 w-6 text-indigo-300" />
                </div>
                <div>
                    <p className="text-sm font-black tracking-tight leading-tight">{message}</p>
                    <p className="text-[10px] text-indigo-200 font-medium uppercase tracking-widest mt-1">Free Tier Limit Reached</p>
                </div>
            </div>
            <button
                onClick={() => navigate('/billing')}
                className="px-6 py-3 bg-white text-indigo-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors shrink-0"
            >
                Upgrade
            </button>
        </div>
    );
}
