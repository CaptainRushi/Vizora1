import { useState, useEffect } from 'react';
import axios from 'axios';
import { useProject } from '../../hooks/useProject';
import { InviteModal } from './InviteModal';
import { Plus, Mail, CheckCircle, Clock, Trash2, X, Shield } from 'lucide-react';

interface TeamMember {
    id: string;
    email: string;
    role: string;
    joined_at: string;
}

interface TeamInvite {
    id: string;
    email: string;
    role: string;
    status: 'pending' | 'accepted' | 'expired';
    created_at: string;
    expires_at: string;
}

export function TeamManager({ projectId: propProjectId }: { projectId?: string | null }) {
    const { projectId: hookProjectId } = useProject();
    const projectId = propProjectId || hookProjectId;
    const [role] = useState('admin'); // Mock current user role for now
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<TeamInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);

    const fetchTeam = async () => {
        try {
            const { data } = await axios.get(`http://localhost:3001/projects/${projectId}/team`);
            setMembers(data.members);
            setInvites(data.invites);
        } catch (err) {
            console.error("Failed to fetch team:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (projectId) fetchTeam();
    }, [projectId]);

    const handleRevoke = async (type: 'invite' | 'member', id: string) => {
        if (!confirm('Are you sure you want to remove this user?')) return;
        try {
            await axios.delete(`http://localhost:3001/projects/${projectId}/team/${type}/${id}`);
            fetchTeam();
        } catch (err) {
            console.error(err);
        }
    };

    if (!projectId) return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
            <p className="text-sm font-medium">Please select a project to manage team members.</p>
        </div>
    );

    if (loading) return <div className="p-8">Loading team...</div>;

    return (
        <div className="flex flex-col h-full bg-slate-50/30">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 bg-white px-8 flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Team Members</h1>
                    <p className="text-xs text-slate-500">Manage access and collaboration for this project</p>
                </div>
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Invite Member
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="max-w-5xl mx-auto space-y-8">

                    {/* Active Members */}
                    <section>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Active Members ({members.length})</h3>
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                            {members.map((member) => (
                                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                                            {member.email[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                {member.email}
                                                {/* You is a placeholder logic */}
                                            </div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <CheckCircle className="w-3 h-3 text-green-500" />
                                                Joined {new Date(member.joined_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
                                            <Shield className="w-3 h-3 text-slate-500" />
                                            <span className="text-xs font-bold text-slate-600 capitalize">{member.role}</span>
                                        </div>
                                        {role === 'admin' && (
                                            <button
                                                onClick={() => handleRevoke('member', member.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {members.length === 0 && (
                                <div className="p-8 text-center text-slate-400 text-sm">No active members found.</div>
                            )}
                        </div>
                    </section>

                    {/* Pending Invites */}
                    {invites.length > 0 && (
                        <section>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Pending Invitations ({invites.length})</h3>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
                                {invites.map((invite) => (
                                    <div key={invite.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center">
                                                <Mail className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{invite.email}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    {invite.status === 'expired' ? 'Expired' : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
                                                    <span className={`px-1.5 py-0.5 rounded ml-2 text-[10px] font-bold uppercase ${invite.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                                        invite.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {invite.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xs font-bold text-slate-500 capitalize">{invite.role}</span>
                                            {role === 'admin' && (
                                                <div className="flex gap-1">
                                                    {/* Resend Logic could go here */}
                                                    <button
                                                        onClick={() => handleRevoke('invite', invite.id)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Revoke Invite"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {showInviteModal && (
                <InviteModal
                    onClose={() => setShowInviteModal(false)}
                    onInviteSent={fetchTeam}
                />
            )}
        </div>
    );
}
