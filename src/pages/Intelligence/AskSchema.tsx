import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../hooks/useProject';
import { api } from '../../lib/api';
import { Brain, Send, User, Bot, RefreshCw, Table, AlertCircle, Database, Link, Hash, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface AIEvidence {
    schema_version: number;
    referenced_tables: string[];
    referenced_columns: string[];
    relationships_used: string[];
    confidence: 'high' | 'medium' | 'low';
}

interface Message {
    id: string;
    role: 'user' | 'bot';
    text: string;
    evidence?: AIEvidence;
}

export default function AskSchema() {
    const { projectId } = useProject();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || loading || !projectId) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: input.trim(),
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);
        setError(null);

        try {
            const data = await api.askSchema(projectId, userMsg.text);

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'bot',
                text: data.answer,
                evidence: {
                    schema_version: data.schema_version,
                    referenced_tables: data.referenced_tables || [],
                    referenced_columns: data.referenced_columns || [],
                    relationships_used: data.relationships_used || [],
                    confidence: data.confidence || 'medium'
                }
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const EvidencePanel = ({ evidence }: { evidence: AIEvidence }) => (
        <div className="mt-4 border-t border-slate-200/50 pt-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Database className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Evidence Base</span>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${evidence.confidence === 'high' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        evidence.confidence === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-red-50 text-red-700 border-red-100'
                    }`}>
                    Confidence: {evidence.confidence}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-1.5 opacity-60">
                        <Hash className="h-3 w-3" />
                        <span className="text-[10px] font-bold text-slate-900 uppercase">Schema Version</span>
                    </div>
                    <div className="text-xs font-mono text-indigo-600 font-bold">v{evidence.schema_version}</div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center gap-1.5 opacity-60">
                        <Table className="h-3 w-3" />
                        <span className="text-[10px] font-bold text-slate-900 uppercase">Tables</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {evidence.referenced_tables.map(t => (
                            <button
                                key={t}
                                onClick={() => navigate(`/workspace/${projectId}/explorer`)}
                                className="px-1.5 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded text-[10px] font-mono transition-colors"
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {evidence.referenced_columns.length > 0 && (
                    <div className="col-span-2 space-y-2">
                        <div className="flex items-center gap-1.5 opacity-60">
                            <ShieldCheck className="h-3 w-3" />
                            <span className="text-[10px] font-bold text-slate-900 uppercase">Columns</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {evidence.referenced_columns.map(c => (
                                <span key={c} className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded text-[9px] font-mono text-slate-600">
                                    {c}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {evidence.relationships_used.length > 0 && (
                    <div className="col-span-2 space-y-2">
                        <div className="flex items-center gap-1.5 opacity-60">
                            <Link className="h-3 w-3" />
                            <span className="text-[10px] font-bold text-slate-900 uppercase">Relationships Used</span>
                        </div>
                        <div className="space-y-1">
                            {evidence.relationships_used.map((r, i) => (
                                <div key={i} className="text-[10px] font-mono text-slate-500 bg-slate-50/50 p-1 rounded border border-dashed border-slate-200">
                                    {r}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] bg-white overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <Brain className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">Ask Schema <span className="text-[10px] px-2 py-0.5 bg-slate-900 text-white rounded ml-2 uppercase tracking-widest font-bold">Verified</span></h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Evidence-Based Schema Reasoning</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 shadow-sm shadow-indigo-50/50">
                    <CheckCircle2 className="h-3 w-3 text-indigo-600" />
                    <span className="text-[10px] font-bold text-indigo-700 uppercase">No Speculation Engine</span>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="max-w-2xl mx-auto my-12">
                        <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-3xl p-10 text-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                <Database size={120} />
                            </div>

                            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100/50 border border-indigo-50">
                                <Bot className="h-8 w-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 mb-3">Schema Reasoning Engine</h2>
                            <p className="text-slate-500 mb-10 font-medium">Ask technical questions about your database structure. <br />Every answer is accompanied by verifiable schema evidence.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                                {[
                                    "What breaks if I delete user_id from orders?",
                                    "Which tables affect billing accounts?",
                                    "List all primary keys without indexing",
                                    "Show relationships between users and projects"
                                ].map(q => (
                                    <button
                                        key={q}
                                        onClick={() => setInput(q)}
                                        className="p-3 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-50 transition-all text-left"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                        {msg.role === 'bot' && (
                            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-slate-200">
                                <ShieldCheck className="h-5 w-5 text-white" />
                            </div>
                        )}
                        <div className={`max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`px-5 py-4 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.role === 'user'
                                    ? 'bg-indigo-600 text-white shadow-indigo-100 rounded-tr-none'
                                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none ring-4 ring-slate-50/50'
                                }`}>
                                <div className="font-medium">{msg.text}</div>

                                {msg.evidence && <EvidencePanel evidence={msg.evidence} />}
                            </div>
                        </div>
                        {msg.role === 'user' && (
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 mt-1 border border-indigo-100">
                                <User className="h-5 w-5 text-indigo-600" />
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="flex gap-4 justify-start">
                        <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 animate-pulse">
                            <Database className="h-5 w-5 text-white animate-spin" />
                        </div>
                        <div className="bg-slate-50 border border-slate-100 px-6 py-4 rounded-3xl rounded-tl-none">
                            <div className="flex gap-1.5 items-center">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Reasoning</div>
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex justify-center">
                        <div className="bg-red-50 border border-red-200 px-5 py-3 rounded-2xl flex items-center gap-3 text-xs font-bold text-red-600 shadow-sm animate-in zoom-in-95">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    </div>
                )}
                <div ref={scrollRef} className="h-4" />
            </div>

            {/* Input Area */}
            <div className="p-8 bg-slate-50/50 border-t border-slate-100 shrink-0">
                <form
                    onSubmit={handleSend}
                    className="max-w-4xl mx-auto relative group"
                >
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                        <Database size={18} />
                    </div>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a technical question about your schema..."
                        className="w-full pl-14 pr-32 py-5 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all outline-none shadow-sm"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-12 px-6 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-black disabled:opacity-50 disabled:grayscale transition-all shadow-lg active:scale-95"
                    >
                        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Verify
                    </button>
                </form>
                <div className="flex items-center justify-center gap-10 mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-green-500 rounded-full" />
                        No Hallucinations
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-blue-500 rounded-full" />
                        Deterministic
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-purple-500 rounded-full" />
                        Evidence-Based
                    </div>
                </div>
            </div>
        </div>
    );
}
