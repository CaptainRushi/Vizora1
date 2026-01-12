import { useState, useEffect } from 'react';
import { useProject } from '../../hooks/useProject';
import { api } from '../../lib/api';
import { BookOpen, RefreshCw, Copy, Check, Download, Brain, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function OnboardingGuide() {
    const { projectId } = useProject();
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchGuide = async (force: boolean = false) => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.getOnboardingGuide(projectId, force);
            setContent(data.content);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) fetchGuide(false);
    }, [projectId]);

    const handleCopy = () => {
        if (!content) return;
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
                <div className="relative mb-6">
                    <Brain className="h-12 w-12 text-indigo-500 animate-pulse" />
                    <RefreshCw className="h-5 w-5 text-indigo-600 absolute -bottom-1 -right-1 animate-spin" />
                </div>
                <h2 className="text-xl font-black text-slate-900 mb-2 whitespace-nowrap">Brainstorming Guide...</h2>
                <p className="text-slate-500 font-medium">Synthesizing schema relationships and architecture patterns.</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 flex flex-col items-center justify-center min-h-[60vh]">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-xl font-black text-slate-900 mb-2">Guide Generation Failed</h3>
                <p className="text-slate-500 mb-6">{error}</p>
                <button
                    onClick={() => fetchGuide(true)}
                    className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                    Retry Generation
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <BookOpen className="h-6 w-6 text-emerald-600" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Onboarding Guide</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Automatic technical walkthrough of this database</p>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? 'Copied Markdown' : 'Copy as Markdown'}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm prose prose-slate prose-indigo max-w-none">
                <ReactMarkdown>{content || ''}</ReactMarkdown>
            </div>

            <div className="mt-8 text-center">
                <p className="text-xs text-slate-400 font-medium">
                    This guide is AI-generated based on the latest normalized schema definition.
                </p>
                <button
                    onClick={() => fetchGuide(true)}
                    className="mt-4 text-xs font-bold text-indigo-600 hover:underline"
                >
                    Regenerate Guide
                </button>
            </div>
        </div>
    );
}
