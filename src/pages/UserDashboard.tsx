import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import {
    User,
    Users as UsersIcon,
    Activity,
    Shield,
    Clock,
    Database,
    FileText,
    Calendar,
    Plus,
    UserPlus,
    Trash2,
    Copy,
    Ban,
    ExternalLink,
    MessageSquare,
    GitBranch,
    Sparkles,
    Building2,
    HelpCircle,
    Bug,
    Lightbulb,
    Headphones,
    Pencil,
    ChevronDown,
    Search
} from 'lucide-react';
import { InviteModal } from '../components/dashboard/InviteModal';
import { DeleteAccountModal } from '../components/dashboard/DeleteAccountModal';
import { EditProfileModal } from '../components/dashboard/EditProfileModal';
import { LoadingSection } from '../components/LoadingSection';
import { toast } from 'react-hot-toast';

// ============================
// TYPES
// ============================
interface IdentityData {
    user: {
        id: string;
        username: string | null;
        display_name: string | null;
        created_at: string;
    };
    workspace: {
        id: string;
        name: string;
        type: 'personal' | 'team';
        created_at: string;
        member_count: number;
    } | null;
    role: 'admin' | 'member';
}

interface UsageData {
    projects: number;
    schema_versions: number;
    diagrams_generated: number;
    docs_generated: number;
    ai_questions: number;
    last_activity: string | null;
}

interface TeamMember {
    id: string;
    user_id: string;
    username: string | null;
    display_name: string | null;
    email?: string | null;
    role: 'admin' | 'member';
    joined_at: string | null;
    is_owner: boolean;
}

interface TeamData {
    workspace_type: 'personal' | 'team';
    members: TeamMember[];
}



interface Invite {
    id: string;
    token: string;
    role: 'admin' | 'member';
    expires_at: string;
    created_at: string;
}

// ============================
// HELPER COMPONENTS
// ============================
function StatCard({ icon: Icon, label, value, subtext }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtext?: string;
}) {
    return (
        <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <p className="text-2xl font-black text-gray-900 mb-1">{value}</p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
            {subtext && <p className="text-[10px] text-gray-400 mt-1">{subtext}</p>}
        </div>
    );
}

