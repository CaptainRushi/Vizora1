import { useState } from 'react';
import { X, Mail, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useProject } from '../../hooks/useProject';

interface InviteModalProps {
    onClose: () => void;
    onInviteSent: () => void;
}

export function InviteModal({ onClose, onInviteSent }: InviteModalProps) {
    const { projectId } = useProject();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('viewer');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleInvite = async () => {
        if (!email) return;
        setLoading(true);
        setError(null);

        try {
            await axios.post(`http://localhost:3001/projects/${projectId}/team/invite`, {
                email,
                role
            });
            setSuccess(true);
            setTimeout(() => {
                onInviteSent();
                onClose();
            }, 1000);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send invite');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-[480px] p-0 overflow-hidden transform transition-all scale-100">
                {/* Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Invite Team Member</h2>
                        <p className="text-xs text-slate-500 mt-1">Send an invitation to collaborate on this project.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Invitation sent successfully!
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="colleague@company.com"
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Role</label>
                        <div className="relative">
                            <Shield className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            >
                                <option value="viewer">Viewer (Read Only)</option>
                                <option value="editor">Editor (Can Edit Schema)</option>
                                <option value="admin">Admin (Full Access)</option>
                            </select>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 ml-1">
                            {role === 'viewer' && "Can view schema and documentation, but cannot make changes."}
                            {role === 'editor' && "Can modify schema, diagrams, and settings."}
                            {role === 'admin' && "Can manage team members and delete project."}
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleInvite}
                        disabled={loading || !email}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                    >
                        {loading ? 'Sending...' : 'Send Invite'}
                    </button>
                </div>
            </div>
        </div>
    );
}
