import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import {
    User,
    CreditCard,
    Users as UsersIcon,
    Activity,
    Shield,
    CheckCircle2,
    Clock,
    Database,
    FileText,
    Calendar,
    Plus,
    Trash2,
    Copy,
    Ban
} from 'lucide-react';
import { InviteModal } from '../components/dashboard/InviteModal';
import { DeleteAccountModal } from '../components/dashboard/DeleteAccountModal';

interface WorkspaceData {
    id: string;
    name: string;
    type: 'personal' | 'team';
    role: 'admin' | 'member';
    created_at: string;
}

interface UsageStats {
    totalProjects: number;
    totalVersions: number;
    totalTables: number;
    lastUpdate: string | null;
}

interface BillingInfo {
    plan: 'free' | 'pro' | 'team';
    cycle: 'monthly' | 'yearly' | null;
    price: number;
    renewalDate: string | null;
    status: 'active' | 'trial' | 'expired';
}

interface TeamMember {
    id: string; // membership id
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
    // user_metadata would be here in real app
    email?: string;
    name?: string;
}

interface Invite {
    id: string;
    token: string;
    role: 'admin' | 'member';
    expires_at: string;
    created_at: string;
    status: 'active' | 'expired' | 'revoked';
}

export function UserDashboard() {
    const { user } = useAuth();
    const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
    const [usage, setUsage] = useState<UsageStats>({ totalProjects: 0, totalVersions: 0, totalTables: 0, lastUpdate: null });
    const [billing, setBilling] = useState<BillingInfo>({ plan: 'free', cycle: null, price: 0, renewalDate: null, status: 'active' });
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // 1. Fetch Key Workspace Data
            // We use the new endpoints we created
            const { data: wsData } = await axios.get(`http://localhost:3001/workspaces/current?userId=${user.id}`);
            setWorkspace(wsData);

            if (wsData) {
                // Fetch Members
                const { data: memData } = await axios.get(`http://localhost:3001/workspaces/${wsData.id}/members`);
                setTeamMembers(memData.members);

                // Fetch Invites (if admin)
                if (wsData.role === 'admin') {
                    const { data: invData } = await axios.get(`http://localhost:3001/workspaces/${wsData.id}/invites`);
                    setInvites(invData);
                }
            }

            // 2. Fetch Usage (Standard Supabase calls for projects)
            const { data: projects } = await supabase
                .from('projects')
                .select('id, created_at')
                .eq('owner_id', user.id); // Note: Simple check, real app might need workspace scoping

            const { data: versions } = await supabase
                .from('schema_versions')
                .select('id, normalized_schema, created_at')
                .order('created_at', { ascending: false })
                .limit(1);

            let totalTables = 0;
            let lastUpdate = null;

            if (versions && versions.length > 0) {
                const schema = versions[0].normalized_schema as any;
                totalTables = Object.keys(schema?.tables || {}).length;
                lastUpdate = versions[0].created_at;
            }

            setUsage({
                totalProjects: projects?.length || 0,
                totalVersions: versions?.length || 0,
                totalTables,
                lastUpdate
            });

            // Mock Billing (could be fetched from Stripe/Subscription table)
            setBilling({
                plan: wsData?.type === 'team' ? 'team' : 'free', // rudimentary mapping
                cycle: 'monthly',
                price: wsData?.type === 'team' ? 49 : 0,
                renewalDate: new Date(Date.now() + 86400000 * 15).toISOString(),
                status: 'active'
            });

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const revokeInvite = async (inviteId: string) => {
        try {
            await axios.post(`http://localhost:3001/workspaces/invite/revoke`, { inviteId });
            // Refresh
            if (workspace) {
                const { data } = await axios.get(`http://localhost:3001/workspaces/${workspace.id}/invites`);
                setInvites(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const getInitials = () => {
        const name = user?.user_metadata?.full_name || user?.email || 'U';
        return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const handleUpgrade = async () => {
        if (!workspace || !user) return;

        const confirmed = window.confirm("Upgrade to Team Workspace? This will allow you to invite members.");
        if (!confirmed) return;

        try {
            await axios.post(`http://localhost:3001/workspaces/${workspace.id}/upgrade`, {
                userId: user.id
            });
            // Refresh data to show team view
            fetchDashboardData();
        } catch (err) {
            console.error("Upgrade failed:", err);
            alert("Failed to upgrade workspace. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* 1. USER IDENTITY */}
                <section className="bg-white rounded-2xl border border-gray-200 p-8">
                    <div className="flex items-start gap-6">
                        <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-700 border-2 border-indigo-200 shrink-0">
                            {getInitials()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
                                {user?.user_metadata?.full_name || 'User'}
                            </h1>
                            <p className="text-gray-500 font-medium mb-3 lowercase">
                                {user?.email}
                            </p>
                            <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg ${workspace?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    <User className="w-3.5 h-3.5" />
                                    {workspace?.role === 'admin' ? 'Workspace Admin' : 'Member'}
                                </span>
                                <span className="text-xs text-gray-400 font-medium">
                                    Workspace: {workspace?.name}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. TEAM SECTION (Only for Team Workspaces or Admin Upgrades) */}
                <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="p-8 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <UsersIcon className="w-5 h-5 text-gray-400" />
                                <h2 className="text-lg font-bold text-gray-900">Team & Workspace Access</h2>
                            </div>
                            {workspace?.type === 'team' && workspace.role === 'admin' && (
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    Invite Team Member
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 pl-8">Manage who can access this workspace</p>
                    </div>

                    {workspace?.type !== 'team' ? (
                        /* SOLO VIEW -> UPGRADE CTA */
                        <div className="p-8 text-center bg-gray-50/50">
                            <div className="max-w-md mx-auto">
                                <Shield className="w-12 h-12 text-indigo-200 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Upgrade to Team Workspace</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Collaborate with your team, share schemas, and manage permissions.
                                </p>
                                <button
                                    onClick={handleUpgrade}
                                    className="px-6 py-2.5 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-black transition-colors"
                                >
                                    Upgrade to Team
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* TEAM VIEW */
                        <div className="divide-y divide-gray-100">
                            {/* A. SUMMARY STATS */}
                            <div className="p-6 bg-gray-50 grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Seats</p>
                                    <p className="text-xl font-black text-gray-900">5</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active</p>
                                    <p className="text-xl font-black text-gray-900">{teamMembers.length}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Available</p>
                                    <p className="text-xl font-black text-green-600">{5 - teamMembers.length}</p>
                                </div>
                            </div>

                            {/* C. MEMBERS LIST */}
                            <div className="p-6">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Active Members</h3>
                                <div className="space-y-3">
                                    {teamMembers.map(member => (
                                        <div key={member.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                                                    {/* In real app, name comes from join */}
                                                    {member.user_id.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {member.user_id === user?.id ? 'You' : `User (${member.user_id.slice(0, 4)}...)`}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        Joined {new Date(member.joined_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`text-xs font-bold px-2 py-1 rounded ${member.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {member.role.toUpperCase()}
                                                </span>
                                                {workspace.role === 'admin' && member.user_id !== user?.id && (
                                                    <button className="text-gray-400 hover:text-red-600 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* D. PENDING INVITES (Admin Only) */}
                            {workspace.role === 'admin' && invites.length > 0 && (
                                <div className="p-6 bg-yellow-50/30">
                                    <h3 className="text-xs font-bold text-yellow-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        Pending Invites
                                    </h3>
                                    <div className="space-y-3">
                                        {invites.map(invite => (
                                            <div key={invite.id} className="flex items-center justify-between p-3 bg-white border border-yellow-100 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                                                        <LinkIcon className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-900">
                                                            {invite.role === 'admin' ? 'Admin Invite' : 'Member Invite'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 font-mono">
                                                            Expires {new Date(invite.expires_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join?token=${invite.token}`)}
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-md transition-colors"
                                                        title="Copy Link"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => revokeInvite(invite.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="Revoke"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* 3. USAGE OVERVIEW */}
                <section className="bg-white rounded-2xl border border-gray-200 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <Activity className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-bold text-gray-900">Usage Overview</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <Database className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                            <p className="text-2xl font-black text-gray-900 mb-1">{usage.totalProjects}</p>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Projects</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <Clock className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                            <p className="text-2xl font-black text-gray-900 mb-1">{usage.totalVersions}</p>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Versions</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <FileText className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                            <p className="text-2xl font-black text-gray-900 mb-1">{usage.totalTables}</p>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tables</p>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-xl">
                            <Calendar className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                            <p className="text-xs font-black text-gray-900 mb-1">
                                {usage.lastUpdate ? new Date(usage.lastUpdate).toLocaleDateString() : 'Never'}
                            </p>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Last Update</p>
                        </div>
                    </div>
                </section>

                {/* 4. BILLING & PLAN */}
                <section className="bg-white rounded-2xl border border-gray-200 p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-bold text-gray-900">Billing & Plan</h2>
                    </div>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Current Plan</p>
                                <p className="text-2xl font-black text-gray-900 capitalize">{billing.plan}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status</p>
                                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {billing.status.charAt(0).toUpperCase() + billing.status.slice(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. DANGER ZONE */}
                <section className="border border-red-200 rounded-2xl overflow-hidden">
                    <div className="bg-red-50 p-8">
                        <h2 className="text-lg font-bold text-red-900 mb-2">Danger Zone</h2>
                        <p className="text-sm text-red-700">
                            Irreversible actions for your account and workspace.
                        </p>
                    </div>
                    <div className="p-8 bg-white flex items-center justify-between">
                        <div>
                            <p className="font-bold text-gray-900 mb-1">Delete Account</p>
                            <p className="text-sm text-gray-500">
                                Permanently delete your account and all workspace data.
                            </p>
                        </div>
                        {workspace?.type === 'team' && workspace.role !== 'admin' ? (
                            <p className="text-sm text-gray-500 italic bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                Contact a workspace admin to delete this account
                            </p>
                        ) : (
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="px-5 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-colors shadow-sm"
                            >
                                Delete account permanently
                            </button>
                        )}
                    </div>
                </section>

            </div>

            {/* Invite Modal */}
            {showInviteModal && workspace && (
                <InviteModal
                    workspaceId={workspace.id}
                    onClose={() => setShowInviteModal(false)}
                    onInviteGenerated={() => {
                        // Refresh invites list
                        if (workspace.id) {
                            axios.get(`http://localhost:3001/workspaces/${workspace.id}/invites`)
                                .then(({ data }) => setInvites(data))
                                .catch(console.error);
                        }
                    }}
                />
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && workspace && (
                <DeleteAccountModal
                    workspaceId={workspace.id}
                    onClose={() => setShowDeleteModal(false)}
                />
            )}
        </div>
    );
}

function LinkIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    )
}
