
import React, { useEffect, useState } from 'react';
import { Github, Chrome, AlertCircle } from 'lucide-react';
import { OAuthButton } from './OAuthButton';
import { supabase } from '../../lib/supabase';

export const SignInPage: React.FC = () => {
    const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        // Check for error in URL params
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));

        const errorDesc = params.get('error_description') || hashParams.get('error_description');
        const errorMsg = params.get('error') || hashParams.get('error');

        if (errorDesc) {
            setAuthError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
        } else if (errorMsg) {
            setAuthError(errorMsg);
        }

        // Check if Supabase is properly configured
        const checkConnection = async () => {
            try {
                const { error } = await supabase.auth.getSession();
                setSupabaseConnected(!error);
            } catch (err) {
                console.error('[SignIn] Supabase connection failed:', err);
                setSupabaseConnected(false);
            }
        };
        checkConnection();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
            <div className="w-full max-w-md">
                {/* Logo/Brand */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2">
                        <div className="grid grid-cols-2 gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-slate-900">Vizora</span>
                    </div>
                </div>

                {/* Auth Error Warning */}
                {authError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-red-900 mb-1">Authentication Failed</p>
                            <p className="text-xs text-red-700">{authError}</p>
                            <p className="text-[10px] text-red-500 mt-2">
                                Tip: This often happens if your database trigger for new users is broken.
                            </p>
                        </div>
                    </div>
                )}

                {/* Connection Warning */}
                {supabaseConnected === false && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold text-red-900 mb-1">Supabase Not Configured</p>
                            <p className="text-xs text-red-700">
                                Please check your <code className="bg-red-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
                                <code className="bg-red-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in .env file.
                            </p>
                            <div className="mt-2 p-2 bg-red-100 rounded text-[10px] font-mono text-red-800 break-all">
                                Target: {import.meta.env.VITE_SUPABASE_URL || 'MISSING'}
                            </div>
                            <p className="text-xs text-red-600 mt-2">
                                See <code className="bg-red-100 px-1 rounded">OAUTH_SETUP_GUIDE.md</code> for help.
                            </p>
                        </div>
                    </div>
                )}



                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                    <div className="p-8 pb-6 text-center">
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">
                            Sign in to your workspace
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Use your developer account to continue
                        </p>
                    </div>

                    <div className="p-8 pt-0 space-y-3">
                        <OAuthButton
                            provider="google"
                            label="Continue with Google"
                            icon={<Chrome className="w-5 h-5 text-[#4285F4]" />}
                            className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                        />

                        <OAuthButton
                            provider="github"
                            label="Continue with GitHub"
                            icon={<Github className="w-5 h-5" />}
                            className="bg-slate-900 hover:bg-slate-800 text-white border-transparent"
                        />
                    </div>

                    <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
                        <p className="text-xs text-center text-slate-500 leading-relaxed">
                            By continuing, you agree to access your projects using your existing account.
                        </p>
                    </div>
                </div>

                <p className="mt-8 text-center text-sm text-slate-400">
                    Trusted by developers worldwide.
                </p>
            </div>
        </div>
    );
};
