import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../../hooks/useProject';
import { api } from '../../lib/api';
import {
    Brain, User, Bot, RefreshCw, Table, AlertCircle, Database,
    Link, ShieldCheck, CheckCircle2, ChevronDown, ChevronUp,
    AlertTriangle, XCircle, Info, Zap, FileQuestion, Target,
    Eye, EyeOff, ArrowRight, Sparkles, Shield, HelpCircle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// INTERFACES — DEEP REPLY CONTEXT MODEL
// ═══════════════════════════════════════════════════════════════════════════

interface RelationshipUsed {
    from: string;
    to: string;
    type: string;
}

interface QuestionInterpretation {
    intent: string;
    target_entities: string[];
    operation_type: string;
    why_this_interpretation: string;
}

interface SchemaEvidence {
    schema_version: number;
    tables_involved: string[];
    columns_involved: string[];
    relationships_used: RelationshipUsed[];
}

interface ImpactAndRisk {
    risk_level: 'none' | 'low' | 'medium' | 'high';
    impact_scope: string[];
    why_this_risk_level: string;
}

interface ConfidenceAndLimits {
    confidence: 'high' | 'medium' | 'low';
    what_is_known: string[];
    what_is_not_known: string[];
}

interface DeepReplyResponse {
    question_interpretation: QuestionInterpretation;
    answer: string;
    schema_evidence: SchemaEvidence;
    impact_and_risk: ImpactAndRisk;
    reasoning_trace: string[];
    confidence_and_limits: ConfidenceAndLimits;
}

interface Message {
    id: string;
    role: 'user' | 'bot';
    text: string;
    response?: DeepReplyResponse;
}

// ═══════════════════════════════════════════════════════════════════════════
// RISK BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const RiskBadge = ({ level, reason }: { level: ImpactAndRisk['risk_level']; reason: string }) => {
    const config = {
        none: {
            bg: 'bg-slate-50',
            border: 'border-slate-200',
            text: 'text-slate-600',
            icon: CheckCircle2,
            label: 'No Risk',
            glow: ''
        },
        low: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-700',
            icon: Info,
            label: 'Low Risk',
            glow: ''
        },
        medium: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            text: 'text-amber-700',
            icon: AlertTriangle,
            label: 'Medium Risk',
            glow: 'shadow-amber-100'
        },
        high: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: XCircle,
            label: 'High Risk',
            glow: 'shadow-red-100 shadow-lg'
        }
    };

    const { bg, border, text, icon: Icon, label, glow } = config[level];

    return (
        <div className={`${bg} ${border} ${glow} border rounded-xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${text}`} />
                <span className={`text-xs font-bold uppercase tracking-wider ${text}`}>{label}</span>
            </div>
            <p className={`text-xs ${text} opacity-80 leading-relaxed`}>{reason}</p>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// QUESTION INTERPRETATION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const QuestionInterpretationPanel = ({ interpretation }: { interpretation: QuestionInterpretation }) => {
    const [isOpen, setIsOpen] = useState(false);

    const intentLabels: Record<string, { label: string; color: string }> = {
        impact_analysis: { label: 'Impact Analysis', color: 'bg-orange-100 text-orange-700' },
        dependency_query: { label: 'Dependency Query', color: 'bg-purple-100 text-purple-700' },
        structure_query: { label: 'Structure Query', color: 'bg-blue-100 text-blue-700' },
        relationship_query: { label: 'Relationship Query', color: 'bg-indigo-100 text-indigo-700' },
        risk_assessment: { label: 'Risk Assessment', color: 'bg-red-100 text-red-700' },
        general_query: { label: 'General Query', color: 'bg-slate-100 text-slate-700' }
    };

    const operationLabels: Record<string, { label: string; color: string }> = {
        destructive_change: { label: 'Destructive', color: 'bg-red-100 text-red-700' },
        modification: { label: 'Modification', color: 'bg-amber-100 text-amber-700' },
        read_only: { label: 'Read Only', color: 'bg-emerald-100 text-emerald-700' },
        unknown: { label: 'Unknown', color: 'bg-slate-100 text-slate-700' }
    };

    const intent = intentLabels[interpretation.intent] || intentLabels.general_query;
    const operation = operationLabels[interpretation.operation_type] || operationLabels.unknown;

    return (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-100/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Target className="h-4 w-4 text-indigo-500" />
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest">
                        How Your Question Was Understood
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${intent.color}`}>
                        {intent.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${operation.color}`}>
                        {operation.label}
                    </span>
                    {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-indigo-400" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-indigo-400" />
                    )}
                </div>
            </button>

            {isOpen && (
                <div className="p-4 bg-white border-t border-indigo-100 space-y-3">
                    {interpretation.target_entities.length > 0 && (
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Target Entities</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {interpretation.target_entities.map(entity => (
                                    <span key={entity} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-mono font-bold">
                                        {entity}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Interpretation</span>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {interpretation.why_this_interpretation}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA EVIDENCE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const SchemaEvidencePanel = ({ evidence, navigate, projectId }: {
    evidence: SchemaEvidence;
    navigate: ReturnType<typeof useNavigate>;
    projectId: string | null | undefined;
}) => (
    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Schema Evidence</span>
            </div>
            <span className="text-[9px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                v{evidence.schema_version}
            </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tables */}
            <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 opacity-60">
                    <Table className="h-3 w-3" />
                    <span className="text-[10px] font-bold text-slate-900 uppercase">
                        Tables ({evidence.tables_involved.length})
                    </span>
                </div>
                <div className="flex flex-wrap gap-1">
                    {evidence.tables_involved.length > 0 ? evidence.tables_involved.map(t => (
                        <button
                            key={t}
                            onClick={() => projectId && navigate(`/workspace/${projectId}/explorer`)}
                            className="px-2 py-0.5 bg-white hover:bg-indigo-50 hover:text-indigo-600 rounded text-[10px] font-mono border border-slate-200 transition-colors font-medium"
                        >
                            {t}
                        </button>
                    )) : (
                        <span className="text-[10px] text-slate-400 italic">None referenced</span>
                    )}
                </div>
            </div>

            {/* Columns */}
            <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 opacity-60">
                    <ShieldCheck className="h-3 w-3" />
                    <span className="text-[10px] font-bold text-slate-900 uppercase">
                        Columns ({evidence.columns_involved.length})
                    </span>
                </div>
                <div className="flex flex-wrap gap-1">
                    {evidence.columns_involved.length > 0 ? evidence.columns_involved.map(c => (
                        <span key={c} className="px-2 py-0.5 bg-white border border-slate-100 rounded text-[9px] font-mono text-slate-600">
                            {c}
                        </span>
                    )) : (
                        <span className="text-[10px] text-slate-400 italic">None referenced</span>
                    )}
                </div>
            </div>

            {/* Relationships */}
            {evidence.relationships_used.length > 0 && (
                <div className="col-span-full space-y-1.5">
                    <div className="flex items-center gap-1.5 opacity-60">
                        <Link className="h-3 w-3" />
                        <span className="text-[10px] font-bold text-slate-900 uppercase">
                            Relationships ({evidence.relationships_used.length})
                        </span>
                    </div>
                    <div className="space-y-1">
                        {evidence.relationships_used.map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px] font-mono text-slate-600 bg-white p-2 rounded border border-dashed border-slate-200">
                                <span className="text-indigo-600 font-bold">{r.from}</span>
                                <ArrowRight className="h-3 w-3 text-slate-400" />
                                <span className="text-purple-600 font-bold">{r.to}</span>
                                <span className="ml-auto text-[9px] text-slate-400 uppercase">{r.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        <p className="text-[9px] text-slate-400 italic mt-2">
            If it's not listed here → it was not used in the analysis.
        </p>
    </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// IMPACT SCOPE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ImpactScopeList = ({ impacts }: { impacts: string[] }) => {
    if (impacts.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-1 mt-2">
            {impacts.map((impact, i) => (
                <span
                    key={i}
                    className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-medium text-slate-600"
                >
                    {impact.replace(/_/g, ' ')}
                </span>
            ))}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// REASONING TRACE COMPONENT (COLLAPSIBLE)
// ═══════════════════════════════════════════════════════════════════════════

const ReasoningTrace = ({ steps }: { steps: string[] }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-purple-100 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-purple-50/50 hover:bg-purple-100/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-widest">
                        Reasoning Trace
                    </span>
                    <span className="text-[9px] text-purple-400">({steps.length} steps)</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-purple-400" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-purple-400" />
                )}
            </button>

            {isOpen && (
                <div className="p-4 bg-white border-t border-purple-100">
                    <ol className="space-y-2">
                        {steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-bold">
                                    {i + 1}
                                </span>
                                <span className="text-xs text-slate-600 leading-relaxed">{step}</span>
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIDENCE & LIMITS COMPONENT (MUTED, HONEST)
// ═══════════════════════════════════════════════════════════════════════════

const ConfidenceLimits = ({ data }: { data: ConfidenceAndLimits }) => {
    const [isOpen, setIsOpen] = useState(false);

    const confidenceConfig = {
        high: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'High Confidence' },
        medium: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Medium Confidence' },
        low: { bg: 'bg-red-50', text: 'text-red-700', label: 'Low Confidence' }
    };

    const conf = confidenceConfig[data.confidence];

    return (
        <div className="border border-slate-100 rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Confidence & Limits
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${conf.bg} ${conf.text}`}>
                        {conf.label}
                    </span>
                    {isOpen ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    )}
                </div>
            </button>

            {isOpen && (
                <div className="p-4 bg-white border-t border-slate-100 space-y-4">
                    {/* What is known */}
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <Eye className="h-3 w-3 text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase">What Is Known</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {data.what_is_known.length > 0 ? data.what_is_known.map((item, i) => (
                                <span key={i} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-medium">
                                    {item}
                                </span>
                            )) : (
                                <span className="text-[10px] text-slate-400 italic">No specific knowledge claims</span>
                            )}
                        </div>
                    </div>

                    {/* What is NOT known */}
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <EyeOff className="h-3 w-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase">What Is NOT Known</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {data.what_is_not_known.length > 0 ? data.what_is_not_known.map((item, i) => (
                                <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-medium">
                                    {item}
                                </span>
                            )) : (
                                <span className="text-[10px] text-slate-400 italic">No specific limitations</span>
                            )}
                        </div>
                    </div>

                    <p className="text-[9px] text-slate-400 italic border-t border-slate-100 pt-3">
                        This explicitly states what the schema can tell you — and what it cannot.
                    </p>
                </div>
            )}
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

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
                response: {
                    question_interpretation: data.question_interpretation || {
                        intent: 'general_query',
                        target_entities: [],
                        operation_type: 'unknown',
                        why_this_interpretation: ''
                    },
                    answer: data.answer,
                    schema_evidence: data.schema_evidence || {
                        schema_version: 0,
                        tables_involved: [],
                        columns_involved: [],
                        relationships_used: []
                    },
                    impact_and_risk: data.impact_and_risk || {
                        risk_level: 'none',
                        impact_scope: [],
                        why_this_risk_level: ''
                    },
                    reasoning_trace: data.reasoning_trace || [],
                    confidence_and_limits: data.confidence_and_limits || {
                        confidence: 'medium',
                        what_is_known: [],
                        what_is_not_known: []
                    }
                }
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Sample questions
    const sampleQuestions = [
        "What breaks if I delete the orders table?",
        "Which tables reference users?",
        "What are all the foreign key relationships?",
        "What is the impact of removing user_id from posts?"
    ];

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)] bg-white overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg">
                        <Brain className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                            Ask Schema
                            <span className="text-[10px] px-2 py-0.5 bg-slate-900 text-white rounded uppercase tracking-widest font-bold">
                                Verified
                            </span>
                        </h1>
                        <p className="text-xs text-slate-500 font-medium">
                            Ask questions about your schema and get answers backed by explicit evidence and risk analysis.
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-full border border-indigo-100">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">
                        Engineering-Grade Reasoning
                    </span>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                {messages.length === 0 && (
                    <div className="max-w-2xl mx-auto my-12">
                        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 rounded-3xl p-10 text-center relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
                                <Database size={120} />
                            </div>

                            <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100/50 border border-indigo-50">
                                <Bot className="h-8 w-8 text-indigo-600" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 mb-2">Schema Reasoning Engine</h2>
                            <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
                                Ask technical questions about your database structure.
                                Every answer includes verifiable evidence, risk analysis, and reasoning trace.
                            </p>

                            {/* Feature Pills */}
                            <div className="flex flex-wrap justify-center gap-2 mb-8">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600">
                                    <Shield className="h-3 w-3 text-emerald-500" />
                                    No Hallucinations
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600">
                                    <Zap className="h-3 w-3 text-purple-500" />
                                    Reasoning Trace
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600">
                                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                                    Risk Assessment
                                </div>
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600">
                                    <HelpCircle className="h-3 w-3 text-slate-400" />
                                    Honest Limits
                                </div>
                            </div>

                            {/* Sample Questions */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                                {sampleQuestions.map(q => (
                                    <button
                                        key={q}
                                        onClick={() => setInput(q)}
                                        className="p-3 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:text-indigo-600 hover:shadow-lg hover:shadow-indigo-50 transition-all text-left"
                                    >
                                        <FileQuestion className="h-3.5 w-3.5 inline mr-2 opacity-50" />
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
                    >
                        {msg.role === 'bot' && (
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shrink-0 mt-1 shadow-lg shadow-slate-200">
                                <ShieldCheck className="h-5 w-5 text-white" />
                            </div>
                        )}

                        <div className={`max-w-[90%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            {/* User Message */}
                            {msg.role === 'user' && (
                                <div className="px-5 py-4 rounded-2xl text-[13px] leading-relaxed shadow-sm bg-indigo-600 text-white shadow-indigo-100 rounded-tr-none">
                                    <div className="font-medium">{msg.text}</div>
                                </div>
                            )}

                            {/* Bot Response - Deep Reply Context */}
                            {msg.role === 'bot' && msg.response && (
                                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none shadow-sm ring-4 ring-slate-50/50 overflow-hidden w-full max-w-2xl">
                                    {/* Main Content */}
                                    <div className="p-5 space-y-4">
                                        {/* 1. Question Interpretation */}
                                        <QuestionInterpretationPanel interpretation={msg.response.question_interpretation} />

                                        {/* 2. Risk Badge (Prominent) */}
                                        <RiskBadge
                                            level={msg.response.impact_and_risk.risk_level}
                                            reason={msg.response.impact_and_risk.why_this_risk_level}
                                        />

                                        {/* Impact Scope */}
                                        <ImpactScopeList impacts={msg.response.impact_and_risk.impact_scope} />

                                        {/* 3. Answer (Primary) */}
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Answer</span>
                                            </div>
                                            <p className="text-sm text-slate-800 leading-relaxed font-medium">
                                                {msg.text}
                                            </p>
                                        </div>

                                        {/* 4. Schema Evidence */}
                                        <SchemaEvidencePanel
                                            evidence={msg.response.schema_evidence}
                                            navigate={navigate}
                                            projectId={projectId}
                                        />

                                        {/* 5. Reasoning Trace (Collapsible) */}
                                        <ReasoningTrace steps={msg.response.reasoning_trace} />

                                        {/* 6. Confidence & Limits (Muted, Collapsible) */}
                                        <ConfidenceLimits data={msg.response.confidence_and_limits} />
                                    </div>
                                </div>
                            )}
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
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shrink-0 animate-pulse">
                            <Database className="h-5 w-5 text-white animate-spin" />
                        </div>
                        <div className="bg-white border border-slate-100 px-6 py-4 rounded-3xl rounded-tl-none shadow-sm">
                            <div className="flex gap-1.5 items-center">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">
                                    Deep Analysis
                                </div>
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-bounce" />
                            </div>
                            <div className="text-[10px] text-slate-400 mt-2">
                                Interpreting → Analyzing → Building Evidence → Assessing Risk → Tracing Reasoning...
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
                <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
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
                        Analyze
                    </button>
                </form>

                {/* Footer - What makes this different */}
                <div className="flex items-center justify-center gap-6 mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Explicit Evidence
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                        Visible Reasoning
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        Risk Analysis
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                        Honest Limits
                    </div>
                </div>
            </div>
        </div>
    );
}
