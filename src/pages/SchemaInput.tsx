
import { useState } from 'react';
import {
    Terminal,
    RefreshCw,
    Check,
    AlertCircle,
    Layout,
    ArrowRight
} from 'lucide-react';
import { api } from '../lib/api';
import { useProject } from '../hooks/useProject';
import { useNavigate } from 'react-router-dom';

export function SchemaInput() {
    const { projectId } = useProject();
    const navigate = useNavigate();
    const [rawSchema, setRawSchema] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);

    const handleImport = async () => {
        if (!projectId || !rawSchema) return;
        setLoading(true);
        setError(null);
        setSuccess(false);
        setWarnings([]);

        try {
            console.log('[SchemaInput] Sending schema to backend, length:', rawSchema.length);
            // This endpoint parses code into normalized schema and saves a version
            const res = await api.ingestSchema(projectId, rawSchema);
            console.log('[SchemaInput] Response:', res);

            if (res.error) throw new Error(res.error);

            setSuccess(true);
            if (res.warnings && res.warnings.length > 0) {
                setWarnings(res.warnings);
            }
        } catch (err: any) {
            console.error('[SchemaInput] Error:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to parse schema';

            if (err.response?.status === 403 && msg.includes("limit")) {
                if (confirm(`Version Limit Reached!\n\n${err.response.data.message}\n\nWould you like to upgrade to Pro for more history?`)) {
                    navigate('/billing');
                }
            } else {
                setError(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Schema Input</h1>
                        <p className="text-slate-500 font-medium">Inject existing code to generate structure</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                        <Terminal className="h-6 w-6" />
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Layout className="h-4 w-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Source Code (SQL, Prisma, Drizzle)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ready to Parse</span>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-indigo-900 leading-relaxed">
                                    Pasting a new schema replaces the current diagram. Previous versions are preserved in Version History.
                                </p>
                            </div>
                        </div>

                        <textarea
                            className="w-full h-80 p-6 bg-slate-900 text-indigo-100 text-xs font-mono rounded-2xl focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none border-0 shadow-inner"
                            placeholder={"-- Paste your SQL DDL here...\nCREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email TEXT UNIQUE\n);"}
                            value={rawSchema}
                            onChange={(e) => setRawSchema(e.target.value)}
                        />

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                                {error && (
                                    <div className="flex items-center gap-2 text-red-600 animate-in fade-in duration-300">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <p className="text-xs font-bold leading-none">{error}</p>
                                    </div>
                                )}
                                {warnings.length > 0 && (
                                    <div className="flex items-center gap-2 text-amber-600 animate-in fade-in duration-300">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        <p className="text-xs font-bold leading-none">{warnings.join('; ')}</p>
                                    </div>
                                )}
                                {success && (
                                    <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                                        <div className="flex items-center gap-2 text-green-600">
                                            <Check className="h-4 w-4 shrink-0" />
                                            <p className="text-xs font-bold leading-none">Schema ingested successfully! Version committed.</p>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/workspace/${projectId}/explanations`)}
                                            className="flex items-center gap-2 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline"
                                        >
                                            View AI Insights <ArrowRight className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleImport}
                                disabled={loading || !rawSchema}
                                className={`
                                    flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all
                                    ${loading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95'}
                                    disabled:opacity-50
                                `}
                            >
                                {loading ? (
                                    <RefreshCw className="h-5 w-5 animate-spin" />
                                ) : (
                                    <>
                                        Parse & Generate
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <div className="p-6 bg-white border border-slate-200 rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Step 1</span>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">Paste Code</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">SQL DDL, Prisma schema, or Drizzle definitions.</p>
                    </div>
                    <div className="p-6 bg-white border border-slate-200 rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Step 2</span>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">Internal Normalization</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">We convert it to our single source of truth model.</p>
                    </div>
                    <div className="p-6 bg-white border border-slate-200 rounded-2xl">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Step 3</span>
                        <h4 className="text-sm font-bold text-slate-900 mb-1">Visual Refresh</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">Your diagrams and docs are updated instantly.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
