import { useState } from 'react';
import { X, Shield, Link as LinkIcon, Copy, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface InviteModalProps {
    workspaceId: string;
    onClose: () => void;
    onInviteGenerated: () => void;
}

export function InviteModal({ workspaceId, onClose, onInviteGenerated }: InviteModalProps) {
    const { user } = useAuth();
    const [role, setRole] = useState<'member' | 'admin'>('member');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteUrl, setInviteUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const generateLink = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = crypto.randomUUID();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            const { error: iErr } = await supabase
                .from('workspace_invites')
                .insert({
                    workspace_id: workspaceId,
                    token: token,
                    role: role,
                    expires_at: expiresAt.toISOString(),
                    max_uses: 1
                });

            if (iErr) throw iErr;

            const baseUrl = window.location.origin;
            setInviteUrl(`${baseUrl}/join?token=${token}`);
            onInviteGenerated();
        } catch (err: any) {
            setError(err.message || 'Failed to generate invite link');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (inviteUrl) {
            navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-[500px] overflow-hidden transform transition-all scale-100">

                {/* Header */}
                <div className="bg-white border-b border-gray-100 p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Invite Team Member</h2>
                        <p className="text-sm text-gray-500 mt-1">Generate a secure link to share with your team.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
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
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Select Role</label>
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
                                        <p className="text-xs text-gray-500">Can view and edit projects.</p>
                                        {role === 'member' && (
                                            <div className="absolute top-4 right-4 text-indigo-600">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setRole('admin')}
                                        className={`relative p-4 rounded-xl border-2 text-left transition-all ${role === 'admin'
                                            ? 'border-indigo-600 bg-indigo-50/50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 font-bold text-gray-900 mb-1">
                                            <Shield className="w-4 h-4 text-purple-600 block fill-current" />
                                            Admin
                                        </div>
                                        <p className="text-xs text-gray-500">Full workspace access.</p>
                                        {role === 'admin' && (
                                            <div className="absolute top-4 right-4 text-indigo-600">
                                                <CheckCircle2 className="w-5 h-5" />
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={generateLink}
                                disabled={loading}
                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>Generating...</>
                                ) : (
                                    <>
                                        <LinkIcon className="w-4 h-4" />
                                        Generate Invite Link
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        /* STATE 2: LINK GENERATED */
                        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Share this link</label>
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

                            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex gap-3">
                                <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
                                <div className="text-xs text-yellow-800">
                                    <p className="font-bold mb-1">Security Notice</p>
                                    <ul className="list-disc pl-4 space-y-1">
                                        <li>Link expires in 7 days</li>
                                        <li>Valid for one-time use only</li>
                                        <li>You can revoke this link anytime</li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl text-sm font-bold transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
