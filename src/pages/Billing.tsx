import { useState, useEffect } from 'react';
import { useProject } from '../hooks/useProject';
import { api } from '../lib/api';
import { Check, Shield, Zap, Users, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface BillingData {
    plan: {
        id: string;
        name: string;
        project_limit: number;
        version_limit: number;
        ai_limit: string;
        export_enabled: boolean;
        designer_enabled: boolean;
        comments_enabled: boolean;
    };
    usage: {
        ai_calls: number;
        exports: number;
        versions: number;
    };
    all_plans: Record<string, any>;
}

export function Billing() {
    const { projectId, loading: projectLoading } = useProject();
    const [billing, setBilling] = useState<BillingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [upgrading, setUpgrading] = useState<string | null>(null);

    const fetchBilling = async () => {
        if (!projectId) return;
        try {
            const data = await api.getBilling(projectId);
            setBilling(data);
        } catch (err) {
            console.error("Billing fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!projectLoading) {
            if (projectId) {
                fetchBilling();
            } else {
                setLoading(false);
            }
        }
    }, [projectId, projectLoading]);

    const handleUpgrade = async (planId: string) => {
        if (!projectId) return;
        setUpgrading(planId);
        try {
            await api.upgradePlan(projectId, planId);
            await fetchBilling();
            alert(`Project successfully upgraded to ${planId.toUpperCase()}!`);
        } catch (err) {
            alert("Upgrade failed. Please try again.");
        } finally {
            setUpgrading(null);
        }
    };

    if (loading || projectLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const plans = [
        {
            id: 'free',
            name: 'Free',
            price: '₹0',
            target: 'Evaluation only',
            icon: Shield,
            color: 'gray',
            features: [
                '1 project only',
                '2 schema versions',
                'ER Diagram (view-only)',
                'DB-level AI summary',
                'Docs preview only'
            ],
            notIncluded: ['Exports', 'Designer', 'Table AI', 'Team']
        },
        {
            id: 'pro',
            name: 'Pro',
            price: '₹1,499',
            target: 'Solo devs & freelancers',
            icon: Zap,
            color: 'indigo',
            popular: true,
            features: [
                '5 projects',
                '30 schema versions per project',
                'Full ER diagrams',
                'Table-level AI explanations',
                'Full Markdown docs',
                'PNG / SVG / MD exports',
                'SQL Designer'
            ],
            notIncluded: ['Team collaboration']
        },
        {
            id: 'teams',
            name: 'Teams',
            price: '₹4,999',
            target: 'Startups & agencies',
            icon: Users,
            color: 'purple',
            features: [
                '20 projects',
                'Unlimited schema versions',
                'Full AI (DB + tables + relations)',
                'Schema comments & notes',
                'High-resolution exports',
                'Team collaboration',
                'Priority rendering'
            ]
        },
        {
            id: 'business',
            name: 'Business',
            price: '₹9,999',
            target: 'Enterprise & white-label',
            icon: Sparkles,
            color: 'amber',
            features: [
                'Unlimited projects',
                'Unlimited versions',
                'Unlimited team members',
                'White-label exports',
                'Dedicated priority queue',
                'Early feature access'
            ]
        }
    ];

    return (
        <div className="mx-auto max-w-6xl space-y-12 pb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-gray-900 tracking-tight flex items-center justify-center gap-3">
                    <Sparkles className="h-8 w-8 text-indigo-600" />
                    Scale your architecture
                </h2>
                <p className="text-gray-500 font-medium max-w-2xl mx-auto">
                    Choose the plan that fits your workflow. From solo builders to high-scale engineering teams.
                </p>
            </div>

            {/* Current Status Card */}
            <div className="bg-white rounded-[2.5rem] border-4 border-gray-50 p-8 shadow-xl shadow-gray-200/50 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                    <div className={`p-4 rounded-2xl shadow-lg ${projectId ? 'bg-indigo-600 shadow-indigo-200' : 'bg-gray-200 shadow-gray-100'}`}>
                        {projectId ? <Shield className="h-8 w-8 text-white" /> : <AlertCircle className="h-8 w-8 text-gray-400" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-black uppercase tracking-widest ${projectId ? 'text-indigo-600' : 'text-gray-400'}`}>
                                {projectId ? 'Active Plan' : 'No Project Selected'}
                            </span>
                            {projectId && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md uppercase tracking-tighter">Current</span>}
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 capitalize">
                            {projectId ? `${billing?.plan.name} Plan` : 'Select a Project'}
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pr-4">
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Versions</p>
                        <p className="text-xl font-black text-gray-900">
                            {projectId ? `${billing?.usage.versions} / ${billing?.plan.version_limit === 9999 ? '∞' : billing?.plan.version_limit}` : '--'}
                        </p>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Projects</p>
                        <p className="text-xl font-black text-gray-900">{projectId ? billing?.plan.project_limit : '--'}</p>
                    </div>
                    <div className="text-center px-4 hidden sm:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">AI Access</p>
                        <p className="text-xl font-black text-gray-900 capitalize">{projectId ? billing?.plan.ai_limit : '--'}</p>
                    </div>
                </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative group flex flex-col p-8 rounded-[2.5rem] border-4 transition-all duration-300 ${plan.popular
                                ? 'bg-white border-indigo-600 shadow-2xl shadow-indigo-100 lg:scale-105 z-10'
                                : 'bg-white border-gray-50 hover:border-gray-200 shadow-xl shadow-gray-100'
                            }`}
                    >
                        {plan.popular && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-xl shadow-indigo-200">
                                Most Popular
                            </div>
                        )}

                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300 ${plan.id === 'free' ? 'bg-gray-100 text-gray-600' :
                                plan.id === 'pro' ? 'bg-indigo-100 text-indigo-600' :
                                    plan.id === 'teams' ? 'bg-purple-100 text-purple-600' :
                                        'bg-amber-100 text-amber-600'
                            }`}>
                            <plan.icon className="h-6 w-6" />
                        </div>

                        <h4 className="text-xl font-black text-gray-900 mb-1">{plan.name}</h4>
                        <p className="text-xs text-gray-500 font-medium mb-6 min-h-[32px]">{plan.target}</p>

                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                            <span className="text-gray-400 text-sm font-bold">/ month</span>
                        </div>

                        <ul className="space-y-4 mb-10 flex-1">
                            {plan.features.map((f) => (
                                <li key={f} className="flex items-start gap-3 text-sm font-bold text-gray-700">
                                    <div className="mt-0.5 p-0.5 bg-green-100 rounded-full shrink-0">
                                        <Check className="h-3 w-3 text-green-600" />
                                    </div>
                                    {f}
                                </li>
                            ))}
                            {plan.notIncluded?.map((f) => (
                                <li key={f} className="flex items-start gap-3 text-sm font-bold text-gray-400/60">
                                    <div className="mt-0.5 p-0.5 bg-gray-50 rounded-full shrink-0">
                                        <AlertCircle className="h-3 w-3" />
                                    </div>
                                    {f}
                                </li>
                            ))}
                        </ul>

                        <button
                            onClick={() => handleUpgrade(plan.id)}
                            disabled={billing?.plan.id === plan.id || !!upgrading}
                            className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 ${billing?.plan.id === plan.id
                                    ? 'bg-gray-100 text-gray-400 cursor-default'
                                    : plan.popular
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200'
                                        : plan.id === 'business'
                                            ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-xl shadow-amber-200'
                                            : 'bg-gray-900 text-white hover:bg-black'
                                }`}
                        >
                            {upgrading === plan.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : billing?.plan.id === plan.id ? (
                                'Active Plan'
                            ) : (
                                `Unlock ${plan.name}`
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Policy Notes */}
            <div className="text-center">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-loose">
                    All prices are in INR. Subscriptions are billed monthly. <br />
                    Canceling a plan returns your project to Free tier limits immediately.
                </p>
            </div>
        </div>
    );
}
