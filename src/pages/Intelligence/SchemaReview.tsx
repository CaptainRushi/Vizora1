import { useState, useEffect } from 'react';
import { useProject } from '../../hooks/useProject';
import { api } from '../../lib/api';
import { AlertCircle, AlertTriangle, Lightbulb, ShieldCheck, RefreshCw, Table } from 'lucide-react';
import PasteSchemaEmptyState from '../../components/dashboard/PasteSchemaEmptyState';
import { LoadingSection } from '../../components/LoadingSection';

interface Finding {
    entity: string;
    issue: string;
    impact: string;
    severity: 'High' | 'Medium' | 'Low' | 'Critical';
}

interface ReviewResults {
    critical: Finding[];
    warnings: Finding[];
    suggestions: Finding[];
}

import { useAuth } from '../../context/AuthContext';
// ... imports

export default function SchemaReview() {
    const { user } = useAuth();
    const { projectId } = useProject();
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState<ReviewResults | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchReview = async () => {
        if (!projectId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await api.getSchemaReview(projectId, user?.id);
            setResults(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) fetchReview();
    }, [projectId]);

    const SeverityBadge = ({ severity }: { severity: string }) => {
        const colors = {
            'Critical': 'bg-red-100 text-red-700 border-red-200',
            'High': 'bg-orange-100 text-orange-700 border-orange-200',
            'Medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
            'Low': 'bg-blue-100 text-blue-700 border-blue-200',
        }[severity] || 'bg-gray-100 text-gray-700 border-gray-200';

        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors}`}>
                {severity}
            </span>
        );
    };

    const IssueCard = ({ finding }: { finding: Finding }) => (
        <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <Table className="h-4 w-4 text-slate-400" />
                    <span className="font-mono text-sm font-bold text-slate-900">{finding.entity}</span>
                </div>
                <SeverityBadge severity={finding.severity} />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">{finding.issue}</h4>
            <p className="text-xs text-slate-500 leading-relaxed">{finding.impact}</p>
        </div>
    );

    if (loading) {
        return (
            <LoadingSection
                title="Reviewing Schema Architects..."
                subtitle="Calculating normalization scores and identifying design anti-patterns."
            />
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-red-900 font-bold text-lg mb-2">Analysis Failed</h3>
                    <p className="text-red-700 text-sm">{error}</p>
                    <button
                        onClick={fetchReview}
                        className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (results && (results as any).state === 'empty') {
        return <PasteSchemaEmptyState feature="review" />;
    }

    const totalIssues = (results?.critical.length || 0) + (results?.warnings.length || 0) + (results?.suggestions.length || 0);

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <ShieldCheck className="h-6 w-6 text-indigo-600" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Schema Review</h1>
                    </div>
                    <p className="text-slate-500 font-medium">Automated design & risk analysis</p>
                </div>
                <button
                    onClick={fetchReview}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Analysis
                </button>
            </div>

            {totalIssues === 0 ? (
                <div className="bg-green-50 border border-green-200 rounded-3xl p-12 text-center">
                    <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck className="h-10 w-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-black text-green-900 mb-3">Perfect Schema!</h2>
                    <p className="text-green-700 font-medium max-w-md mx-auto">
                        No critical issues, warnings, or suggestions found. Your schema follows all integrated best practices.
                    </p>
                </div>
            ) : (
                <div className="space-y-10">
                    {/* Critical Issues */}
                    {results?.critical.length! > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">Critical Issues</h3>
                                <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-black rounded-lg">
                                    {results?.critical.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {results?.critical.map((f, i) => <IssueCard key={i} finding={f} />)}
                            </div>
                        </section>
                    )}

                    {/* Warnings */}
                    {results?.warnings.length! > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">Warnings</h3>
                                <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-black rounded-lg">
                                    {results?.warnings.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {results?.warnings.map((f, i) => <IssueCard key={i} finding={f} />)}
                            </div>
                        </section>
                    )}

                    {/* Suggestions */}
                    {results?.suggestions.length! > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Lightbulb className="h-5 w-5 text-blue-500" />
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">Suggestions</h3>
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-black rounded-lg">
                                    {results?.suggestions.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {results?.suggestions.map((f, i) => <IssueCard key={i} finding={f} />)}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
