import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProjectContext } from '../context/ProjectContext';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Users, Info, Trash2, UserPlus } from 'lucide-react';
import { LoadingSection } from '../components/LoadingSection';
import { useWorkspaceRole } from '../hooks/useWorkspaceRole';
import { toast } from 'react-hot-toast';

interface Member {
    user_id: string;
    username: string | null;
    display_name?: string | null;
    email?: string | null; // Added for fallback
    role: 'admin' | 'member' | 'owner';
    joined_at?: string | null;
    is_owner?: boolean;
    profile?: {
        username?: string;
        display_name?: string;
    };
}

export function TeamMembers() {
    const { projectId } = useParams<{ projectId: string }>();
    const { user, identity } = useAuth();
    const { project } = useProjectContext();
    const { isAdmin } = useWorkspaceRole({ workspaceId: project?.workspace_id });

    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (projectId) {
            loadMembers();
        }
    }, [projectId]);

    const loadMembers = async () => {
        try {
            setLoading(true);
            const data = await api.projectSettings.getAll(projectId!);
            if (data && data.members) {
                setMembers(data.members);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load team members");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!confirm("Are you sure you want to remove this member?")) return;
        try {
            await api.projectSettings.removeMember(projectId!, userId);
            toast.success("Member removed");
            loadMembers();
        } catch (err: any)g
            toast.error(err.response?.data?.error || "Failed to remove member");
        }
    };

    if (loading) {
        return <LoadingSection title="Loading team..." subtitle="Fetching project members" />;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                    Project Team
                </h1>
                <p className="text-slate-500 text-lg">
                    Manage collaborators and access for <span className="font-bold text-slate-700 dark:text-slate-300">{project?.name}</span>.
                </p>
            </div>

            <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-slate-400" />
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Members</h2>
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-full">
                            {members.length} {members.length === 1 ? 'member' : 'members'}
                        </span>
                    </div>
                </div>

                <div className="p-8">
                    {/* Access Mode Info */}
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl p-4 flex items-start gap-3 mb-8">
                        <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-indigo-900 dark:text-indigo-300 leading-relaxed">
                            <span className="font-bold">Role-Based Access:</span> Team members inherit roles from your workspace.
                            <span className="font-medium ml-1">Admins</span> have full control, while
                            <span className="font-medium ml-1">Members</span> can view and edit schemas.
                        </div>
                    </div>

                    {/* Members List */}
                    <div className="space-y-3">
                        {members.length === 0 ? (
                            <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Invite team members to collaborate.
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Go to your User Dashboard to invite members to your workspace.
                                </p>
                            </div>
                        ) : (
                            members.map((member, i) => {
                                const isCurrentUser = member.user_id === user?.id;
                                const isOwner = member.role === 'owner' || member.is_owner;

                                // Helper to get formatted display name
                                const getDisplayName = () => {
                                    if (isCurrentUser) return identity?.username ? `@${identity.username}` : user?.email || 'You';
                                    if (member.profile?.username) return `@${member.profile.username}`;
                                    if (member.username) return `@${member.username}`;
                                    if (member.display_name) return member.display_name;
                                    if (member.email) return member.email;
                                    return `Member-${member.user_id.slice(0, 6)}`;
                                };

                                const memberUsername = getDisplayName();
                                const memberDisplayName = isCurrentUser
                                    ? (identity?.display_name || 'Workspace Owner')
                                    : (member.profile?.display_name || member.display_name);
                                const initials = (memberUsername.startsWith('@') ? memberUsername.slice(1) : memberUsername)[0]?.toUpperCase() || 'U';

                                // Normalize role to admin/member for display
                                const displayRole = isOwner ? 'admin' : (member.role === 'admin' ? 'admin' : 'member');

                                return (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Avatar */}
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                                                {initials}
                                            </div>

                                            {/* User Info */}
                                            <div className="min-w-0">
                                                {/* Username + Role Badge Row */}
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                        {memberUsername}
                                                        {isCurrentUser && <span className="text-slate-400 font-normal ml-1">(You)</span>}
                                                    </span>

                                                    {/* Role Badge - Inline with username */}
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide ${displayRole === 'admin'
                                                        ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                                        }`}>
                                                        {displayRole}
                                                    </span>

                                                    {/* Owner Badge */}
                                                    {isOwner && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-md uppercase tracking-wide">
                                                            Owner
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Display Name (secondary, muted) */}
                                                {memberDisplayName && (
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[200px]">
                                                        {memberDisplayName}
                                                    </p>
                                                )}

                                                {/* Joined Date */}
                                                {member.joined_at && (
                                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                                                        Joined {new Date(member.joined_at).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions - Only for admins, not for self/owner */}
                                        {isAdmin && !isOwner && !isCurrentUser && (
                                            <button
                                                onClick={() => handleRemoveMember(member.user_id)}
                                                className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Remove member"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
export default TeamMembers;
