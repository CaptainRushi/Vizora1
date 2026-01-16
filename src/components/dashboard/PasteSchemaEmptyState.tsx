import React from 'react';
import { FileText, Database, Code, ShieldCheck, BookOpen, MessageSquare, ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

interface PasteSchemaEmptyStateProps {
    feature: 'review' | 'onboarding' | 'ask';
}

const PasteSchemaEmptyState: React.FC<PasteSchemaEmptyStateProps> = ({ feature }) => {
    const navigate = useNavigate();
    const { projectId } = useParams();

    const featureConfig = {
        review: {
            icon: ShieldCheck,
            subtext: "Once a schema is added, Vizora will automatically review design and risk areas."
        },
        onboarding: {
            icon: BookOpen,
            subtext: "The onboarding guide is generated from your schema structure."
        },
        ask: {
            icon: MessageSquare,
            subtext: "Questions are answered strictly from your schema — no guessing."
        }
    };

    const config = featureConfig[feature];
    const Icon = config.icon;

    const handlePasteSchema = () => {
        if (projectId) {
            navigate(`/workspace/${projectId}/schema-input`);
        } else {
            navigate('/projects');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
            <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-10 shadow-sm text-center relative overflow-hidden group">
                {/* Subtle Background Accent */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />
                <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-slate-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />

                <div className="mb-8 flex justify-center relative">
                    <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 shadow-sm group-hover:scale-110 transition-transform duration-500">
                        <Icon className="h-12 w-12 text-indigo-500" />
                    </div>
                </div>

                <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
                    Paste a schema to get started
                </h2>

                <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">
                    Vizora analyzes your database structure directly from schema code.
                    Paste your SQL or Prisma schema to unlock diagrams, reviews, docs, and verified AI answers.
                </p>

                <button
                    onClick={handlePasteSchema}
                    className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 mb-8 group/btn"
                >
                    Paste schema
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>

                <div className="space-y-6 relative">
                    <div className="px-4 py-3 bg-slate-50/50 rounded-xl border border-slate-100">
                        <p className="text-xs text-slate-600 font-bold leading-relaxed">
                            {config.subtext}
                        </p>
                    </div>

                    <div className="pt-8 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mb-4">
                            Supports
                        </p>
                        <div className="flex justify-center gap-6 text-[11px] font-bold text-slate-500">
                            <span className="flex items-center gap-1.5 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                                <Code className="h-3.5 w-3.5 text-blue-500" /> SQL (DDL)
                            </span>
                            <span className="flex items-center gap-1.5 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                                <Database className="h-3.5 w-3.5 text-emerald-500" /> Prisma
                            </span>
                            <span className="flex items-center gap-1.5 grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all cursor-default">
                                <FileText className="h-3.5 w-3.5 text-orange-500" /> Dumps
                            </span>
                        </div>
                        <p className="mt-4 text-[10px] text-slate-400 font-medium">
                            No database connection required.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PasteSchemaEmptyState;
