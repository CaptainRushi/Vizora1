import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    CheckCircle,
    XCircle,
    ArrowRight,
    Loader2,
    LogIn,
    Users,
    Shield,
    Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../lib/api';

interface InviteValidation {
    valid: boolean;
    workspace_name?: string;
    workspace_type?: string;
    role?: string;
    expires_at?: string;
    message?: string;
    error?: string;
}

export function JoinTeam() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'preview' | 'joining' | 'success' | 'error' | 'auth_required'>('loading');
    const [inviteInfo, setInviteInfo] = useState<InviteValidation | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setError('Missing invitation token.');
            return;
        }

        // Validate token first
        validateToken();
    }, [token]);

    useEffect(() => {
        // Re-check auth after token validation
        if (status === 'preview' && !user) {
            setStatus('auth_required');
        } else if (status === 'auth_required' && user) {
            setStatus('preview');
        }
    }, [user, status]);

    const validateToken = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/team/invite-link/validate?token=${token}`);
            const data: InviteValidation = await response.json();

            if (!data.valid) {
                setStatus('error');
                setError(data.error || 'This invite link is invalid or expired.');
                return;
            }

            setInviteInfo(data);

            if (!user) {
                setStatus('auth_required');
            } else {
                setStatus('preview');
            }
        } catch (err: any) {
            setStatus('error');
            setError('Failed to validate invitation. Please try again.');
        }
    };

    const handleJoin = async () => {
        if (!user || !token) return;

        setStatus('joining');

        try {
            const response = await fetch(`${BACKEND_URL}/api/team/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id
                },
                body: JSON.stringify({ token })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to join workspace.');
            }

            setStatus('success');
        } catch (err: any) {
            setStatus('error');
            setError(err.message || 'Failed to join workspace.');
        }
    };

    const handleContinue = () => {
        navigate('/account');
    };

    const handleLoginRedirect = () => {
        // Redirect to login with return URL
        navigate(`/login?redirectTo=/join/team?token=${token}`);
    };

    const formatRole = (role?: string) => {
        if (!role) return 'Member';
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden border border-slate-100">

                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white text-center">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Users className="w-7 h-7" />
                    </div>
                    <h1 className="text-xl font-black">Join Workspace</h1>
                    <p className="text-indigo-200 text-sm mt-1">Secure team invitation</p>
                </div>

                {/* Content */}
                <div className="p-8">
                    {status === 'loading' && (
                        <div className="py-8 text-center">
                            <Loader2 className="w-12 h-12 text-indigo-600 mx-auto animate-spin mb-4" />
                            <h2 className="text-xl font-bold text-slate-900">Verifying Invitation...</h2>
                            <p className="text-slate-500 mt-2">Please wait while we validate your link.</p>
                        </div>
                    )}

                    {status === 'auth_required' && (
                        <div className="py-6 animate-in fade-in zoom-in duration-300">
                            {/* Invitation Preview */}
                            {inviteInfo && (
                                <div className="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{inviteInfo.workspace_name}</h3>
                                            <p className="text-xs text-slate-500 capitalize">{inviteInfo.workspace_type} Workspace</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                                        <Shield className="w-4 h-4 text-indigo-600" />
                                        <span>You'll join as: <strong className="text-slate-900">{formatRole(inviteInfo.role)}</strong></span>
                                    </div>
                                </div>
                            )}

                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <LogIn className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Login Required</h2>
                                <p className="text-slate-500 mt-2">You need to be logged in to accept this invitation.</p>
                            </div>

                            <button
                                onClick={handleLoginRedirect}
                                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                            >
                                Log In / Sign Up to Join
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {status === 'preview' && inviteInfo && (
                        <div className="py-4 animate-in fade-in zoom-in duration-300">
                            {/* Workspace Info */}
                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-6 border border-indigo-100">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                        <Building2 className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900">{inviteInfo.workspace_name}</h3>
                                        <p className="text-sm text-slate-500 capitalize">{inviteInfo.workspace_type} Workspace</p>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-indigo-100 space-y-3">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500 flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            Your Role
                                        </span>
                                        <span className="font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">
                                            {formatRole(inviteInfo.role)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                                    <Users className="w-4 h-4 text-amber-600" />
                                </div>
                                <div className="text-sm text-amber-800">
                                    <p className="font-bold mb-1">You are joining this workspace</p>
                                    <p className="text-xs text-amber-600">You'll have access to shared projects and team features.</p>
                                </div>
                            </div>

                            <button
                                onClick={handleJoin}
                                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 group"
                            >
                                Join Workspace
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {status === 'joining' && (
                        <div className="py-8 text-center">
                            <Loader2 className="w-12 h-12 text-indigo-600 mx-auto animate-spin mb-4" />
                            <h2 className="text-xl font-bold text-slate-900">Joining Workspace...</h2>
                            <p className="text-slate-500 mt-2">Setting up your access...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="py-6 animate-in fade-in zoom-in duration-300 text-center">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-100">
                                <CheckCircle className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">Welcome to the Team!</h2>
                            <p className="text-slate-500 mt-2 mb-8">You have successfully joined the workspace.</p>

                            <button
                                onClick={handleContinue}
                                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-green-200"
                            >
                                Go to Dashboard
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="py-6 animate-in fade-in duration-300 text-center">
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <XCircle className="w-10 h-10" />
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
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-slate-400 text-xs">
                Vizora Secure Team Access
            </div>
        </div>
    );
}
