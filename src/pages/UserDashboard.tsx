import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
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
    Pencil
} from 'lucide-react';
import { InviteModal } from '../components/dashboard/InviteModal';
import { DeleteAccountModal } from '../components/dashboard/DeleteAccountModal';
import { EditProfileDrawer } from '../components/dashboard/EditProfileDrawer';
import { LoadingSection } from '../components/LoadingSection';

// ============================
// TYPES
// ============================
interface IdentityData {
    user: {
        id: string;
        username: string | null;
        role_title: string | null;
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
    role: 'admin' | 'member' | 'editor' | 'viewer';
    joined_at: string | null;
    is_owner: boolean;
}

interface TeamData {
    workspace_type: 'personal' | 'team';
    members: TeamMember[];
}

interface ActivityItem {
    id: string;
    action: string;
    entity_type: string;
    entity_id?: string;
    metadata: Record<string, any>;
    created_at: string;
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

function EditableText({ value, onSave, placeholder, className }: {
    value: string;
    onSave: (val: string) => Promise<void>;
    placeholder?: string;
    className?: string;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (localValue !== value) {
            setSaving(true);
            try {
                await onSave(localValue);
            } finally {
                setSaving(false);
            }
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                    autoFocus
                    className={`border border-indigo-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
                    placeholder={placeholder}
                />
                {saving && <div className="animate-spin w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" />}
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsEditing(true)}
            className={`text-left hover:bg-gray-50 px-2 py-1 -mx-2 rounded-lg transition-colors cursor-pointer ${className}`}
            title="Click to edit"
        >
            {value || <span className="text-gray-400">{placeholder || 'Click to set'}</span>}
        </button>
    );
}

// ============================
// MAIN COMPONENT
// ============================
export function UserDashboard() {
    const { user } = useAuth();

    // State
    const [identity, setIdentity] = useState<IdentityData | null>(null);
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [team, setTeam] = useState<TeamData | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);

    // ============================
    // DATA FETCHING
    // ============================
    const fetchDashboardData = useCallback(async () => {
        if (!user) return;

        setLoading(true);
        try {
            // Fetch workspace first (existing logic for reliability)
            let workspaceId: string | null = null;

            // Try to get owned workspace
            let { data: wsData } = await supabase
                .from('workspaces')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();

            let userRole: 'admin' | 'member' = 'admin';

            // If not owner, check membership
            if (!wsData) {
                const { data: membership } = await supabase
                    .from('workspace_members')
                    .select('workspace_id, role')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (membership) {
                    const { data: w } = await supabase
                        .from('workspaces')
                        .select('*')
                        .eq('id', membership.workspace_id)
                        .single();
                    if (w) {
                        wsData = w;
                        userRole = membership.role as 'admin' | 'member';
                    }
                }
            }

            // Create default workspace if none exists
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
                userRole = 'admin';
            }

            workspaceId = wsData?.id || null;

            // Get member count
            let memberCount = 1;
            if (workspaceId) {
                const { count } = await supabase
                    .from('workspace_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('workspace_id', workspaceId);
                memberCount = (count || 0) + 1;
            }

            // Set identity data
            const { data: profile } = await supabase
                .from('profiles')
                .select('username, role_title, created_at')
                .eq('id', user.id)
                .maybeSingle();

            setIdentity({
                user: {
                    id: user.id,
                    username: profile?.username || user.user_metadata?.full_name || null,
                    role_title: profile?.role_title || null,
                    created_at: profile?.created_at || user.created_at
                },
                workspace: wsData ? {
                    id: wsData.id,
                    name: wsData.name,
                    type: wsData.type,
                    created_at: wsData.created_at,
                    member_count: memberCount
                } : null,
                role: userRole
            });

            // Parallel fetch remaining data if we have workspace
            if (workspaceId) {
                const [usageResult, teamResult, invitesResult] = await Promise.all([
                    // Usage stats
                    fetchUsageStats(workspaceId),
                    // Team members
                    fetchTeamData(workspaceId),
                    // Active invites (admin only)
                    userRole === 'admin' ? fetchInvites(workspaceId) : Promise.resolve([])
                ]);

                setUsage(usageResult);
                setTeam(teamResult);
                setInvites(invitesResult);

                // Fetch activity
                fetchActivity(workspaceId);
            }

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
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
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('owner_id, type')
            .eq('id', workspaceId)
            .single();

        const { data: members } = await supabase
            .from('workspace_members')
            .select('id, user_id, role, created_at')
            .eq('workspace_id', workspaceId);

        // Get profiles
        const memberIds = members?.map(m => m.user_id) || [];
        const allUserIds = [workspace?.owner_id, ...memberIds].filter(Boolean);

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', allUserIds);

        const memberList = (members || []).map(m => {
            const profile = profiles?.find(p => p.id === m.user_id);
            return {
                id: m.id,
                user_id: m.user_id,
                username: profile?.username || null,
                role: m.role as TeamMember['role'],
                joined_at: m.created_at,
                is_owner: m.user_id === workspace?.owner_id
            };
        });

        // Add owner if not in members
        if (workspace?.owner_id && !memberList.find(m => m.user_id === workspace.owner_id)) {
            const ownerProfile = profiles?.find(p => p.id === workspace.owner_id);
            memberList.unshift({
                id: 'owner',
                user_id: workspace.owner_id,
                username: ownerProfile?.username || null,
                role: 'admin',
                joined_at: null,
                is_owner: true
            });
        }

        return {
            workspace_type: (workspace?.type as any) || 'personal',
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

    const fetchActivity = async (workspaceId: string) => {
        // Get recent schema versions as activity
        const { data: projects } = await supabase
            .from('projects')
            .select('id, name')
            .eq('workspace_id', workspaceId);

        const projectIds = projects?.map(p => p.id) || [];
        const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);

        if (projectIds.length > 0) {
            const { data: versions } = await supabase
                .from('schema_versions')
                .select('id, project_id, version, created_at')
                .in('project_id', projectIds)
                .order('created_at', { ascending: false })
                .limit(10);

            const activities: ActivityItem[] = (versions || []).map(v => ({
                id: `sv-${v.id}`,
                action: 'schema_version_created',
                entity_type: 'schema',
                entity_id: v.project_id,
                metadata: {
                    version: v.version,
                    project_name: projectMap.get(v.project_id) || 'Unknown Project'
                },
                created_at: v.created_at
            }));

            setActivity(activities);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // ============================
    // ACTIONS
    // ============================
    const handleUpdateUsername = async (newUsername: string) => {
        if (!user) return;
        await supabase
            .from('profiles')
            .upsert({ id: user.id, username: newUsername, updated_at: new Date().toISOString() });
        fetchDashboardData();
    };

    const handleUpdateWorkspaceName = async (newName: string) => {
        if (!identity?.workspace?.id) return;
        await supabase
            .from('workspaces')
            .update({ name: newName, updated_at: new Date().toISOString() })
            .eq('id', identity.workspace.id);
        fetchDashboardData();
    };

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

    const getActivityDescription = (item: ActivityItem): string => {
        switch (item.action) {
            case 'schema_version_created':
                return `Schema v${item.metadata.version} added to ${item.metadata.project_name}`;
            case 'invite_created':
                return `Invite link created for ${item.metadata.role} role`;
            case 'member_removed':
                return `Team member was removed`;
            case 'member_role_changed':
                return `Member role changed to ${item.metadata.new_role}`;
            case 'profile_updated':
                return `Profile updated: ${item.metadata.fields?.join(', ') || 'details changed'}`;
            default:
                return item.action.replace(/_/g, ' ');
        }
    };

    const getInitials = () => {
        const name = identity?.user.username || user?.user_metadata?.full_name || user?.email || 'U';
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
                                    {/* Username - Editable */}
                                    <EditableText
                                        value={identity?.user.username || ''}
                                        onSave={handleUpdateUsername}
                                        placeholder="Set your username"
                                        className="text-3xl font-black text-gray-900 tracking-tight"
                                    />
                                </div>
                                {/* Edit Profile Button */}
                                <button
                                    onClick={() => setShowEditProfile(true)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 rounded-xl transition-all"
                                >
                                    <Pencil className="w-4 h-4" />
                                    Edit profile
                                </button>
                            </div>

                            {/* Email */}
                            <p className="text-gray-500 font-medium mb-4 lowercase">
                                {user?.email}
                            </p>

                            {/* Badges */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Role Badge */}
                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg ${identity?.role === 'admin'
                                    ? 'bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-200'
                                    : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    <User className="w-3.5 h-3.5" />
                                    {identity?.role === 'admin' ? 'Workspace Admin' : 'Member'}
                                </span>

                                {/* Workspace Type Badge */}
                                <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg ${identity?.workspace?.type === 'team'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                                    }`}>
                                    {identity?.workspace?.type === 'team' ? (
                                        <>
                                            <UsersIcon className="w-3.5 h-3.5" />
                                            Team Workspace
                                        </>
                                    ) : (
                                        <>
                                            <Building2 className="w-3.5 h-3.5" />
                                            Solo Workspace
                                        </>
                                    )}
                                </span>

                                {/* Workspace Name - Editable */}
                                {identity?.workspace && identity?.role === 'admin' && (
                                    <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                                        <span>Workspace:</span>
                                        <EditableText
                                            value={identity.workspace.name}
                                            onSave={handleUpdateWorkspaceName}
                                            placeholder="Workspace name"
                                            className="text-gray-600 font-semibold"
                                        />
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
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                    Invite Member
                                </button>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 pl-12">Manage who can access this workspace</p>
                    </div>

                    {team?.workspace_type !== 'team' ? (
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
                    ) : (
                        /* TEAM VIEW */
                        <div className="divide-y divide-gray-100">
                            {/* Team Stats */}
                            <div className="p-6 bg-gray-50 grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Total Seats</p>
                                    <p className="text-xl font-black text-gray-900">5</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Active</p>
                                    <p className="text-xl font-black text-gray-900">{team?.members.length || 0}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Available</p>
                                    <p className="text-xl font-black text-green-600">{5 - (team?.members.length || 0)}</p>
                                </div>
                            </div>

                            {/* Members List */}
                            <div className="p-6">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Active Members</h3>
                                <div className="space-y-3">
                                    {team?.members.map(member => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                                                    {(member.username || member.user_id.slice(0, 2)).slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">
                                                        {member.user_id === user?.id ? 'You' : (member.username || `User ${member.user_id.slice(0, 4)}...`)}
                                                        {member.is_owner && (
                                                            <span className="ml-2 text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Owner</span>
                                                        )}
                                                    </p>
                                                    {member.joined_at && (
                                                        <p className="text-xs text-gray-500">
                                                            Joined {new Date(member.joined_at).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${member.role === 'admin'
                                                    ? 'bg-purple-50 text-purple-700'
                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {member.role.toUpperCase()}
                                                </span>
                                                {identity?.role === 'admin' && member.user_id !== user?.id && !member.is_owner && (
                                                    <button className="text-gray-400 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
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
                    )}
                </section>

                {/* ============================
                    SECTION 5: RECENT ACTIVITY LOG
                ============================ */}
                <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-indigo-50 rounded-xl">
                            <Clock className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
                    </div>

                    {activity.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No recent activity</p>
                            <p className="text-sm">Your schema changes and actions will appear here</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activity.slice(0, 8).map(item => (
                                <div
                                    key={item.id}
                                    className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    <div className={`p-2 rounded-lg ${item.entity_type === 'schema'
                                        ? 'bg-indigo-100 text-indigo-600'
                                        : item.entity_type === 'team'
                                            ? 'bg-purple-100 text-purple-600'
                                            : 'bg-gray-200 text-gray-600'
                                        }`}>
                                        {item.entity_type === 'schema' ? (
                                            <GitBranch className="w-4 h-4" />
                                        ) : item.entity_type === 'team' ? (
                                            <UsersIcon className="w-4 h-4" />
                                        ) : (
                                            <Activity className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">
                                            {getActivityDescription(item)}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {new Date(item.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ============================
                    SECTION 6: HELP & SUPPORT
                ============================ */}
                <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
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
                </section>

                {/* ============================
                    DANGER ZONE
                ============================ */}
                <section className="border border-red-200 rounded-3xl overflow-hidden">
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
                </section>

            </div>

            {/* ============================
                MODALS
            ============================ */}
            {showInviteModal && identity?.workspace && (
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
            )}

            {showDeleteModal && identity?.workspace && (
                <DeleteAccountModal
                    workspaceId={identity.workspace.id}
                    onClose={() => setShowDeleteModal(false)}
                />
            )}

            {/* Edit Profile Drawer */}
            <EditProfileDrawer
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
                    displayName: identity?.user.role_title || '',
                    workspaceName: identity?.workspace?.name || ''
                }}
            />
        </div>
    );
}
