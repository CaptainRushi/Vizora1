import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareHeart, Send, X, CheckCircle2, Loader2, Star } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useProject } from '../../hooks/useProject';

export type FeedbackContext = 'dashboard' | 'diagram' | 'docs' | 'schema_paste' | 'limit_hit';

interface FeedbackPromptProps {
    onClose: () => void;
    context: FeedbackContext;
}

export function FeedbackPrompt({ onClose, context }: FeedbackPromptProps) {
    const { user } = useAuth();
    const { projectId } = useProject();
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [rating, setRating] = useState<number>(0);
    const [confusing, setConfusing] = useState('');
    const [helpful, setHelpful] = useState('');
    const [missing, setMissing] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!rating || !user) return;

        setLoading(true);
        setError(null);
        try {
            await api.submitFeedback({
                user_id: user.id,
                project_id: projectId || undefined,
                context,
                rating,
                confusing: confusing.trim() || undefined,
                helpful: helpful.trim() || undefined,
                missing: missing.trim() || undefined
            });

            setStep('success');
            setTimeout(() => onClose(), 2000);
        } catch (err: any) {
            console.error('Feedback submit failed:', err);
            setError(err.response?.data?.error || 'Failed to submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return createPortal(
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 animate-in fade-in duration-75">
                <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-[400px] p-12 text-center transform transition-all scale-100">
                    <div className="mx-auto w-20 h-20 bg-green-50 rounded-[32px] flex items-center justify-center mb-6">
                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Thank you!</h3>
                    <p className="text-gray-500 font-medium leading-relaxed">
                        We read every beta feedback carefully. Your input shapes Vizora.
                    </p>
                </div>
            </div>,
            document.body
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 animate-in fade-in duration-75 px-4">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-[540px] overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-100">

                {/* Header */}
                <div className="relative p-8 pb-4">
                    <button
                        onClick={onClose}
                        className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-50 rounded-2xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-indigo-50 p-3 rounded-2xl">
                            <MessageSquareHeart className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Help us improve</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">30 second feedback</p>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed max-w-[80%]">
                        You’re using the private beta. Your feedback directly shapes the product.
                    </p>
                </div>

                <div className="px-8 pb-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-xs font-bold p-4 rounded-2xl border border-red-100">
                            {error}
                        </div>
                    )}

                    {/* Question 1: Rating */}
                    <div className="space-y-4">
                        <label className="text-sm font-black text-gray-900 flex items-center gap-2">
                            How was your experience so far?
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">Required</span>
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setRating(s)}
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${rating >= s
                                        ? 'bg-yellow-400 text-white shadow-lg shadow-yellow-200 scale-105'
                                        : 'bg-gray-50 text-gray-300 hover:bg-gray-100'
                                        }`}
                                >
                                    <Star className={`w-6 h-6 ${rating >= s ? 'fill-current' : ''}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Question 2: Confusion */}
                    <div className="space-y-4">
                        <label className="text-sm font-black text-gray-900">What confused you or slowed you down?</label>
                        <textarea
                            value={confusing}
                            onChange={(e) => setConfusing(e.target.value)}
                            placeholder="e.g. 'I didn't understand how versions work...'"
                            className="w-full h-24 rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 text-sm font-medium focus:border-indigo-600 focus:bg-white transition-all outline-none resize-none"
                        />
                    </div>

                    {/* Question 3: Helpful */}
                    <div className="space-y-4">
                        <label className="text-sm font-black text-gray-900">What saved you the most time?</label>
                        <textarea
                            value={helpful}
                            onChange={(e) => setHelpful(e.target.value)}
                            placeholder="e.g. 'ER diagram generation was instant...'"
                            className="w-full h-24 rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 text-sm font-medium focus:border-indigo-600 focus:bg-white transition-all outline-none resize-none"
                        />
                    </div>

                    {/* Question 4: Missing */}
                    <div className="space-y-4">
                        <label className="text-sm font-black text-gray-900">What’s missing for real-world usage?</label>
                        <textarea
                            value={missing}
                            onChange={(e) => setMissing(e.target.value)}
                            placeholder="e.g. 'Need better export control...'"
                            className="w-full h-24 rounded-2xl border-2 border-gray-100 bg-gray-50 p-4 text-sm font-medium focus:border-indigo-600 focus:bg-white transition-all outline-none resize-none"
                        />
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={loading || !rating}
                        className="w-full py-4 bg-gray-900 text-white rounded-[2rem] font-black text-sm hover:bg-black disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-all shadow-xl shadow-gray-900/10 active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                            <>
                                Submit feedback
                                <Send className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
