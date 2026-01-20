import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
    Users,
    Trash2,
    ArrowLeft,
    Shield,
    Crown,
    Eye,
    UserPlus,
    Copy,
    Check,
    X,
    Clock,
    RefreshCw,
    Link2,
    ChevronDown,
    Star,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { WorkspaceMember, WorkspaceRole, getPermissions, Workspace, WorkspaceInvite } from './types';

const ROLE_CONFIG: Record<string, {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    gradient: string;
    ringColor: string;
    badgeGradient: string;
    lightBg: string;
    lightBorder: string;
}> = {
    owner: {
        label: 'Owner',
        icon: Crown,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        gradient: 'from-amber-500 via-orange-500 to-yellow-500',
        ringColor: 'ring-amber-500/50',
        badgeGradient: 'from-amber-50 to-orange-50',
        lightBg: 'bg-amber-50',
        lightBorder: 'border-amber-200'
    },
    admin: {
        label: 'Admin',
        icon: Shield,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        gradient: 'from-purple-500 via-violet-500 to-indigo-500',
        ringColor: 'ring-purple-500/50',
        badgeGradient: 'from-purple-50 to-violet-50',
        lightBg: 'bg-purple-50',
        lightBorder: 'border-purple-200'
    },
    member: {
        label: 'Member',
        icon: Users,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        gradient: 'from-blue-500 via-cyan-500 to-teal-500',
        ringColor: 'ring-blue-500/50',
        badgeGradient: 'from-blue-50 to-cyan-50',
        lightBg: 'bg-blue-50',
        lightBorder: 'border-blue-200'
    },

    viewer: {
        label: 'Viewer',
        icon: Eye,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        gradient: 'from-slate-500 via-gray-500 to-zinc-500',
        ringColor: 'ring-slate-500/50',
        badgeGradient: 'from-gray-50 to-slate-50',
        lightBg: 'bg-gray-50',
        lightBorder: 'border-gray-200'
    },
};

