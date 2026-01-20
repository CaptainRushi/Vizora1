import { useState, useEffect } from 'react';
import {
    X,
    Shield,
    Link as LinkIcon,
    Copy,
    CheckCircle2,
    AlertCircle,
    Clock,
    RefreshCw,
    Ban,
    Users
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL } from '../../lib/api';

import { motion, AnimatePresence } from 'framer-motion';

interface InviteModalProps {
    workspaceId: string;
    workspaceName?: string;
    onClose: () => void;
    onInviteGenerated: () => void;
}

export function InviteModal({ workspaceId, workspaceName, onClose, onInviteGenerated }: InviteModalProps) {
    const { user } = useAuth();
    const [role, setRole] = useState<'member' | 'admin'>('member');
    const [expiresInDays, setExpiresInDays] = useState<number>(7);
    const [loading, setLoading] = useState(false);
    const [revoking, setRevoking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [activeInvite, setActiveInvite] = useState<any>(null);

    // Fetch existing active invite on mount
    useEffect(() => {
        fetchActiveInvite();
    }, [workspaceId]);

    const fetchActiveInvite = async () => {
        try {
            const { data } = await supabase
                .from('workspace_invites')
                .select('*')
                .eq('workspace_id', workspaceId)
                .eq('is_active', true)
                .eq('revoked', false)
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                setActiveInvite(data);
                setInviteUrl(`${window.location.origin}/join/team?token=${data.token}`);
                setRole(data.role);
            }
        } catch (err) {
            console.error('Failed to fetch active invite:', err);
        }
    };

    const generateLink = async () => {
        setLoading(true);
        setError(null);

        try {
            // Use backend API for secure token generation
            const response = await fetch(`${BACKEND_URL}/api/team/invite-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user?.id || ''
                },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    role: role,
                    expires_in_days: expiresInDays
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to generate invite link');
            }

            setInviteUrl(data.join_url);
            setActiveInvite(data.invite);
            onInviteGenerated();
        } catch (err: any) {
            setError(err.message || 'Failed to generate invite link');
        } finally {
            setLoading(false);
        }
    };

    const regenerateLink = async () => {
        // Reset current link and generate new one
        setInviteUrl(null);
        setActiveInvite(null);
        await generateLink();
    };

    const revokeLink = async () => {
        setRevoking(true);
        setError(null);

        try {
            const response = await fetch(`${BACKEND_URL}/api/team/invite-link/revoke`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user?.id || ''
                },
                body: JSON.stringify({
                    workspace_id: workspaceId,
                    invite_id: activeInvite?.id
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to revoke invite link');
            }

            // Clear the link
            setInviteUrl(null);
            setActiveInvite(null);
            onInviteGenerated();
        } catch (err: any) {
            setError(err.message || 'Failed to revoke invite link');
        } finally {
            setRevoking(false);
        }
    };

    const copyToClipboard = () => {
        if (inviteUrl) {
            navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatExpiry = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    transition={{ duration: 0.3 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 30, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.96, y: 20, filter: 'blur(10px)' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 400, mass: 0.8 }}
                    className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-[520px] overflow-hidden"
                >

                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Invite to Workspace</h2>
                                    {workspaceName && (
                                        <p className="text-indigo-200 text-sm mt-0.5">{workspaceName}</p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-white/70 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-2 border border-red-100">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        {!inviteUrl ? (
                            /* STATE 1: CONFIGURATION */
                            <div className="space-y-6">
                                {/* Role Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                        Select Role
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setRole('member')}
                                            className={`relative p-4 rounded-xl border-2 text-left transition-all ${role === 'member'
                                                ? 'border-indigo-600 bg-indigo-50/50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 font-bold text-gray-900 mb-1">
                                                <Shield className="w-4 h-4 text-indigo-600" />
                                                Member
                                            </div>
                                            <p className="text-xs text-gray-500">Can work on projects, generate diagrams & docs.</p>
                                            {role === 'member' && (
                                                <div className="absolute top-4 right-4 text-indigo-600">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                            )}
                                        </button>

                                        <button
                                            onClick={() => setRole('admin')}
                                            className={`relative p-4 rounded-xl border-2 text-left transition-all ${role === 'admin'
                                                ? 'border-purple-600 bg-purple-50/50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 font-bold text-gray-900 mb-1">
                                                <Shield className="w-4 h-4 text-purple-600 fill-purple-200" />
                                                Admin
                                            </div>
                                            <p className="text-xs text-gray-500">Full access: invite, manage team & billing.</p>
                                            {role === 'admin' && (
                                                <div className="absolute top-4 right-4 text-purple-600">
                                                    <CheckCircle2 className="w-5 h-5" />
                                                </div>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Expiry Selector */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                                        Link Expires In
                                    </label>
                                    <div className="flex gap-2">
                                        {[1, 7, 14, 30].map((days) => (
                                            <button
                                                key={days}
                                                onClick={() => setExpiresInDays(days)}
                                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${expiresInDays === days
                                                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-600 ring-offset-2'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {days === 1 ? '1 day' : `${days} days`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={generateLink}
                                    disabled={loading}
                                    className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                                >
                                    {loading ? (
                                        <><RefreshCw className="w-4 h-4 animate-spin" /> Generating...</>
                                    ) : (
                                        <>
                                            <LinkIcon className="w-4 h-4" />
                                            Generate Join Link
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            /* STATE 2: LINK GENERATED */
                            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                                {/* Success Banner */}
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-green-800">Join link created!</p>
                                        <p className="text-xs text-green-600">Share it with your teammate.</p>
                                    </div>
                                </div>

                                {/* Link Display */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        Share this link
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-600 font-mono truncate select-all">
                                            {inviteUrl}
                                        </div>
                                        <button
                                            onClick={copyToClipboard}
                                            className={`p-3 rounded-xl font-bold text-sm shrink-0 transition-colors flex items-center gap-2 ${copied
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                                }`}
                                        >
                                            {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Link Info */}
                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                                        <div className="text-xs text-amber-800 space-y-1">
                                            <p className="font-bold">Link Details</p>
                                            <ul className="list-disc pl-4 space-y-1">
                                                <li>Role: <span className="font-semibold capitalize">{role}</span></li>
                                                {activeInvite?.expires_at && (
                                                    <li>Expires: <span className="font-semibold">{formatExpiry(activeInvite.expires_at)}</span></li>
                                                )}
                                                <li>Anyone with this link can join as a {role}</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={regenerateLink}
                                        disabled={loading}
                                        className="flex-1 py-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-indigo-200"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                                        Regenerate
                                    </button>
                                    <button
                                        onClick={revokeLink}
                                        disabled={revoking}
                                        className="flex-1 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-red-200"
                                    >
                                        <Ban className={`w-4 h-4 ${revoking ? 'animate-spin' : ''}`} />
                                        Revoke Link
                                    </button>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold transition-colors text-gray-700"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
