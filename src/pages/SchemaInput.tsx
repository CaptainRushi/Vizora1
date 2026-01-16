import { useState, useEffect } from 'react';
import {
    Terminal,
    RefreshCw,
    Check,
    AlertCircle,
    Layout,
    ArrowRight
} from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useProject } from '../hooks/useProject';
import { useNavigate } from 'react-router-dom';
import { AboutBetaModal } from '../components/beta/AboutBetaModal';
import { FeedbackNudge } from '../components/beta/FeedbackNudge';

import { useAuth } from '../context/AuthContext';

export function SchemaInput() {
    const { user } = useAuth();
    const { projectId } = useProject();
    const navigate = useNavigate();
    const [rawSchema, setRawSchema] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    const [showBetaLimit, setShowBetaLimit] = useState(false);
    const [versionCount, setVersionCount] = useState(0);

    useEffect(() => {
        if (projectId) {
            supabase
                .from('schema_versions')
                .select('id')
                .eq('project_id', projectId)
                .then(({ data }) => {
                    setVersionCount(data?.length || 0);
                });
        }
    }, [projectId]);

    const handleImport = async () => {
        if (!projectId || !rawSchema) return;
        setLoading(true);
        setError(null);
        setSuccess(false);
        setWarnings([]);

        try {
            console.log('[SchemaInput] Sending schema to backend, length:', rawSchema.length);
            // This endpoint parses code into normalized schema and saves a version
            const res = await api.ingestSchema(projectId, rawSchema, user?.id);
            console.log('[SchemaInput] Response:', res);

            if (res.error) throw new Error(res.error);

            setSuccess(true);
            setVersionCount(prev => prev + 1);


            if (res.warnings && res.warnings.length > 0) {
                setWarnings(res.warnings);
            }
        } catch (err: any) {
            console.error('[SchemaInput] Error:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to parse schema';

            if (err.response?.status === 400) {
                setError(msg);
            } else if (err.response?.status === 403 && (msg.includes("limit") || msg.includes("Beta"))) {
                setShowBetaLimit(true);
            } else {
                setError(`Server Error: ${msg}. Please check the server logs.`);
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
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Live Parser Active</span>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="relative group">
                            <textarea
                                value={rawSchema}
                                onChange={(e) => setRawSchema(e.target.value)}
                                placeholder="Paste your SQL (Postgres), Prisma schema, or Drizzle schema here..."
                                className="w-full h-[320px] p-6 text-sm font-mono bg-slate-900 text-slate-300 rounded-2xl border-2 border-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none resize-none"
                            />
                            {!rawSchema && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                                    <Terminal className="w-20 h-20 text-slate-400" />
                                </div>
                            )}
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 animate-in shake duration-300">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {warnings.length > 0 && (
                            <div className="p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider">Parser Warnings</p>
                                <ul className="text-sm space-y-1">
                                    {warnings.map((w, i) => (
                                        <li key={i} className="flex gap-2">
                                            <span className="opacity-50">•</span>
                                            {w}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div className="text-xs text-slate-400 font-medium">
                                {versionCount > 0 ? `${versionCount} versions saved` : 'No versions yet'}
                            </div>
                            <div className="flex items-center gap-4">
                                {success && (
                                    <div className="flex items-center gap-2 text-green-600 animate-in fade-in slide-in-from-right-2">
                                        <Check className="h-4 w-4" />
                                        <span className="text-sm font-bold">Schema Ingested</span>
                                        <button
                                            onClick={() => navigate(`/workspace/${projectId}/er-diagram`)}
                                            className="ml-4 flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-black text-xs uppercase tracking-widest"
                                        >
                                            View AI Insights
                                            <ArrowRight className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={handleImport}
                                    disabled={loading || !rawSchema}
                                    className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200"
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                            Parsing Schema...
                                        </>
                                    ) : (
                                        <>
                                            Save & Generate
                                            <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {success && (
                <FeedbackNudge context="schema_paste" delay={3000} />
            )}

            {showBetaLimit && (
                <AboutBetaModal
                    onClose={() => setShowBetaLimit(false)}
                    limitReached={true}
                    type="version"
                />
            )}
        </div>
    );
}