// ============================
// MAIN COMPONENT
// ============================
export function UserDashboard() {
    const { user, refreshIdentity } = useAuth();

    // State
    const [identity, setIdentity] = useState<IdentityData | null>(null);
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [team, setTeam] = useState<TeamData | null>(null);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [showSetupModal, setShowSetupModal] = useState(false);
    const [setupUsername, setSetupUsername] = useState('');
    const [setupError, setSetupError] = useState<string | null>(null);
    const [isSettingUp, setIsSettingUp] = useState(false);

    // ============================
    // DATA FETCHING
    // ============================
    // ============================
    // DATA FETCHING
    // ============================
    const fetchDashboardData = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            // 1. Fetch Authoritative Identity (Universal ID)
            const identityData = await api.user.getMe(user.id);

            // New: Identity Data now contains everything we need
            // including universal_id (which acts as workspace_id for personal/personal-like workspaces)
            // and workspace_name.

            const universalId = identityData.universal_id;

            // 2. Set Identity State (Minimal, derived from API)
            setIdentity({
                user: {
                    id: user.id, // Auth ID
                    username: identityData.username,
                    display_name: identityData.display_name,
                    created_at: new Date().toISOString() // Not returned by API me, usage irrelevant for display mostly
                },
                workspace: {
                    id: universalId,
                    name: identityData.workspace_name || "Personal Workspace",
                    type: 'team', // We can default to team or 'personal' based on logic, but everything is a universal workspace now
                    created_at: new Date().toISOString(),
                    member_count: 1 // Will be updated by fetchTeamData if we fetch it
                },
                role: (identityData.role as 'admin' | 'member') || 'member'
            });

            // 3. Fetch specific dashboard data using Universal ID
            if (universalId) {
                const [usageResult, teamResult, invitesResult] = await Promise.all([
                    fetchUsageStats(universalId),
                    fetchTeamData(universalId),
                    (identityData.role === 'admin' || !identityData.role) ? fetchInvites(universalId) : Promise.resolve([])
                ]);

                setUsage(usageResult);

                // Update workspace member count from real data if available
                if (teamResult) {
                    setTeam(teamResult);
                    setIdentity(prev => prev ? {
                        ...prev,
                        workspace: prev.workspace ? {
                            ...prev.workspace,
                            member_count: teamResult.members.length,
                            type: teamResult.workspace_type
                        } : null
                    } : null);
                }

                setInvites(invitesResult);
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, [user]);

    const fetchUsageStats = async (workspaceId: string): Promise<UsageData> => {
        // Get projects
        const { data: projects } = await supabase
            .from('projects')
            .select('id, created_at')
            .eq('workspace_id', workspaceId);

        const projectIds = projects?.map(p => p.id) || [];

        let totalVersions = 0;
        let totalDocs = 0;
        let totalAiQuestions = 0;
        let lastActivity: string | null = null;

        if (projectIds.length > 0) {
            // Parallel queries
            const [versionsResult, docsResult, aiResult] = await Promise.all([
                supabase
                    .from('schema_versions')
                    .select('created_at', { count: 'exact' })
                    .in('project_id', projectIds)
                    .order('created_at', { ascending: false })
                    .limit(1),
                supabase
                    .from('documentation_outputs')
                    .select('*', { count: 'exact', head: true })
                    .in('project_id', projectIds),
                supabase
                    .from('ask_schema_logs')
                    .select('*', { count: 'exact', head: true })
                    .in('project_id', projectIds)
            ]);

            totalVersions = versionsResult.count || 0;
            totalDocs = docsResult.count || 0;
            totalAiQuestions = aiResult.count || 0;
            lastActivity = versionsResult.data?.[0]?.created_at || null;
        }

        return {
            projects: projects?.length || 0,
            schema_versions: totalVersions,
            diagrams_generated: totalVersions, // Each version = 1 diagram
            docs_generated: totalDocs,
            ai_questions: totalAiQuestions,
            last_activity: lastActivity
        };
    };

    const fetchTeamData = async (workspaceId: string): Promise<TeamData> => {
        // 1. Fetch Owner from Universal Users
        const { data: uUser } = await supabase
            .from('universal_users')
            .select('universal_id, username, display_name, auth_user_id')
            .eq('universal_id', workspaceId)
            .maybeSingle();

        // 2. Fetch Members (Legacy / Shared Access)
        const { data: members } = await supabase
            .from('workspace_members')
            .select('id, user_id, role, created_at')
            .eq('workspace_id', workspaceId);

        // 3. Resolve Profiles
        const memberIds = members?.map(m => m.user_id) || [];
        // Note: uUser.auth_user_id is the owner's Auth ID.
        const allAuthIds = [...memberIds];
        if (uUser?.auth_user_id) allAuthIds.push(uUser.auth_user_id);

        let profiles: any[] = [];
        if (allAuthIds.length > 0) {
            const { data: p } = await supabase
                .from('universal_users')
                .select('auth_user_id, username, display_name')
                .in('auth_user_id', allAuthIds);
            profiles = p || [];
        }

        // 4. Build List
        const memberList: TeamMember[] = (members || []).map(m => {
            const profile = profiles.find(p => p.auth_user_id === m.user_id);
            return {
                id: m.id,
                user_id: m.user_id,
                username: profile?.username || null,
                display_name: profile?.display_name || null,
                role: m.role as TeamMember['role'],
                joined_at: m.created_at,
                is_owner: m.user_id === uUser?.auth_user_id
            };
        });

        // Add owner if not in members
        if (uUser) {
            const ownerInList = memberList.find(m => m.user_id === uUser.auth_user_id);
            if (!ownerInList) {
                memberList.unshift({
                    id: 'owner',
                    user_id: uUser.auth_user_id,
                    username: uUser.username,
                    display_name: uUser.display_name,
                    role: 'admin',
                    joined_at: null,
                    is_owner: true
                });
            }
        }

        return {
            workspace_type: 'personal', // Universal workspaces are unified now, can treat as "personal" or "team" based on member count
            members: memberList
        };
    };

    const fetchInvites = async (workspaceId: string): Promise<Invite[]> => {
        const { data } = await supabase
            .from('workspace_invites')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('revoked', false)
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString());

        return data || [];
    };



    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Migration helper: Detect missing username
    useEffect(() => {
        if (identity && !identity.user.username && !loading) {
            setShowSetupModal(true);
        } else {
            setShowSetupModal(false);
        }
    }, [identity, loading]);

    const handleSetupUsername = async () => {
        if (!setupUsername || setupUsername.length < 3) {
            setSetupError('Username must be at least 3 characters');
            return;
        }

        try {
            setIsSettingUp(true);
            setSetupError(null);
            await api.user.updateUsername(user!.id, setupUsername.toLowerCase());
            await refreshIdentity(user!.id);
            await fetchDashboardData();
            setShowSetupModal(false);
            toast.success('Username set successfully!');
        } catch (err: any) {
            setSetupError(err.response?.data?.error || 'Failed to update username');
        } finally {
            setIsSettingUp(false);
        }
    };

    // ============================
    // ACTIONS
    // ============================

    const revokeInvite = async (inviteId: string) => {
        try {
            const { error } = await supabase
                .from('workspace_invites')
                .update({ revoked: true, is_active: false })
                .eq('id', inviteId);

            if (error) throw error;
            setInvites(prev => prev.filter(i => i.id !== inviteId));
        } catch (err: any) {
            alert('Failed to revoke: ' + err.message);
        }
    };

    // ============================
    // ROLE MANAGEMENT ACTIONS (ADMIN ONLY)
    // ============================

    /**
     * Change a member's role (admin only)
     * Rules:
     * - Cannot change own role
     * - Workspace must always have at least one admin
     */
    const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member') => {
        if (!user || !identity?.workspace?.id) return;

        try {
            const response = await api.dashboard.changeRole(
                memberId,
                newRole,
                identity.workspace.id,
                user.id
            );

            if (response.success) {
                // Refresh team data
                fetchDashboardData();
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message;
            alert(errorMessage);
        }
    };

    /**
     * Remove a member from workspace (admin only)
     * Cannot remove workspace owner
     */
    const handleRemoveMember = async (memberId: string, memberName: string | null) => {
        if (!user || !identity?.workspace?.id) return;

        const confirmMessage = `Are you sure you want to remove ${memberName || 'this member'} from the workspace?`;
        if (!confirm(confirmMessage)) return;

        try {
            const response = await api.dashboard.removeMember(
                memberId,
                identity.workspace.id,
                user.id
            );

            if (response.success) {
                // Refresh team data
                fetchDashboardData();
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message;
            alert(errorMessage);
        }
    };



    const getInitials = () => {
        const name = identity?.user.username || identity?.user.display_name || user?.user_metadata?.full_name || user?.email || 'U';
        return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // ============================
    // LOADING STATE
    // ============================
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoadingSection title="Syncing Dashboard..." subtitle="Aggregating your workspace usage and team activity." />
            </div>
        );
    }

    // ============================
    // RENDER
    // ============================
    return (
        <div className="app-container py-12">
            <div className="space-y-8">

                {/* ============================
                    SECTION 1: IDENTITY & WORKSPACE CARD
                ============================ */}
                <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-6">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-lg">
                            {getInitials()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            {/* Top Row: Username and Edit Button */}
                            <div className="flex items-start justify-between mb-1">
                                <div className="flex-1">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                                        {identity?.user.username ? `@${identity.user.username}` : 'Identity Not Set'}
                                    </h2>
                                </div>
                                {/* Edit Profile Button */}
                                <button
                                    onClick={() => setShowEditProfile(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all active:scale-95"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Edit profile
                                </button>
                            </div>

                            {/* Display Name */}
                            {identity?.user.display_name && (
                                <p className="text-lg font-bold text-slate-500 mb-1">
                                    {identity.user.display_name}
                                </p>
                            )}

                            {/* Email */}
                            <p className="text-slate-400 font-medium mb-4 lowercase">
                                {user?.email}
                            </p>

                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Role Badge */}
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shadow-sm transition-all ${identity?.role === 'admin'
                                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white border-indigo-400 font-black'
                                    : 'bg-white text-slate-700 border-slate-200 font-bold'
                                    }`}>
                                    {identity?.role === 'admin' ? (
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-indigo-200" />
                                            <span className="tracking-tight uppercase">Workspace Admin</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-slate-400" />
                                            <span className="tracking-tight uppercase">Team Member</span>
                                        </div>
                                    )}
                                </div>

                                {/* Workspace Type Badge */}
                                <span className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-2xl ${identity?.workspace?.type === 'team'
                                    ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-100'
                                    : 'bg-sky-50 text-sky-700 border-2 border-sky-100'
                                    }`}>
                                    {identity?.workspace?.type === 'team' ? (
                                        <>
                                            <UsersIcon className="w-3.5 h-3.5" />
                                            Team
                                        </>
                                    ) : (
                                        <>
                                            <Building2 className="w-3.5 h-3.5" />
                                            Solo
                                        </>
                                    )}
                                </span>

                                {/* Workspace Name */}
                                {identity?.workspace && (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Workspace</span>
                                        <span className="text-sm font-black text-slate-700">{identity.workspace.name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Workspace Created Date */}
                            {identity?.workspace?.created_at && (
                                <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Created {new Date(identity.workspace.created_at).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* ============================
                    SECTION 2: USAGE & VALUE OVERVIEW
                ============================ */}
                <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-indigo-50 rounded-xl">
                            <Activity className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Usage Overview</h2>
                            {identity?.workspace?.type === 'team' && (
                                <p className="text-xs text-gray-500">Aggregated across {identity.workspace.member_count} members</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                        <StatCard
                            icon={Database}
                            label="Projects"
                            value={usage?.projects || 0}
                        />
                        <StatCard
                            icon={GitBranch}
                            label="Schema Versions"
                            value={usage?.schema_versions || 0}
                        />
                        <StatCard
                            icon={Sparkles}
                            label="Diagrams"
                            value={usage?.diagrams_generated || 0}
                        />
                        <StatCard
                            icon={FileText}
                            label="Docs Generated"
                            value={usage?.docs_generated || 0}
                        />
                        <StatCard
                            icon={MessageSquare}
                            label="AI Questions"
                            value={usage?.ai_questions || 0}
                        />
                        <StatCard
                            icon={Clock}
                            label="Last Activity"
                            value={usage?.last_activity
                                ? new Date(usage.last_activity).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : 'Never'
                            }
                        />
                    </div>
                </section>

                {/* ============================
                    SECTION 3: PRIVATE BETA STATUS
                ============================ */}
                <section className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Sparkles className="w-32 h-32 rotate-12" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight">Private Beta Access</h2>
                                <p className="text-indigo-100 font-medium mt-1">Vizora is currently in early access. Enjoy full capability while we refine the platform.</p>
                            </div>
                            <span className="px-5 py-2 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-[10px] font-black uppercase tracking-[0.2em]">
                                Beta Tier Active
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Status</span>
                                <span className="text-lg font-black italic">"Fully usable, exploratory, and welcoming"</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Pricing</span>
                                <span className="text-lg font-black">Announcing soon</span>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Feedback</span>
                                <span className="text-sm font-bold text-indigo-50 hover:text-white transition-colors cursor-pointer">Shape our future →</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ============================
                    SECTION 4: TEAM OVERVIEW (CONDITIONAL)
                ============================ */}
                <section className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 rounded-xl">
                                    <UsersIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Team & Workspace Access</h2>
                            </div>
                            {identity?.role === 'admin' && (
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    Invite Member
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 pl-12">Manage and view workspace permissions</p>
                    </div>

                    {(team?.members && team.members.length > 0) ? (
                        /* TEAM VIEW */
                        <div className="divide-y divide-gray-100">
                            {/* Team Stats & Search */}
                            <div className="p-6 bg-gray-50/50 border-b border-gray-100">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Seats</p>
                                            <p className="text-2xl font-black text-gray-900">5</p>
                                        </div>
                                        <div className="p-2 bg-gray-50 rounded-lg">
                                            <UsersIcon className="w-5 h-5 text-gray-400" />
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active</p>
                                            <p className="text-2xl font-black text-indigo-600">{team?.members.length || 0}</p>
                                        </div>
                                        <div className="p-2 bg-indigo-50 rounded-lg">
                                            <Activity className="w-5 h-5 text-indigo-600" />
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Available</p>
                                            <p className="text-2xl font-black text-emerald-600">{5 - (team?.members.length || 0)}</p>
                                        </div>
                                        <div className="p-2 bg-emerald-50 rounded-lg">
                                            <UserPlus className="w-5 h-5 text-emerald-600" />
                                        </div>
                                    </div>
                                </div>

                                {/* Search Bar */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search members by name or email..."
                                        value={memberSearchTerm}
                                        onChange={(e) => setMemberSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                                    />
                                </div>
                            </div>

                            {/* Members List */}
                            <div className="p-6">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                                    <span>Active Members</span>
                                    {memberSearchTerm && (
                                        <span className="text-indigo-600">
                                            Found {team?.members.filter(m =>
                                            (m.username?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                                                m.display_name?.toLowerCase().includes(memberSearchTerm.toLowerCase()))
                                            ).length} matches
                                        </span>
                                    )}
                                </h3>
                                <div className="space-y-3">
                                    {team?.members
                                        .filter(m =>
                                            !memberSearchTerm ||
                                            (m.username?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                                                m.display_name?.toLowerCase().includes(memberSearchTerm.toLowerCase()))
                                        )
                                        .map(member => {
                                            const isCurrentUser = member.user_id === user?.id;

                                            // Better identity resolution
                                            const getDisplayName = () => {
                                                if (isCurrentUser) return identity?.user.username ? `@${identity.user.username}` : 'You';
                                                if (member.username) return `@${member.username}`;
                                                if (member.display_name) return member.display_name;
                                                if (member.email) return member.email.split('@')[0];
                                                return `Member-${member.user_id.slice(0, 6)}`;
                                            };

                                            const memberUsername = getDisplayName();
                                            const memberDisplayName = isCurrentUser
                                                ? (identity?.user.display_name || 'Workspace Owner')
                                                : member.display_name;

                                            const initials = (memberUsername.startsWith('@') ? memberUsername.slice(1) : memberUsername)[0]?.toUpperCase() || 'U';

                                            // Distinct styling based on role
                                            const isOwner = member.is_owner;
                                            const isAdmin = member.role === 'admin';

                                            let avatarGradient = 'from-gray-400 to-gray-500';
                                            if (isOwner) avatarGradient = 'from-amber-400 to-orange-500';
                                            else if (isAdmin) avatarGradient = 'from-violet-500 to-purple-600';
                                            else avatarGradient = 'from-blue-400 to-indigo-500';

                                            return (
                                                <div
                                                    key={member.id}
                                                    className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-indigo-100 hover:shadow-sm transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        {/* Avatar */}
                                                        <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-sm font-bold text-white shadow-sm ring-2 ring-white`}>
                                                            {initials}
                                                        </div>

                                                        {/* User Info */}
                                                        <div className="min-w-0">
                                                            {/* Username + Role Badge Row */}
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="text-sm font-bold text-gray-900">
                                                                    {memberUsername}
                                                                    {isCurrentUser && <span className="text-gray-400 font-normal ml-1">(You)</span>}
                                                                </span>

                                                                {/* Role Badges */}
                                                                {isOwner ? (
                                                                    <span className="text-[10px] font-black px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full uppercase tracking-wide flex items-center gap-1">
                                                                        <Sparkles className="w-3 h-3" />
                                                                        Owner
                                                                    </span>
                                                                ) : isAdmin ? (
                                                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-100 rounded-full uppercase tracking-wide flex items-center gap-1">
                                                                        <Shield className="w-3 h-3" />
                                                                        Admin
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-100 rounded-full uppercase tracking-wide">
                                                                        Member
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Display Name / Role Title */}
                                                            {memberDisplayName && (
                                                                <p className="text-xs text-gray-500 mt-0.5 font-medium truncate max-w-[200px]">
                                                                    {memberDisplayName}
                                                                </p>
                                                            )}

                                                            {/* Joined Date */}
                                                            {member.joined_at && (
                                                                <p className="text-[10px] text-gray-400 mt-1">
                                                                    Joined {new Date(member.joined_at).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions - Only for admins, not for self/owner */}
                                                    <div className="flex items-center gap-3">
                                                        {identity?.role === 'admin' && !isCurrentUser && !member.is_owner && (
                                                            <>
                                                                {/* Role Change Dropdown */}
                                                                <div className="relative group/role">
                                                                    <select
                                                                        value={member.role}
                                                                        onChange={(e) => handleChangeRole(member.id, e.target.value as 'admin' | 'member')}
                                                                        className={`appearance-none text-xs font-bold pl-3 pr-8 py-1.5 rounded-lg cursor-pointer border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${member.role === 'admin'
                                                                            ? 'bg-purple-50 text-purple-700 border-purple-200 hover:border-purple-300'
                                                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                                                                            }`}
                                                                    >
                                                                        <option value="admin">Admin Access</option>
                                                                        <option value="member">Member Access</option>
                                                                    </select>
                                                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-gray-400 group-hover/role:text-gray-600" />
                                                                </div>

                                                                {/* Remove Button */}
                                                                <button
                                                                    onClick={() => handleRemoveMember(member.id, member.username)}
                                                                    className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                                    title="Remove member"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Pending Invites */}
                            {identity?.role === 'admin' && invites.length > 0 && (
                                <div className="p-6 bg-amber-50/50">
                                    <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        Pending Invites
                                    </h3>
                                    <div className="space-y-3">
                                        {invites.map(invite => (
                                            <div
                                                key={invite.id}
                                                className="flex items-center justify-between p-4 bg-white border border-amber-100 rounded-xl"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
                                                        <ExternalLink className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {invite.role === 'admin' ? 'Admin Invite' : 'Member Invite'}
                                                        </p>
                                                        <p className="text-xs text-gray-500 font-mono">
                                                            Expires {new Date(invite.expires_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join/team?token=${invite.token}`)}
                                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Copy Link"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => revokeInvite(invite.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                    ) : (
                        /* SOLO VIEW -> UNLOCK CTA */
                        <div className="p-12 text-center bg-gradient-to-br from-gray-50 to-white">
                            <div className="max-w-md mx-auto">
                                <div className="p-4 bg-indigo-100 rounded-2xl text-indigo-300 w-fit mx-auto mb-6">
                                    <Shield className="w-12 h-12" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">Unlock Team Workspace</h3>
                                <p className="text-gray-500 mb-8">
                                    Collaborate with your team, share schemas, and manage permissions together.
                                </p>
                                <button
                                    disabled
                                    className="px-8 py-3 bg-gray-100 text-gray-400 font-bold text-xs uppercase tracking-widest rounded-xl cursor-not-allowed border border-gray-200"
                                >
                                    Team Access: Coming Soon
                                </button>
                            </div>
                        </div>
                    )}
                </section>



                {/* ============================
                    SECTION 6: HELP & SUPPORT
                ============================ */}
                < section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm" >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-indigo-50 rounded-xl">
                            <HelpCircle className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Help & Support</h2>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <a
                            href="/help"
                            className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-colors group"
                        >
                            <FileText className="w-6 h-6 text-gray-400 group-hover:text-indigo-600" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">Documentation</span>
                        </a>
                        <a
                            href="https://github.com/CaptainRushi/Vizora1/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors group"
                        >
                            <Bug className="w-6 h-6 text-gray-400 group-hover:text-red-600" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-red-600">Report a Bug</span>
                        </a>
                        <a
                            href="https://github.com/CaptainRushi/Vizora1/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-colors group"
                        >
                            <Lightbulb className="w-6 h-6 text-gray-400 group-hover:text-amber-600" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-amber-600">Request Feature</span>
                        </a>
                        <a
                            href="/help?section=contact"
                            className="flex flex-col items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-green-50 hover:text-green-600 transition-colors group"
                        >
                            <Headphones className="w-6 h-6 text-gray-400 group-hover:text-green-600" />
                            <span className="text-sm font-medium text-gray-700 group-hover:text-green-600">Contact Support</span>
                        </a>
                    </div>
                </section >

                {/* ============================
                    DANGER ZONE
                ============================ */}
                < section className="border border-red-200 rounded-3xl overflow-hidden" >
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 p-8">
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
                        {team?.workspace_type === 'team' && identity?.role !== 'admin' ? (
                            <p className="text-sm text-gray-500 italic bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                Contact a workspace admin to delete this account
                            </p>
                        ) : (
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                className="px-5 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700 transition-colors shadow-sm hover:shadow-md"
                            >
                                Delete account permanently
                            </button>
                        )}
                    </div>
                </section >

            </div >

            {/* ============================
                MODALS
            ============================ */}
            {
                showInviteModal && identity?.workspace && (
                    <InviteModal
                        workspaceId={identity.workspace.id}
                        workspaceName={identity.workspace.name}
                        onClose={() => setShowInviteModal(false)}
                        onInviteGenerated={() => {
                            if (identity.workspace?.id) {
                                fetchInvites(identity.workspace.id).then(setInvites);
                            }
                        }}
                    />
                )
            }

            {
                showDeleteModal && identity?.workspace && (
                    <DeleteAccountModal
                        workspaceId={identity.workspace.id}
                        onClose={() => setShowDeleteModal(false)}
                    />
                )
            }

            {/* Edit Profile Modal (Window) */}
            <EditProfileModal
                isOpen={showEditProfile}
                onClose={() => setShowEditProfile(false)}
                onSave={() => fetchDashboardData()}
                userId={user?.id || ''}
                userEmail={user?.email || ''}
                workspaceId={identity?.workspace?.id || null}
                workspaceType={identity?.workspace?.type || null}
                userRole={identity?.role || 'member'}
                initialData={{
                    username: identity?.user.username || '',
                    displayName: identity?.user.display_name || '',
                    workspaceName: identity?.workspace?.name || ''
                }}
            />
            {/* Migration: Username Setup Modal */}
            {showSetupModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                    <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 pb-4 text-center">
                            <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-inner">
                                <Sparkles className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                                Choose your Identity
                            </h2>
                            <p className="text-slate-500 text-sm leading-relaxed">
                                Welcome to the new Vizora identity system! Please choose a unique username to continue.
                            </p>
                        </div>

                        <div className="p-8 pt-4 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-wider ml-1">
                                        Username
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-indigo-500 transition-colors">@</div>
                                        <input
                                            type="text"
                                            value={setupUsername}
                                            onChange={(e) => setSetupUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                                            placeholder="your_unique_id"
                                            className="w-full pl-9 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 outline-none ring-offset-0 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        />
                                    </div>
                                    {setupError && (
                                        <p className="text-xs font-bold text-red-500 ml-1 mt-1 flex items-center gap-1">
                                            <Building2 className="w-3 h-3" /> {setupError}
                                        </p>
                                    )}
                                </div>

                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">Why do I need this?</h4>
                                    <p className="text-[11px] text-slate-500 leading-normal">
                                        Your username is your unique identifier across all workspaces and collaboration sessions. It cannot be changed frequently.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleSetupUsername}
                                disabled={isSettingUp || setupUsername.length < 3}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:bg-slate-900 flex items-center justify-center gap-2"
                            >
                                {isSettingUp ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Saving Profile...</span>
                                    </>
                                ) : (
                                    <span>Set My Username</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
