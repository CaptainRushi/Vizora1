import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle2, User, Building2, Users, CreditCard, ArrowRight, ArrowLeft } from 'lucide-react';

type WorkspaceType = 'personal' | 'team';
type UsageType = 'solo' | 'team';
type TeamSize = '2-5' | '6-10' | '10+';
type PlanIntent = 'free' | 'pro' | 'team';

interface OnboardingData {
    // Step 1: Identity
    username: string;
    roleTitle: string;

    // Step 2: Workspace
    workspaceName: string;
    workspaceType: WorkspaceType;

    // Step 3: Usage Type
    usageType: UsageType;
    teamSize?: TeamSize;

    // Step 4: Billing
    country: string;
    billingCurrency: string;
    billingEmail: string;
    planIntent: PlanIntent;
}

export function OnboardingForm() {
    const { user } = useAuth();
    const navigate = useNavigate();



    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<OnboardingData>({
        username: user?.user_metadata?.full_name || '',
        roleTitle: '',
        workspaceName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
        workspaceType: 'personal',
        usageType: 'solo',
        teamSize: undefined,
        country: 'US',
        billingCurrency: 'USD',
        billingEmail: user?.email || '',
        planIntent: 'free',
    });

    const totalSteps = 4;

    const updateField = (field: keyof OnboardingData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setError(null);
    };

    const validateStep = (step: number): boolean => {
        switch (step) {
            case 1:
                if (!formData.username.trim()) {
                    setError('Username is required');
                    return false;
                }
                return true;
            case 2:
                if (!formData.workspaceName.trim()) {
                    setError('Workspace name is required');
                    return false;
                }
                return true;
            case 3:
                if (formData.usageType === 'team' && !formData.teamSize) {
                    setError('Please select expected team size');
                    return false;
                }
                return true;
            case 4:
                if (!formData.country || !formData.billingEmail) {
                    setError('Country and billing email are required');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        setError(null);
    };

    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!validateStep(currentStep)) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Create workspace
            const { data: workspace, error: workspaceError } = await supabase
                .from('workspaces')
                .insert({
                    name: formData.workspaceName,
                    type: formData.workspaceType,
                    owner_id: user?.id,
                })
                .select()
                .single();

            if (workspaceError) throw workspaceError;

            // 2. Add user as workspace member (admin)
            const { error: memberError } = await supabase
                .from('workspace_members')
                .insert({
                    workspace_id: workspace.id,
                    user_id: user?.id,
                    role: 'admin',
                });

            if (memberError) throw memberError;

            // 4. Update user profile
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    id: user?.id,
                    username: formData.username,
                    role_title: formData.roleTitle,
                    onboarded: true,
                    default_workspace_id: workspace.id,
                });

            if (profileError) throw profileError;

            // Success Transition
            setIsSuccess(true);
            setTimeout(() => {
                navigate('/account', { replace: true });
            }, 10000);

        } catch (err: any) {
            console.error('Onboarding error:', err);
            let errorMessage = err.message || 'Failed to complete onboarding. Please try again.';
            if (err.code === '42P17') {
                errorMessage = 'System configuration error (RLS Policy). Please report this code: 42P17.';
            }
            setError(errorMessage);
            setIsSubmitting(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Welcome to Vizora</h2>
                            <p className="text-sm text-gray-500">Let's set up your account</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Username <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => updateField('username', e.target.value)}
                                placeholder="johndoe"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                            <p className="text-xs text-gray-400 mt-1">Used across your dashboard</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Role / Title <span className="text-gray-400 text-xs">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.roleTitle}
                                onChange={(e) => updateField('roleTitle', e.target.value)}
                                placeholder="e.g. Backend Engineer, Founder, Tech Lead"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Building2 className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Workspace Setup</h2>
                            <p className="text-sm text-gray-500">Workspace is how projects and billing are grouped</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Workspace / Company Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.workspaceName}
                                onChange={(e) => updateField('workspaceName', e.target.value)}
                                placeholder="My Company"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                Workspace Type <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => updateField('workspaceType', 'personal')}
                                    className={`w-full p-4 border-2 rounded-xl text-left transition-all ${formData.workspaceType === 'personal'
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${formData.workspaceType === 'personal' ? 'border-indigo-600' : 'border-gray-300'
                                            }`}>
                                            {formData.workspaceType === 'personal' && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Personal</p>
                                            <p className="text-xs text-gray-500 mt-1">For individual use</p>
                                        </div>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => updateField('workspaceType', 'team')}
                                    className={`w-full p-4 border-2 rounded-xl text-left transition-all ${formData.workspaceType === 'team'
                                        ? 'border-indigo-600 bg-indigo-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${formData.workspaceType === 'team' ? 'border-indigo-600' : 'border-gray-300'
                                            }`}>
                                            {formData.workspaceType === 'team' && (
                                                <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">Team</p>
                                            <p className="text-xs text-gray-500 mt-1">For collaborative work</p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Usage Type</h2>
                            <p className="text-sm text-gray-500">How will you use Vizora?</p>
                        </div>

                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => {
                                    updateField('usageType', 'solo');
                                    updateField('teamSize', undefined);
                                }}
                                className={`w-full p-4 border-2 rounded-xl text-left transition-all ${formData.usageType === 'solo'
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${formData.usageType === 'solo' ? 'border-indigo-600' : 'border-gray-300'
                                        }`}>
                                        {formData.usageType === 'solo' && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Solo Developer</p>
                                        <p className="text-xs text-gray-500 mt-1">I work alone • One seat</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => updateField('usageType', 'team')}
                                className={`w-full p-4 border-2 rounded-xl text-left transition-all ${formData.usageType === 'team'
                                    ? 'border-indigo-600 bg-indigo-50'
                                    : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${formData.usageType === 'team' ? 'border-indigo-600' : 'border-gray-300'
                                        }`}>
                                        {formData.usageType === 'team' && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Team / Company</p>
                                        <p className="text-xs text-gray-500 mt-1">Multiple people will collaborate</p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {formData.usageType === 'team' && (
                            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                                <label className="block text-sm font-bold text-gray-700 mb-3">
                                    Expected Team Size
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['2-5', '6-10', '10+'] as TeamSize[]).map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => updateField('teamSize', size)}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${formData.teamSize === size
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CreditCard className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">Billing Setup</h2>
                            <p className="text-sm text-gray-500">No payment required now</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Country <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.country}
                                onChange={(e) => updateField('country', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            >
                                <option value="US">United States</option>
                                <option value="GB">United Kingdom</option>
                                <option value="CA">Canada</option>
                                <option value="AU">Australia</option>
                                <option value="IN">India</option>
                                <option value="DE">Germany</option>
                                <option value="FR">France</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Billing Currency
                            </label>
                            <select
                                value={formData.billingCurrency}
                                onChange={(e) => updateField('billingCurrency', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            >
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="INR">INR (₹)</option>
                                <option value="AUD">AUD (A$)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Billing Email
                            </label>
                            <input
                                type="email"
                                value={formData.billingEmail}
                                onChange={(e) => updateField('billingEmail', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">
                                Plan Intent <span className="text-gray-400 text-xs">(optional)</span>
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['free', 'pro', 'team'] as PlanIntent[]).map((plan) => (
                                    <button
                                        key={plan}
                                        type="button"
                                        onClick={() => updateField('planIntent', plan)}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${formData.planIntent === plan
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        {plan}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-8 animate-bounce transition-all duration-1000">
                    <CheckCircle2 className="w-12 h-12" />
                </div>

                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4 animate-in slide-in-from-bottom-4 duration-1000">
                    Welcome to the beta version of Vizora
                </h1>
                <p className="text-slate-500 font-medium max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-1000 delay-300">
                    Your workspace is ready. Redirecting you to your dashboard...
                </p>

                <div className="mt-12 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="w-4 h-4 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
                    Preparing your workspace
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <div className="w-full max-w-lg">
                {/* Progress Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Step {currentStep} of {totalSteps}
                        </span>
                        <span className="text-xs font-bold text-indigo-600">
                            {Math.round((currentStep / totalSteps) * 100)}%
                        </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-indigo-600 transition-all duration-300"
                            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-10">
                    {renderStep()}

                    {/* Error Message */}
                    {error && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-sm text-red-600 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="mt-10 flex items-center gap-3">
                        {currentStep > 1 && (
                            <button
                                onClick={prevStep}
                                disabled={isSubmitting}
                                className="flex items-center gap-2 px-6 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back
                            </button>
                        )}

                        {currentStep < totalSteps ? (
                            <button
                                onClick={nextStep}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Finalizing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Start Exploring
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-xs text-gray-400 font-medium">
                    &copy; 2026 Vizora. All rights reserved. Beta Access.
                </p>
            </div>
        </div>
    );
}
