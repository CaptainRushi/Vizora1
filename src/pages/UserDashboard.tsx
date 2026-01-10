import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
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
    Ban,
    Beaker
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
    const [betaUsage, setBetaUsage] = useState<any>(null);
    const [betaConfig, setBetaConfig] = useState<any>(null);

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // 1. Fetch Key Workspace Data
            // Owners first
            let { data: wsData } = await supabase
                .from('workspaces')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();

            let role: 'admin' | 'member' = 'admin';

            // If not owner, check membership
            if (!wsData) {
                const { data: membership } = await supabase
                    .from('workspace_members')
                    .select('workspace_id, role')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (membership) {
                    const { data: w } = await supabase.from('workspaces').select('*').eq('id', membership.workspace_id).single();
                    if (w) {
                        wsData = w;
                        role = membership.role as 'admin' | 'member';
                    }
                }
            }

            // Create default if still none
            if (!wsData) {
                const { data: newWs, error: cErr } = await supabase
                    .from('workspaces')
                    .insert({
                        name: "Personal Workspace",
                        type: "personal",
                        owner_id: user.id
                    })
                    .select()
                    .single();

                if (cErr) throw cErr;
                wsData = newWs;
                role = 'admin';
            }

            if (wsData) {
                setWorkspace({ ...wsData, role });

                // Parallelize all secondary dashboard lookups
                const [
                    membersResult,
                    invitesResult,
                    billingResult,
                    projectsResult
                ] = await Promise.all([
                    // A. Fetch Members
                    supabase.from('workspace_members')
                        .select('user_id, role, joined_at, id')
                        .eq('workspace_id', wsData.id),
                    // B. Fetch Invites (Conditional if admin)
                    role === 'admin'
                        ? supabase.from('workspace_invites')
                            .select('*')
                            .eq('workspace_id', wsData.id)
                            .eq('revoked', false)
                            .gt('expires_at', new Date().toISOString())
                        : Promise.resolve({ data: [] }),
                    // C. Fetch Billing Info
                    supabase.from('workspace_billing')
                        .select('plan_id, status, expires_at')
                        .eq('workspace_id', wsData.id)
                        .maybeSingle(),
                    // D. Fetch Usage (Workspace scoped projects)
                    supabase.from('projects')
                        .select('id, created_at')
                        .eq('workspace_id', wsData.id)
                ]);

                // Handle Members
                setTeamMembers(membersResult.data || []);

                // Handle Invites
                setInvites(invitesResult.data || []);

                // Handle Billing
                const billingData = billingResult.data;
                setBilling({
                    plan: (billingData?.plan_id as any) || 'free',
                    cycle: 'monthly',
                    price: billingData?.plan_id === 'teams' ? 4999 : billingData?.plan_id === 'pro' ? 1499 : 0,
                    renewalDate: billingData?.expires_at || null,
                    status: (billingData?.status as any) || 'active'
                });

                // Handle Usage Statistics
                const projects = projectsResult.data;
                const projectIds = projects?.map(p => p.id) || [];

                let totalVersions = 0;
                let totalTables = 0;
                let lastUpdate = null;

                if (projectIds.length > 0) {
                    // This is the last sequential step as it depends on projectIds
                    const { data: versions } = await supabase
                        .from('schema_versions')
                        .select('id, normalized_schema, created_at')
                        .in('project_id', projectIds)
                        .order('created_at', { ascending: false });

                    totalVersions = versions?.length || 0;
                    if (versions && versions.length > 0) {
                        const schema = versions[0].normalized_schema as any;
                        totalTables = Object.keys(schema?.tables || {}).length;
                        lastUpdate = versions[0].created_at;
                    }
                }

                setUsage({
                    totalProjects: projects?.length || 0,
                    totalVersions,
                    totalTables,
                    lastUpdate
                });
            }

            // 3. Fetch Beta Stats (Direct from Supabase)
            // We hardcode the config since it's just a few constants
            const bConfig = {
                beta_mode: true,
                beta_project_limit: 2,
                beta_version_limit: 5,
                beta_label: "Private Beta"
            };
            setBetaConfig(bConfig);

            const { data: bUsage } = await supabase
                .from('beta_usage')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            setBetaUsage(bUsage);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const revokeInvite = async (inviteId: string) => {
        try {
            const { error } = await supabase
                .from('workspace_invites')
                .update({ revoked: true })
                .eq('id', inviteId);

            if (error) throw error;
            await fetchDashboardData();
        } catch (err: any) {
            alert('Failed to revoke: ' + err.message);
        }
    };

    const getInitials = () => {
        const name = user?.user_metadata?.full_name || user?.email || 'U';
        return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
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

                {/* 2. TEAM SECTION (Only for Team Workspaces or Admin Unlocks) */}
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
                        /* SOLO VIEW -> UNLOCK CTA */
                        <div className="p-8 text-center bg-gray-50/50">
                            <div className="max-w-md mx-auto">
                                <Shield className="w-12 h-12 text-indigo-200 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Unlock Team Workspace</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Collaborate with your team, share schemas, and manage permissions.
                                </p>
                                <button
                                    disabled={true}
                                    className="px-6 py-2.5 bg-gray-100 text-gray-400 font-bold text-[10px] uppercase tracking-widest rounded-xl cursor-not-allowed border border-gray-200"
                                >
                                    Team Access: Coming Soon
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

                {/* 3.5 PRIVATE BETA STATUS */}
                {betaConfig?.beta_mode && (
                    <section className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Beaker className="w-32 h-32 rotate-12" />
                        </div>

                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black tracking-tight">Private Beta Status</h2>
                                    <p className="text-indigo-300 text-sm font-medium">Your activity during the early access period</p>
                                </div>
                                <span className="px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-black uppercase tracking-widest">
                                    {betaConfig.label}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-indigo-200">
                                        <span>Projects Created</span>
                                        <span className="text-white">{betaUsage?.projects_created || 0} / {betaConfig.project_limit}</span>
                                    </div>
                                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${Math.min(((betaUsage?.projects_created || 0) / betaConfig.project_limit) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-indigo-200">
                                        <span>Schema Versions</span>
                                        <span className="text-white">{betaUsage?.versions_created || 0} / (5 per project)</span>
                                    </div>
                                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-white rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${Math.min(((betaUsage?.versions_created || 0) / (betaConfig.project_limit * 5)) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 flex flex-wrap gap-6">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    <span className="text-xs font-bold text-indigo-100">{betaUsage?.diagrams_viewed || 0} Diagrams Viewed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                    <span className="text-xs font-bold text-indigo-100">{betaUsage?.docs_generated || 0} Docs Generated</span>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

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
                            const fetchInvites = async () => {
                                try {
                                    const { data } = await supabase
                                        .from('workspace_invites')
                                        .select('*')
                                        .eq('workspace_id', workspace.id)
                                        .eq('revoked', false)
                                        .gt('expires_at', new Date().toISOString());
                                    setInvites(data || []);
                                } catch (err) {
                                    console.error(err);
                                }
                            };
                            fetchInvites();
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
