import { Sparkles, Brain, Database, ShieldCheck } from 'lucide-react';

interface LoadingSectionProps {
    title?: string;
    subtitle?: string;
    variant?: 'full' | 'inline' | 'minimal';
}

export function LoadingSection({
    title = "Analyzing schema intelligence...",
    subtitle = "Preparing your database clarity with Vizora AI.",
    variant = 'full'
}: LoadingSectionProps) {
    if (variant === 'minimal') {
        return (
            <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</span>
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <div className="relative">
                    <div className="h-12 w-12 rounded-full border-4 border-slate-100" />
                    <div className="absolute top-0 h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                    <Brain className="h-5 w-5 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <div className="text-center">
                    <h3 className="text-sm font-black text-slate-900">{title}</h3>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-1">{subtitle}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[70vh] flex-col items-center justify-center space-y-10 animate-in fade-in duration-700 relative overflow-hidden rounded-[3rem]">
            {/* Mesh Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 animate-mesh -z-10" />

            <div className="relative group">
                {/* Outer decorative ring */}
                <div className="absolute -inset-8 rounded-full bg-indigo-100/30 animate-pulse opacity-50 blur-xl" />
                <div className="absolute -inset-4 rounded-full bg-indigo-50 animate-pulse opacity-50" />

                {/* Rotating Rings */}
                <div className="relative h-24 w-24">
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-50" />
                    <div className="absolute inset-0 h-24 w-24 animate-[spin_2s_linear_infinite] rounded-full border-4 border-indigo-600 border-t-transparent shadow-[0_0_15px_rgba(79,70,229,0.2)]" />
                    <div className="absolute inset-2 h-20 w-20 animate-[spin_1.5s_linear_infinite_reverse] rounded-full border-4 border-purple-400 border-b-transparent opacity-50 shadow-[0_0_10px_rgba(192,132,252,0.1)]" />

                    {/* Floating Icons */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="relative">
                            <Database className="h-10 w-10 text-indigo-600 animate-pulse" />
                            <Sparkles className="h-4 w-4 text-purple-500 absolute -top-2 -right-2 animate-bounce" />
                        </div>
                    </div>
                </div>

                {/* Satellite Icons with Refined Styling */}
                <div className="absolute -top-6 -left-6 bg-white p-2.5 rounded-2xl shadow-xl shadow-indigo-100/50 border border-indigo-50 animate-float">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-white p-2.5 rounded-2xl shadow-xl shadow-purple-100/50 border border-purple-50 animate-float-delayed-1">
                    <Brain className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="absolute top-0 -right-12 bg-white p-1.5 rounded-xl shadow-lg border border-slate-50 animate-float-delayed-2 opacity-60">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                </div>
            </div>

            <div className="text-center space-y-4 max-w-md px-6">
                <div className="inline-flex items-center gap-2.5 px-4 py-1.5 bg-white shadow-sm rounded-full text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] animate-fadeIn border border-indigo-50">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
                    </span>
                    AI Intel Engine Active
                </div>

                <div className="space-y-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        {subtitle}
                    </p>
                </div>

                {/* Interactive Progress Bar instead of just dots */}
                <div className="w-48 h-1.5 bg-slate-100 rounded-full mx-auto overflow-hidden relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 w-full animate-[shimmer_2s_infinite] -translate-x-full" />
                </div>

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Optimization Pass 0.4s
                </p>
            </div>
        </div>
    );
}

