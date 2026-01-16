import { X, Beaker, CheckCircle2, ShieldAlert, Sparkles, MessageSquareHeart } from 'lucide-react';

interface AboutBetaModalProps {
    onClose: () => void;
    limitReached?: boolean;
    type?: 'project' | 'version';
    onGetNotified?: () => void;
}

export function AboutBetaModal({ onClose, limitReached, type, onGetNotified }: AboutBetaModalProps) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-[540px] overflow-hidden transform transition-all scale-100 border border-white/20">

                {/* Header */}
                <div className="relative h-32 bg-indigo-600 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-90" />
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                    <div className="relative z-10 flex flex-col items-center gap-2">
                        <div className="bg-white/20 backdrop-blur-xl p-3 rounded-2xl ring-1 ring-white/30">
                            <Beaker className="w-8 h-8 text-white" />
                        </div>
                        <span className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">Private Beta System</span>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-xl bg-black/10 text-white hover:bg-black/20 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-10">
                    {limitReached ? (
                        <div className="space-y-6 text-center">
                            <div className="mx-auto w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mb-2">
                                <ShieldAlert className="w-8 h-8 text-red-500" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Private Beta Limit Reached</h2>
                                <p className="text-gray-500 leading-relaxed px-4 text-center">
                                    {type === 'project'
                                        ? "You can't create more than 2 projects during the private beta."
                                        : "You can't create more than 5 versions per project during the private beta."}
                                </p>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-sm text-gray-600 font-medium">
                                We're currently in a controlled beta to gather feedback and refine the core experience before our public launch.
                            </div>

                            <div className="pt-4 flex flex-col gap-3">
                                <button
                                    onClick={onGetNotified}
                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-lg shadow-gray-900/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Get notified when beta ends
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-4 bg-white text-gray-400 rounded-2xl font-bold text-sm hover:text-gray-600 transition-all"
                                >
                                    I understand
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Welcome to Private Beta</h2>
                                <p className="text-gray-500 leading-relaxed font-medium">
                                    You’re using an early version of Vizora. We appreciate your help in testing the product!
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {[
                                    { icon: CheckCircle2, text: "Maximum 2 projects per user", color: "text-green-500" },
                                    { icon: CheckCircle2, text: "Up to 5 schema versions per project", color: "text-green-500" },
                                    { icon: MessageSquareHeart, text: "Focus on meaningful, structured feedback", color: "text-indigo-500" },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                        <item.icon className={`w-5 h-5 shrink-0 ${item.color}`} />
                                        <span className="text-sm font-bold text-gray-700">{item.text}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest text-center">What happens after beta?</p>
                                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 text-center">
                                    <p className="text-sm text-indigo-700 font-bold leading-relaxed">
                                        You'll be able to keep all your data as we approach our official launch. No data will be lost when the beta period ends.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-lg shadow-gray-900/20 active:scale-95"
                            >
                                Got it, let's explore
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
