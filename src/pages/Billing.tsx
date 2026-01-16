import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Check, Shield, Zap, Users, Sparkles, AlertCircle, CreditCard } from 'lucide-react';
import { useOptimizedFetch } from '../hooks/useOptimizedFetch';
import { LoadingSection } from '../components/LoadingSection';

interface BillingPlan {
    id: string;
    price_inr: number;
    project_limit: number;
    version_limit: number;
    allow_exports: boolean;
    allow_designer: boolean;
    allow_team: boolean;
    ai_level: string;
}

interface WorkspaceBilling {
    workspace_id: string;
    plan_id: string;
    status: string;
    current_period_start: string;
    current_period_end: string;
}

interface WorkspaceUsage {
    workspace_id: string;
    projects_count: number;
    storage_bytes: number;
    ai_tokens_used: number;
}

export function Billing() {
    const { user } = useAuth();
    const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);

    // Fetch user's workspace
    const fetchWorkspace = useCallback(async () => {
        if (!user) return null;

        const { data, error } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .single();

        if (error) {
            console.error('Workspace fetch error:', error);
            return null;
        }

        return data;
    }, [user]);

    // Fetch billing plans
    const fetchPlans = useCallback(async () => {
        const { data, error } = await supabase
            .from('billing_plans')
            .select('*')
            .order('price_inr', { ascending: true });

        if (error) throw error;
        return data || [];
    }, []);

    // Fetch workspace billing
    const fetchWorkspaceBilling = useCallback(async () => {
        if (!currentWorkspaceId) return null;

        const { data, error } = await supabase
            .from('workspace_billing')
            .select('*')
            .eq('workspace_id', currentWorkspaceId)
            .single();

        if (error) {
            console.error('Billing fetch error:', error);
            return null;
        }

        return data;
    }, [currentWorkspaceId]);

    // Fetch workspace usage
    const fetchWorkspaceUsage = useCallback(async () => {
        if (!currentWorkspaceId) return null;

        const { data, error } = await supabase
            .from('workspace_usage')
            .select('*')
            .eq('workspace_id', currentWorkspaceId)
            .single();

        if (error) {
            console.error('Usage fetch error:', error);
            return null;
        }

        return data;
    }, [currentWorkspaceId]);

    // Use optimized fetch hooks
    const { data: plans = [], loading: plansLoading } = useOptimizedFetch<BillingPlan[]>(
        'billing-plans',
        fetchPlans,
        { cacheTime: 10 * 60 * 1000 } // Cache for 10 minutes
    );

    const { data: workspaceBilling, loading: billingLoading } = useOptimizedFetch<WorkspaceBilling | null>(
        `workspace-billing-${currentWorkspaceId}`,
        fetchWorkspaceBilling,
        { enabled: !!currentWorkspaceId }
    );

    const { data: workspaceUsage, loading: usageLoading } = useOptimizedFetch<WorkspaceUsage | null>(
        `workspace-usage-${currentWorkspaceId}`,
        fetchWorkspaceUsage,
        { enabled: !!currentWorkspaceId }
    );

    // Load workspace on mount
    useEffect(() => {
        if (user) {
            fetchWorkspace().then(workspace => {
                if (workspace) {
                    setCurrentWorkspaceId(workspace.id);
                }
            });
        }
    }, [user, fetchWorkspace]);


    const loading = plansLoading || billingLoading || usageLoading;
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <LoadingSection title="Loading Billing..." subtitle="Accessing your subscription status and usage metrics." />
            </div>
        );
    }

    const currentPlan = (plans || []).find(p => p.id === workspaceBilling?.plan_id) || (plans || []).find(p => p.id === 'free');

    const planConfigs = [
        {
            id: 'free',
            name: 'Free',
            displayPrice: '₹0',
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
            displayPrice: '₹1,499',
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
            displayPrice: '₹4,999',
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
            displayPrice: '₹9,999',
            target: 'High-leverage agencies',
            icon: Sparkles,
            color: 'black',
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
        <div className="mx-auto max-w-7xl space-y-12 pb-20 animate-in fade-in duration-500">
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
                    <div className={`p-4 rounded-2xl shadow-lg ${currentWorkspaceId ? 'bg-indigo-600 shadow-indigo-200' : 'bg-gray-200 shadow-gray-100'}`}>
                        {currentWorkspaceId ? <CreditCard className="h-8 w-8 text-white" /> : <AlertCircle className="h-8 w-8 text-gray-400" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-black uppercase tracking-widest ${currentWorkspaceId ? 'text-indigo-600' : 'text-gray-400'}`}>
                                {currentWorkspaceId ? 'Active Plan' : 'No Workspace'}
                            </span>
                            {currentWorkspaceId && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md uppercase tracking-tighter">Current</span>}
                        </div>
                        <h3 className="text-3xl font-black text-gray-900 capitalize">
                            {currentPlan?.id || 'Free'} Plan
                        </h3>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pr-4">
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Projects</p>
                        <p className="text-xl font-black text-gray-900">
                            {workspaceUsage ? `${workspaceUsage.projects_count} / ${currentPlan?.project_limit || 1}` : '--'}
                        </p>
                    </div>
                    <div className="text-center px-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Versions</p>
                        <p className="text-xl font-black text-gray-900">
                            {currentPlan?.version_limit === -1 ? '∞' : currentPlan?.version_limit || 2}
                        </p>
                    </div>
                    <div className="text-center px-4 hidden sm:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">AI Level</p>
                        <p className="text-xl font-black text-gray-900 capitalize">{currentPlan?.ai_level || 'none'}</p>
                    </div>
                </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {planConfigs.map((planConfig) => {


                    return (
                        <div
                            key={planConfig.id}
                            className={`relative group flex flex-col p-8 rounded-[2.5rem] border-4 transition-all duration-300 ${planConfig.popular
                                ? 'bg-white border-indigo-600 shadow-2xl shadow-indigo-100 xl:scale-105 z-10'
                                : 'bg-white border-gray-50 hover:border-gray-200 shadow-xl shadow-gray-100'
                                }`}
                        >
                            {planConfig.popular && (
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-xl shadow-indigo-200">
                                    Most Popular
                                </div>
                            )}

                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300 ${planConfig.id === 'free' ? 'bg-gray-100 text-gray-600' :
                                planConfig.id === 'pro' ? 'bg-indigo-100 text-indigo-600' :
                                    planConfig.id === 'teams' ? 'bg-purple-100 text-purple-600' :
                                        'bg-slate-900 text-white'
                                }`}>
                                <planConfig.icon className="h-6 w-6" />
                            </div>

                            <h4 className="text-xl font-black text-gray-900 mb-1">{planConfig.name}</h4>
                            <p className="text-xs text-gray-500 font-medium mb-6 min-h-[32px]">{planConfig.target}</p>

                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-black text-gray-900">{planConfig.displayPrice}</span>
                                <span className="text-gray-400 text-sm font-bold">/ month</span>
                            </div>

                            <ul className="space-y-4 mb-10 flex-1">
                                {planConfig.features.map((f) => (
                                    <li key={f} className="flex items-start gap-3 text-sm font-bold text-gray-700">
                                        <div className="mt-0.5 p-0.5 bg-green-100 rounded-full shrink-0">
                                            <Check className="h-3 w-3 text-green-600" />
                                        </div>
                                        {f}
                                    </li>
                                ))}
                                {planConfig.notIncluded?.map((f) => (
                                    <li key={f} className="flex items-start gap-3 text-sm font-bold text-gray-400/60">
                                        <div className="mt-0.5 p-0.5 bg-gray-50 rounded-full shrink-0">
                                            <AlertCircle className="h-3 w-3" />
                                        </div>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <button
                                disabled={true}
                                className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-dashed border-gray-200"
                            >
                                Pricing Disabled (Beta)
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Policy Notes */}
            <div className="text-center">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-loose">
                    All prices are in INR. One-time payment per period. <br />
                    No auto-renewal. Manual renewal required when plan expires.
                </p>
            </div>
        </div>
    );
}
