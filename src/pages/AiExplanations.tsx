import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../hooks/useProject';
import { Sparkles, Database, Share2, Info, ArrowRight, Loader2, Copy, Table, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { LoadingSection } from '../components/LoadingSection';

interface Explanation {
    entity_type: 'database' | 'table' | 'relationship';
    entity_name: string | null;
    content: string;
}

export function AiExplanations() {
    const navigate = useNavigate();
    const { projectId, currentStep, loading: projectLoading, refreshStep } = useProject();
    const [activeTab, setActiveTab] = useState<'database' | 'table' | 'relationship'>('database');
    const [explanations, setExplanations] = useState<Explanation[]>([]);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const fetchExplanations = async () => {
        if (!projectId) return;
        try {
            const { data: ver } = await supabase.from('schema_versions').select('version').eq('project_id', projectId).order('version', { ascending: false }).limit(1).maybeSingle();

            if (ver) {
                const { data } = await supabase
                    .from('schema_explanations')
                    .select('*')
                    .eq('project_id', projectId)
                    .eq('version_number', ver.version);
                if (data && data.length > 0) {
                    setExplanations(data);
                }
            }
        } catch (err) {
            console.error('[AiExplanations] Fetch error:', err);
        }
    };

    useEffect(() => {
        if (projectLoading) return;
        if (!projectId) return;

        fetchExplanations();

        let interval: any;
        if (explanations.length === 0) {
            interval = setInterval(() => {
                fetchExplanations();
            }, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [projectId, projectLoading, explanations.length === 0]);

    const handleGenerate = async () => {
        if (!projectId) return;
        setGenerating(true);
        try {
            await api.generateExplanation(projectId);
            await fetchExplanations();
            await refreshStep();
        } catch (err) {
            console.error(err);
            alert("Failed to generate explanations.");
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    if (projectLoading) {
        return null;
    }

    const steps = ['schema', 'diagram', 'explanation', 'docs'];
    if (steps.indexOf(currentStep) < 1) {
        return (
            <div className="flex h-96 flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100 italic text-gray-400">
                Please paste a schema to unlock AI Explanations.
            </div>
        );
    }

    const dbExp = explanations.find(e => e.entity_type === 'database');
    const relExp = explanations.find(e => e.entity_type === 'relationship');
    const tableExps = explanations.filter(e => e.entity_type === 'table');
    const quotaError = explanations.find(e => e.content.includes('OpenAI Quota Exceeded'));

    return (
        <div className="mx-auto max-w-5xl space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        AI Architecture Insights
                    </h2>
                    <p className="mt-2 text-gray-500 font-medium">
                        Deterministic breakdown of your database structure powered by GPT-4o.
                    </p>
                </div>

                {explanations.length > 0 && (
                    <button
                        onClick={() => navigate('/auto-docs')}
                        className="flex items-center gap-3 rounded-2xl bg-gray-900 px-8 py-4 text-xs font-black text-white hover:bg-black shadow-xl shadow-gray-900/20 transition-all active:scale-95"
                    >
                        Finalize Documentation
                        <ArrowRight className="h-4 w-4" />
                    </button>
                )}
            </div>

            {quotaError ? (
                <div className="flex flex-col items-center justify-center rounded-[3rem] border-4 border-dashed border-red-100 bg-red-50/30 p-20 text-center shadow-2xl shadow-red-100/20 animate-in fade-in duration-500">
                    <div className="h-24 w-24 bg-red-100 rounded-full flex items-center justify-center mb-8">
                        <AlertCircle className="h-12 w-12 text-red-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">OpenRouter Quota Exceeded</h3>
                    <p className="mt-4 text-gray-600 max-w-lg font-medium leading-relaxed">
                        Your OpenRouter API key has run out of credits or reached its usage limit. The architecture insights cannot be generated until the account limit is increased or credits are added.
                    </p>
                    <div className="mt-8 flex flex-col items-center gap-4">
                        <a
                            href="https://openrouter.ai/credits"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-red-600 hover:underline"
                        >
                            Open OpenRouter Billing Settings →
                        </a>
                        <button
                            onClick={handleGenerate}
                            className="mt-4 flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-600"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Retry Analysis
                        </button>
                    </div>
                </div>
            ) : explanations.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-[3rem] border-4 border-dashed border-indigo-50 bg-white p-20 text-center shadow-2xl shadow-indigo-100/20">
                    {generating ? (
                        <LoadingSection
                            title="Engine Analyzing Architecture..."
                            subtitle="Interpreting tables, columns, and latent relationships."
                        />
                    ) : (
                        <>
                            <div className="h-24 w-24 bg-indigo-50 rounded-full flex items-center justify-center mb-8">
                                <Sparkles className="h-12 w-12 text-indigo-400" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900">Analysis Pending</h3>
                            <p className="mt-4 text-gray-500 max-w-sm font-medium leading-relaxed">
                                Our internal AI services need to scan your schema to generate architectural insights.
                            </p>
                            <button
                                onClick={handleGenerate}
                                className="mt-10 flex items-center gap-3 rounded-[2rem] bg-indigo-600 px-12 py-5 text-sm font-black text-white hover:bg-indigo-700 shadow-2xl shadow-indigo-600/30 transition-all active:scale-95"
                            >
                                <Sparkles className="h-5 w-5" />
                                Run Multi-Vector Analysis
                            </button>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex bg-gray-100/80 p-1.5 rounded-2xl w-fit border border-gray-200">
                        <button
                            onClick={() => setActiveTab('database')}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${activeTab === 'database' ? 'bg-white text-indigo-700 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Database className="h-4 w-4" />
                            Database Overview
                        </button>
                        <button
                            onClick={() => setActiveTab('table')}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${activeTab === 'table' ? 'bg-white text-indigo-700 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Table className="h-4 w-4" />
                            Entities ({tableExps.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('relationship')}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${activeTab === 'relationship' ? 'bg-white text-indigo-700 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Share2 className="h-4 w-4" />
                            Relationships
                        </button>
                    </div>

                    <div className="min-h-[400px]">
                        {activeTab === 'database' && dbExp && (
                            <div className="group relative overflow-hidden rounded-[2.5rem] bg-white p-10 shadow-xl border-2 border-indigo-50">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 rounded-xl">
                                            <Info className="h-5 w-5 text-indigo-600" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight">System Objective</h3>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(dbExp.content, 'db')}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    >
                                        {copied === 'db' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                                    </button>
                                </div>
                                <div className="text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                                    {dbExp.content}
                                </div>
                            </div>
                        )}

                        {activeTab === 'relationship' && relExp && (
                            <div className="group relative overflow-hidden rounded-[2.5rem] bg-white p-10 shadow-xl border-2 border-indigo-50">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-50 rounded-xl">
                                            <Share2 className="h-5 w-5 text-green-600" />
                                        </div>
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Data Integrity & Links</h3>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(relExp.content, 'rel')}
                                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                    >
                                        {copied === 'rel' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5" />}
                                    </button>
                                </div>
                                <div className="text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                                    {relExp.content}
                                </div>
                            </div>
                        )}

                        {activeTab === 'table' && (
                            <div className="space-y-6">
                                {tableExps.map((texp, idx) => (
                                    <div key={idx} className="group relative overflow-hidden rounded-3xl bg-white p-8 shadow-md border-2 border-gray-50 hover:border-indigo-100 transition-all">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-gray-50 rounded-lg flex items-center justify-center font-black text-gray-400 text-[10px] uppercase">
                                                    TBL
                                                </div>
                                                <h4 className="text-lg font-black text-gray-900 tracking-tight">{texp.entity_name}</h4>
                                            </div>
                                            <button
                                                onClick={() => handleCopy(texp.content, `table-${idx}`)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                            >
                                                {copied === `table-${idx}` ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <div className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">
                                            {texp.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center pt-10">
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 font-black text-[10px] uppercase tracking-widest transition-colors"
                        >
                            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                            Recalibrate AI Explanations
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
