import { useState, useEffect } from 'react';
import { useProject } from '../../hooks/useProject';
import { api } from '../../lib/api';
import { BookOpen, Copy, Check, Download, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import PasteSchemaEmptyState from '../../components/dashboard/PasteSchemaEmptyState';
import { LoadingSection } from '../../components/LoadingSection';

import { useAuth } from '../../context/AuthContext';

export default function OnboardingGuide() {
    const { user } = useAuth();
    const { projectId } = useProject();
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState<string | null>(null);
    const [isEmpty, setIsEmpty] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const fetchGuide = async (force: boolean = false) => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        setIsEmpty(false);
        try {
            const data = await api.getOnboardingGuide(projectId, force, user?.id);
            if (data.state === 'empty') {
                setIsEmpty(true);
            } else {
                setContent(data.content);
            }
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
            <LoadingSection
                title="Synthesizing Knowledge Base..."
                subtitle="Generating architectural walkthroughs and pattern explanations for your team."
            />
        );
    }

    if (isEmpty) {
        return <PasteSchemaEmptyState feature="onboarding" />;
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

            <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-12 shadow-sm prose prose-sm prose-slate prose-indigo max-w-none [&_h1]:text-xl [&_h1]:font-bold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_h4]:text-sm [&_h4]:font-medium">
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
