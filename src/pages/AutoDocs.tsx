import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useProject } from '../hooks/useProject';
import { FileText, Download, Loader2, FileDown, Code, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FeedbackNudge } from '../components/beta/FeedbackNudge';
import { LoadingSection } from '../components/LoadingSection';

interface DocOutput {
    markdown: string;
    pdf_url: string;
    version: number;
    created_at: string;
}

export function AutoDocs() {
    const { projectId, currentStep, loading: projectLoading } = useProject();
    const [doc, setDoc] = useState<DocOutput | null>(null);
    const [view, setView] = useState<'preview' | 'source'>('preview');

    const fetchDocs = async (silent = false) => {
        if (!projectId) return;
        try {
            const { data: ver } = await supabase.from('schema_versions').select('version').eq('project_id', projectId).order('version', { ascending: false }).limit(1).maybeSingle();
            if (ver) {
                const { data } = await supabase
                    .from('documentation_outputs')
                    .select('*')
                    .eq('project_id', projectId)
                    .eq('version', ver.version)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (data) {
                    setDoc(data);
                } else if (!data && !silent) {
                    setDoc(null);
                }
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (projectLoading) return;
        if (!projectId) return;

        fetchDocs();

        const interval = setInterval(() => {
            fetchDocs(true);
        }, 2000);

        return () => clearInterval(interval);
    }, [projectId, projectLoading]);


    const handleDownloadPdf = () => {
        if (doc?.pdf_url) {
            window.open(doc.pdf_url, '_blank');
        }
    };

    if (projectLoading) {
        return null;
    }

    if (currentStep === 'schema') {
        return (
            <div className="flex h-96 flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border-2 border-dashed border-gray-100 italic text-gray-400">
                Please complete AI Explanation to unlock Auto Docs.
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-6xl space-y-10 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        Auto Documentation
                    </h2>
                    <p className="mt-2 text-gray-500 font-medium">
                        Self-updating architectural specifications derived from schema truth.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200">
                        <button
                            onClick={() => setView('preview')}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${view === 'preview' ? 'bg-white text-indigo-700 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Eye className="h-4 w-4" />
                            Preview
                        </button>
                        <button
                            onClick={() => setView('source')}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${view === 'source' ? 'bg-white text-indigo-700 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Code className="h-4 w-4" />
                            Markdown
                        </button>
                    </div>

                    <button
                        onClick={handleDownloadPdf}
                        disabled={!doc?.pdf_url}
                        className="flex items-center gap-3 rounded-2xl bg-indigo-600 px-8 py-4 text-xs font-black text-white hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 relative group"
                    >
                        <Download className="h-4 w-4" />
                        Download PDF
                    </button>
                </div>
            </div>

            {!doc ? (
                <div className="flex flex-col items-center justify-center rounded-[3rem] border-4 border-dashed border-indigo-50 bg-white p-20 text-center shadow-2xl shadow-indigo-100/20">
                    <LoadingSection
                        title="Generating Documentation..."
                        subtitle="Compiling schema analysis, change logs, and visualizations into a unified specification."
                    />
                    <div className="mt-10 flex items-center gap-3 text-indigo-600 font-black text-xs uppercase tracking-widest">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Scanning latest snapshot
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="lg:col-span-3">
                        <div className="rounded-[2.5rem] bg-white border-2 border-gray-50 shadow-2xl overflow-hidden">
                            <div className="bg-gray-50/50 border-b border-gray-100 px-10 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    Live Specification v{doc.version}
                                </div>
                                <div className="text-[10px] font-bold text-gray-400">
                                    Last synced: {new Date(doc.created_at).toLocaleTimeString()}
                                </div>
                            </div>

                            <div className="p-12 prose prose-indigo max-w-none">
                                {view === 'preview' ? (
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ ...props }) => <h1 className="text-3xl font-black text-gray-900 mb-6 mt-8" {...props} />,
                                            h2: ({ ...props }) => <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8 pb-2 border-b border-gray-100" {...props} />,
                                            h3: ({ ...props }) => <h3 className="text-xl font-bold text-gray-800 mb-3 mt-6" {...props} />,
                                        }}
                                    >
                                        {doc.markdown}
                                    </ReactMarkdown>
                                ) : (
                                    <pre className="bg-gray-900 text-indigo-300 p-8 rounded-3xl overflow-x-auto text-xs font-mono leading-relaxed">
                                        {doc.markdown}
                                    </pre>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">

                        <div className="rounded-3xl bg-gray-50 p-8 border-2 border-gray-100">
                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FileDown className="h-4 w-4 text-gray-400" />
                                Artifacts
                            </h4>
                            <div className="space-y-4">
                                <button
                                    onClick={handleDownloadPdf}
                                    disabled={!doc?.pdf_url}
                                    className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-100 rounded-xl transition-colors text-left"
                                >
                                    <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center shadow-sm">
                                        <div className="h-5 w-5 bg-red-100 rounded text-[10px] font-black text-red-600 flex items-center justify-center">PDF</div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">SchemaSpec.pdf</p>
                                        <p className="text-[10px] text-gray-400 font-medium">Professional Print</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => {
                                        const blob = new Blob([doc?.markdown || ''], { type: 'text/markdown' });
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = `SchemaSpec_v${doc?.version}.md`;
                                        a.click();
                                    }}
                                    disabled={!doc?.markdown}
                                    className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-100 rounded-xl transition-colors text-left"
                                >
                                    <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center shadow-sm">
                                        <div className="h-5 w-5 bg-indigo-100 rounded text-[10px] font-black text-indigo-600 flex items-center justify-center">MD</div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-900">Documentation.md</p>
                                        <p className="text-[10px] text-gray-400 font-medium">Source Markdown</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {doc && (
                <FeedbackNudge context="docs" delay={5000} />
            )}
        </div>
    );
}
