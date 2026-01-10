import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, ArrowRight, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function InviteAccept() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'auth_required'>('verifying');
    const [error, setError] = useState('');
    useEffect(() => {
        if (!token) {
            setStatus('error');
            setError('Missing invitation token.');
            return;
        }

        if (!user) {
            setStatus('auth_required');
            return;
        }

        const acceptInvite = async () => {
            try {
                // 1. Validate token
                const { data: invite, error: iErr } = await supabase
                    .from('workspace_invites')
                    .select('*')
                    .eq('token', token)
                    .single();

                if (iErr || !invite) throw new Error("Invalid invitation");
                if (invite.revoked) throw new Error("Invitation revoked");
                if (new Date(invite.expires_at) < new Date()) throw new Error("Invitation expired");
                if (invite.used_count >= invite.max_uses) throw new Error("Invitation uses exceeded");

                // 2. Add member
                const { error: mErr } = await supabase
                    .from('workspace_members')
                    .insert({
                        workspace_id: invite.workspace_id,
                        user_id: user.id,
                        role: invite.role
                    });

                if (mErr) {
                    if (mErr.code === '23505') {
                        // Already a member
                    } else {
                        throw mErr;
                    }
                }

                // 3. Increment used count
                await supabase
                    .from('workspace_invites')
                    .update({ used_count: (invite.used_count || 0) + 1 })
                    .eq('id', invite.id);

                setStatus('success');
            } catch (err: any) {
                setStatus('error');
                setError(err.message || 'Failed to accept invitation.');
            }
        };

        acceptInvite();
    }, [token, user]);

    const handleContinue = () => {
        navigate('/account');
    };

    const handleLoginRedirect = () => {
        // Redirect to login with return URL
        navigate(`/login?redirectTo=/join?token=${token}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center border border-slate-100">

                {status === 'verifying' && (
                    <div className="py-8">
                        <Loader2 className="w-12 h-12 text-indigo-600 mx-auto animate-spin mb-4" />
                        <h2 className="text-xl font-bold text-slate-900">Verifying Invitation...</h2>
                        <p className="text-slate-500 mt-2">Please wait while we secure your access.</p>
                    </div>
                )}

                {status === 'auth_required' && (
                    <div className="py-8 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <LogIn className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Login Required</h2>
                        <p className="text-slate-500 mt-2 mb-8">You need to be logged in to join this workspace.</p>

                        <button
                            onClick={handleLoginRedirect}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        >
                            Log In / Sign Up to Continue
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {status === 'success' && (
                    <div className="py-8 animate-in fade-in zoom-in duration-300">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">Welcome to the Team!</h2>
                        <p className="text-slate-500 mt-2 mb-8">You have successfully joined the workspace.</p>

                        <button
                            onClick={handleContinue}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 group"
                        >
                            Go to Dashboard
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="py-8 animate-in shake duration-300">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Invitation Failed</h2>
                        <p className="text-slate-500 mt-2 mb-8">{error}</p>

                        <a
                            href="/"
                            className="inline-block text-sm font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                            Back to Home
                        </a>
                    </div>
                )}
            </div>

            <div className="mt-8 text-center text-slate-400 text-xs text-balance">
                Vizora Secure Team Access
            </div>
        </div>
    );
}
