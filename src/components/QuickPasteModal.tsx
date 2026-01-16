
import { useState } from 'react';
import { X, Terminal, ArrowRight, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { api } from '../lib/api';

interface Props {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (version: number) => void;
}

import { useAuth } from '../context/AuthContext';

export function QuickPasteModal({ projectId, isOpen, onClose, onSuccess }: Props) {
    const { user } = useAuth();
    const [rawSchema, setRawSchema] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'info', text: string } | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!rawSchema.trim()) return;
        setLoading(true);
        setError(null);
        setFeedback(null);

        try {
            const res = await api.ingestSchema(projectId, rawSchema, user?.id);
            if (res.error) throw new Error(res.error);

            if (res.status === 'no_changes') {
                setFeedback({ type: 'info', text: res.message });
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setFeedback({ type: 'success', text: `Successfully updated to v${res.version}` });
                setTimeout(() => {
                    onSuccess(res.version);
                    onClose();
                }, 1500);
            }
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Failed to parse schema');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                            <Terminal className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">Paste New Schema</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Version Control Mode</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-xl transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    <textarea
                        className="w-full h-80 p-6 bg-gray-900 text-indigo-100 text-xs font-mono rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none border-0 shadow-inner"
                        placeholder={"-- Paste SQL, Prisma, or Drizzle code here...\nCREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email TEXT UNIQUE\n);"}
                        value={rawSchema}
                        onChange={(e) => setRawSchema(e.target.value)}
                        disabled={loading}
                    />

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-xl">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <p className="text-xs font-bold">{error}</p>
                        </div>
                    )}

                    {feedback && (
                        <div className={`flex items-center gap-2 p-4 rounded-xl ${feedback.type === 'success' ? 'text-green-600 bg-green-50' : 'text-indigo-600 bg-indigo-50'}`}>
                            <Check className="h-4 w-4 shrink-0" />
                            <p className="text-xs font-bold">{feedback.text}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !rawSchema.trim()}
                        className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-gray-900/20"
                    >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        Commit Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
