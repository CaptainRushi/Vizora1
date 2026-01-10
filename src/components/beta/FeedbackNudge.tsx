import { useState, useEffect } from 'react';
import { Sparkles, MessageSquareHeart, X } from 'lucide-react';
import { FeedbackPrompt, FeedbackContext } from './FeedbackPrompt';

interface FeedbackNudgeProps {
    context: FeedbackContext;
    delay?: number;
}

export function FeedbackNudge({ context, delay = 5000 }: FeedbackNudgeProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (!dismissed) {
                setIsVisible(true);
            }
        }, delay);

        return () => clearTimeout(timer);
    }, [delay, dismissed]);

    return (
        <>
            {isVisible && !dismissed && !showModal && (
                <div className="fixed bottom-24 right-8 z-[80] animate-in slide-in-from-right-10 duration-200">
                    <div className="bg-indigo-900 rounded-[2rem] p-6 shadow-2xl shadow-indigo-900/40 text-white max-w-[320px] relative overflow-hidden group border border-white/10">
                        <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl" />

                        <button
                            onClick={() => setDismissed(true)}
                            className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Sparkles className="w-4 h-4 text-indigo-200" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Beta Feedback</span>
                        </div>

                        <p className="text-sm font-bold text-white mb-6 leading-relaxed">
                            Got 30 seconds to help us improve Vizora?
                        </p>

                        <button
                            onClick={() => {
                                setShowModal(true);
                                setIsVisible(false);
                            }}
                            className="w-full py-3 bg-white text-indigo-900 rounded-2xl font-black text-xs hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                        >
                            <MessageSquareHeart className="w-4 h-4" />
                            Sure, let's go
                        </button>
                    </div>
                </div>
            )}

            {showModal && (
                <FeedbackPrompt
                    onClose={() => setShowModal(false)}
                    context={context}
                />
            )}
        </>
    );
}