export function WorkspaceTeam() {
    const { workspaceId } = useParams();
    const navigate = useNavigate();
    const { user, identity } = useAuth();

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<WorkspaceRole>('viewer');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
    const [generatingInvite, setGeneratingInvite] = useState(false);
    const [newInviteLink, setNewInviteLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [roleDropdown, setRoleDropdown] = useState<string | null>(null);

    const permissions = getPermissions(userRole);

    const getMemberDisplayName = (m: WorkspaceMember): string => {
        if (m.profile?.username) return `@${m.profile.username}`;
        if (m.profile?.display_name) return m.profile.display_name;
        if (m.profile?.email) return m.profile.email;
        // Last resort
        return `User-${m.user_id.slice(0, 6)}`;
    };

    // Helper to get avatar initial
    const getMemberInitial = (m: WorkspaceMember): string => {
        const name = getMemberDisplayName(m);
        return (name.startsWith('@') ? name.slice(1) : name)[0]?.toUpperCase() || 'U';
    };

    useEffect(() => {
        if (workspaceId && user) {
            loadData();
        }
    }, [workspaceId, user]);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Fetch workspace
            const { data: ws, error: wsError } = await supabase
                .from('workspaces')
                .select('*')
                .eq('id', workspaceId)
                .single();

            if (wsError) throw wsError;
            setWorkspace(ws);

            // 2. Determine user role
            if (ws.owner_id === user?.id) {
                setUserRole('owner');
            } else {
                const { data: membership } = await supabase
                    .from('workspace_members')
                    .select('role')
                    .eq('workspace_id', workspaceId)
                    .eq('user_id', user?.id)
                    .single();

                if (membership) {
                    setUserRole(membership.role as WorkspaceRole);
                }
            }

            // 3. Fetch members
            const { data: membersData, error: membersError } = await supabase
                .from('workspace_members')
                .select('*')
                .eq('workspace_id', workspaceId);

            if (membersError) throw membersError;

            // Fetch profile data in parallel for each member
            const enrichedMembers = await Promise.all((membersData || []).map(async (m) => {
                const { data: profile } = await supabase
                    .from('users')
                    .select('username, display_name, email')
                    .eq('id', m.user_id)
                    .maybeSingle();

                // Also try to get the user's email from auth metadata if no username
                let userEmail = profile?.email;
                if (!profile?.username && !profile?.display_name && !userEmail) {
                    // Try getting from auth users table (admin only) - use user_id as email fallback
                    try {
                        const { data: authData } = await supabase.auth.admin.getUserById(m.user_id);
                        userEmail = authData?.user?.email;
                    } catch {
                        // Admin API not available, that's ok
                    }
                }

                return {
                    ...m,
                    role: m.role as WorkspaceRole,
                    profile: profile ? {
                        ...profile,
                        email: profile.email || userEmail,
                    } : userEmail ? { email: userEmail } : undefined,
                } as WorkspaceMember;
            }));

            setMembers(enrichedMembers);

            // 4. Fetch active invites (for admins)
            if (ws.owner_id === user?.id || userRole === 'admin') {
                const { data: invitesData } = await supabase
                    .from('workspace_invites')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .eq('is_active', true)
                    .eq('revoked', false)
                    .gt('expires_at', new Date().toISOString())
                    .order('created_at', { ascending: false });

                if (invitesData) {
                    setInvites(invitesData);
                }
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to load team data");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateInvite = async () => {
        if (!workspaceId || !permissions.canInvite) return;

        setGeneratingInvite(true);
        try {
            // Generate a unique token
            const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

            const { data, error } = await supabase
                .from('workspace_invites')
                .insert({
                    workspace_id: workspaceId,
                    token,
                    role: inviteRole,
                    expires_at: expiresAt.toISOString(),
                    max_uses: 50,
                    created_by: user?.id,
                })
                .select()
                .single();

            if (error) throw error;

            const inviteUrl = `${window.location.origin}/join/team?token=${token}`;
            setNewInviteLink(inviteUrl);
            setInvites([data, ...invites]);
            toast.success('Invite link generated!');

        } catch (err: any) {
            console.error(err);
            toast.error(err.message || 'Failed to create invite');
        } finally {
            setGeneratingInvite(false);
        }
    };

    const handleCopyLink = async () => {
        await navigator.clipboard.writeText(newInviteLink);
        setCopied(true);
        toast.success('Link copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRevokeInvite = async (inviteId: string) => {
        if (!confirm('Revoke this invite link?')) return;

        try {
            await supabase
                .from('workspace_invites')
                .update({ revoked: true, is_active: false })
                .eq('id', inviteId);

            setInvites(invites.filter(i => i.id !== inviteId));
            toast.success('Invite revoked');
        } catch (err) {
            toast.error('Failed to revoke invite');
        }
    };

    const handleChangeRole = async (memberId: string, newRole: WorkspaceRole) => {
        if (!permissions.canManageMembers || newRole === 'owner') return;

        try {
            const { error } = await supabase
                .from('workspace_members')
                .update({ role: newRole })
                .eq('id', memberId);

            if (error) throw error;

            setMembers(members.map(m => m.id === memberId ? { ...m, role: newRole } : m));
            setRoleDropdown(null);
            toast.success('Role updated');
        } catch (err) {
            toast.error('Failed to update role');
        }
    };

    const handleRemoveMember = async (memberId: string, memberUserId: string) => {
        if (!permissions.canManageMembers) return;
        if (memberUserId === user?.id) {
            toast.error("You can't remove yourself");
            return;
        }
        if (!confirm('Remove this member from the workspace?')) return;

        try {
            const { error } = await supabase
                .from('workspace_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;

            setMembers(members.filter(m => m.id !== memberId));
            toast.success('Member removed');
        } catch (err) {
            toast.error('Failed to remove member');
        }
    };

    const getRoleDisplay = (role: WorkspaceRole, size: 'sm' | 'md' = 'sm') => {
        const config = ROLE_CONFIG[role];
        const Icon = config.icon;
        const sizeClasses = size === 'md'
            ? 'gap-2 px-3.5 py-1.5 text-sm'
            : 'gap-1.5 px-2.5 py-1 text-xs';
        return (
            <span className={`inline-flex items-center ${sizeClasses} rounded-full font-semibold ${config.lightBg} ${config.color} border ${config.lightBorder} shadow-sm`}>
                <Icon className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
                {config.label}
            </span>
        );
    };

    // Generate avatar colors based on role
    const getAvatarGradient = (_name: string, role: WorkspaceRole) => {
        const config = ROLE_CONFIG[role];
        return config.gradient;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                    <p className="text-sm font-medium text-gray-500">Loading team...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12">
            <div className="app-container">
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Header */}
                    <button
                        onClick={() => navigate(`/workspaces/${workspaceId}`)}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-all group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Editor
                    </button>

                    {/* Title Section */}
                    <section className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                                    <Users className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                                        Team Members
                                    </h1>
                                    <p className="text-gray-500 font-medium">
                                        Manage access for <span className="font-semibold text-gray-900">{workspace?.name}</span>
                                    </p>
                                </div>
                            </div>

                            {permissions.canInvite && (
                                <button
                                    onClick={() => setShowInviteModal(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/25 transition-all hover:shadow-lg active:scale-95"
                                >
                                    <UserPlus className="w-5 h-5" />
                                    Invite Members
                                </button>
                            )}
                        </div>
                    </section>

                    {/* Role Legend */}
                    <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Star className="w-3.5 h-3.5" />
                            Role Permissions
                        </h3>
                        <div className="flex flex-wrap gap-3">
                            {Object.entries(ROLE_CONFIG).map(([role, config]) => {
                                const perms = getPermissions(role as WorkspaceRole);
                                return (
                                    <div
                                        key={role}
                                        className="group relative"
                                    >
                                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl ${config.lightBg} border ${config.lightBorder} cursor-default transition-all hover:shadow-md`}>
                                            <config.icon className={`w-4 h-4 ${config.color}`} />
                                            <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
                                        </div>

                                        {/* Hover tooltip */}
                                        <div className="absolute z-20 left-0 top-full mt-2 w-48 p-3 rounded-xl bg-white border border-gray-200 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                            <div className="text-[11px] text-gray-600 space-y-1.5">
                                                {perms.canEdit && <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> Edit code</div>}
                                                {perms.canCreateVersions && <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> Save versions</div>}
                                                {perms.canInvite && <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> Invite members</div>}
                                                {perms.canManageMembers && <div className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> Manage team</div>}
                                                {!perms.canEdit && <div className="flex items-center gap-1.5"><Eye className="w-3 h-3 text-gray-400" /> View only</div>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>


                    {/* Members Section */}
                    <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-2">
                                    {/* Owner avatar */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 ring-2 ring-white flex items-center justify-center shadow-md">
                                        <Crown className="w-4 h-4 text-white" />
                                    </div>
                                    {/* Member avatars preview */}
                                    {members.slice(0, 3).map((m) => (
                                        <div
                                            key={m.id}
                                            className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(m.profile?.username || '', m.role)} ring-2 ring-white flex items-center justify-center text-sm font-bold text-white shadow-md`}
                                        >
                                            {m.profile?.username?.[0]?.toUpperCase() || 'U'}
                                        </div>
                                    ))}
                                    {members.length > 3 && (
                                        <div className="w-10 h-10 rounded-full bg-gray-100 ring-2 ring-white flex items-center justify-center text-xs font-bold text-gray-600 shadow-md">
                                            +{members.length - 3}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <span className="text-2xl font-black text-gray-900">{members.length + 1}</span>
                                    <span className="text-gray-500 ml-1.5 font-medium">{members.length === 0 ? 'Member' : 'Members'}</span>
                                </div>
                            </div>
                            <button
                                onClick={loadData}
                                className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all group"
                                title="Refresh"
                            >
                                <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                            </button>
                        </div>

                        {/* Members List */}
                        <div className="divide-y divide-gray-100">
                            {/* Owner Card */}
                            {workspace && (
                                <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 flex items-center justify-center shadow-lg">
                                                <Crown className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                    {workspace.owner_id === user?.id ? (identity?.username ? `@${identity.username}` : 'You') : 'Owner'}
                                                    {workspace.owner_id === user?.id && (
                                                        <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold border border-amber-200">
                                                            You
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-amber-600 font-medium">Workspace Owner</div>
                                            </div>
                                        </div>
                                        {getRoleDisplay('owner', 'md')}
                                    </div>
                                </div>
                            )}

                            {/* Team Members */}
                            {members.length === 0 ? (
                                <div className="py-16 text-center">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                        <Users className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-600 text-lg font-medium mb-2">No team members yet</p>
                                    <p className="text-gray-400 text-sm mb-6">Invite your first teammate to collaborate</p>
                                    {permissions.canInvite && (
                                        <button
                                            onClick={() => setShowInviteModal(true)}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-sm transition-colors"
                                        >
                                            <UserPlus className="w-4 h-4" />
                                            Invite your first teammate
                                        </button>
                                    )}
                                </div>
                            ) : (
                                members.map(m => {
                                    const roleConfig = ROLE_CONFIG[m.role];
                                    return (
                                        <div
                                            key={m.id}
                                            className={`group p-5 hover:${roleConfig.lightBg} transition-colors`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    {/* Avatar */}
                                                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${roleConfig.gradient} flex items-center justify-center text-lg font-bold text-white shadow-md`}>
                                                        {getMemberInitial(m)}
                                                    </div>

                                                    <div>
                                                        <div className="font-semibold text-gray-900 text-lg flex items-center gap-2">
                                                            {getMemberDisplayName(m)}
                                                            {m.user_id === user?.id && (
                                                                <span className={`text-[10px] px-2 py-0.5 ${roleConfig.lightBg} ${roleConfig.color} rounded-full font-semibold border ${roleConfig.lightBorder}`}>
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                                            <span>{m.profile?.display_name || 'Team Member'}</span>
                                                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                Joined {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {/* Role dropdown */}
                                                    {permissions.canManageMembers && m.user_id !== user?.id ? (
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => setRoleDropdown(roleDropdown === m.id ? null : m.id)}
                                                                className="flex items-center gap-1.5 hover:opacity-90 transition-all"
                                                            >
                                                                {getRoleDisplay(m.role, 'md')}
                                                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${roleDropdown === m.id ? 'rotate-180' : ''}`} />
                                                            </button>

                                                            {roleDropdown === m.id && (
                                                                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
                                                                    {(['admin', 'member', 'viewer'] as WorkspaceRole[]).map(role => {
                                                                        const rConfig = ROLE_CONFIG[role];
                                                                        return (
                                                                            <button
                                                                                key={role}
                                                                                onClick={() => handleChangeRole(m.id, role)}
                                                                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between transition-colors ${m.role === role ? 'bg-gray-50' : ''}`}
                                                                            >
                                                                                <div className="flex items-center gap-2">
                                                                                    <rConfig.icon className={`w-4 h-4 ${rConfig.color}`} />
                                                                                    <span className="text-gray-700 font-medium">{rConfig.label}</span>
                                                                                </div>
                                                                                {m.role === role && <Check className="w-4 h-4 text-emerald-500" />}
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        getRoleDisplay(m.role, 'md')
                                                    )}

                                                    {/* Remove button */}
                                                    {permissions.canManageMembers && m.user_id !== user?.id && (
                                                        <button
                                                            onClick={() => handleRemoveMember(m.id, m.user_id)}
                                                            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                                            title="Remove member"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    {/* Active Invites Section */}
                    {permissions.canInvite && invites.length > 0 && (
                        <section className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-indigo-50">
                                    <Link2 className="w-4 h-4 text-indigo-600" />
                                </div>
                                Active Invite Links
                                <span className="ml-auto text-xs font-normal text-gray-400">{invites.length} active</span>
                            </h3>
                            <div className="space-y-3">
                                {invites.map(invite => {
                                    const inviteConfig = ROLE_CONFIG[invite.role as WorkspaceRole];
                                    return (
                                        <div
                                            key={invite.id}
                                            className={`flex items-center justify-between p-4 rounded-xl ${inviteConfig.lightBg} border ${inviteConfig.lightBorder} hover:shadow-md transition-all`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg bg-gradient-to-br ${inviteConfig.gradient}`}>
                                                    <inviteConfig.icon className="w-4 h-4 text-white" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {getRoleDisplay(invite.role as WorkspaceRole)}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-3">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            Expires {new Date(invite.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <span className="w-1 h-1 rounded-full bg-gray-300" />
                                                        <span className="text-gray-400">
                                                            {invite.used_count}/{invite.max_uses} uses
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRevokeInvite(invite.id)}
                                                className="px-3 py-1.5 text-xs font-semibold text-red-500 hover:text-white hover:bg-red-500 rounded-lg transition-all border border-red-200 hover:border-red-500"
                                            >
                                                Revoke
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                                        <UserPlus className="w-5 h-5 text-white" />
                                    </div>
                                    Invite Team Members
                                </h2>
                                <button
                                    onClick={() => { setShowInviteModal(false); setNewInviteLink(''); }}
                                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mt-2">
                                Generate a shareable invite link for your team
                            </p>
                        </div>

                        <div className="p-6 space-y-5">
                            {!newInviteLink ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                                            Select Role
                                        </label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {(['admin', 'member', 'viewer'] as const).map(role => {
                                                const config = ROLE_CONFIG[role];
                                                return (
                                                    <button
                                                        key={role}
                                                        onClick={() => setInviteRole(role)}
                                                        className={`relative p-4 rounded-xl text-center transition-all overflow-hidden ${inviteRole === role
                                                            ? `${config.lightBg} border-2 ${config.lightBorder} shadow-md`
                                                            : 'bg-gray-50 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        <div className="relative">
                                                            <div className={`w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center ${inviteRole === role ? `bg-gradient-to-br ${config.gradient}` : 'bg-gray-200'} transition-colors`}>
                                                                <config.icon className={`w-5 h-5 ${inviteRole === role ? 'text-white' : config.color}`} />
                                                            </div>
                                                            <div className={`text-xs font-bold ${inviteRole === role ? config.color : 'text-gray-600'}`}>
                                                                {config.label}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-semibold">Permissions included:</div>
                                        <ul className="text-sm text-gray-600 space-y-2">
                                            {inviteRole === 'admin' && (
                                                <>
                                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Full edit access</li>
                                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Can invite others</li>
                                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Can manage team</li>
                                                </>
                                            )}
                                            {inviteRole === 'member' && (
                                                <>
                                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Edit code and save versions</li>
                                                    <li className="flex items-center gap-2"><X className="w-4 h-4 text-red-400" /> Cannot invite or manage team</li>
                                                </>
                                            )}
                                            {inviteRole === 'viewer' && (
                                                <>
                                                    <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> View schema and history</li>
                                                    <li className="flex items-center gap-2"><X className="w-4 h-4 text-red-400" /> Cannot edit code</li>
                                                    <li className="flex items-center gap-2"><X className="w-4 h-4 text-red-400" /> Cannot invite or manage team</li>
                                                </>
                                            )}
                                        </ul>
                                    </div>

                                    <button
                                        onClick={handleGenerateInvite}
                                        disabled={generatingInvite}
                                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/25"
                                    >
                                        {generatingInvite ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Link2 className="w-5 h-5" />
                                                Generate Invite Link
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                        <div className="flex items-center gap-3 text-emerald-700 font-semibold mb-2">
                                            <div className="p-2 rounded-lg bg-emerald-100">
                                                <Check className="w-4 h-4" />
                                            </div>
                                            Invite Link Created
                                        </div>
                                        <p className="text-sm text-emerald-600">
                                            This link expires in 7 days and can be used up to 50 times.
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newInviteLink}
                                            readOnly
                                            className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleCopyLink}
                                            className={`px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all ${copied
                                                ? 'bg-emerald-500 text-white shadow-lg'
                                                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'
                                                }`}
                                        >
                                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            {copied ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => { setShowInviteModal(false); setNewInviteLink(''); }}
                                        className="w-full py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 hover:border-gray-300 transition-all"
                                    >
                                        Done
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
