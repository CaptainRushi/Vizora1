import { useState } from 'react';
import { UserPlus, Trash2, Users as UsersIcon } from 'lucide-react';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: 'viewer' | 'editor' | 'admin';
}

export function TeamMembers() {
    const [members, setMembers] = useState<TeamMember[]>([
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'editor' },
    ]);
    const [newEmail, setNewEmail] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail.trim()) return;

        setIsAdding(true);
        // TODO: API call to invite member
        setTimeout(() => {
            setNewEmail('');
            setIsAdding(false);
        }, 1000);
    };

    const handleRemoveMember = (id: string) => {
        if (!confirm('Remove this team member?')) return;
        setMembers(members.filter(m => m.id !== id));
    };

    const handleRoleChange = (id: string, newRole: 'viewer' | 'editor' | 'admin') => {
        setMembers(members.map(m => m.id === id ? { ...m, role: newRole } : m));
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Team Members</h2>
                <p className="text-sm font-medium text-gray-500 mt-2">
                    Manage collaborators and their access levels.
                </p>
            </div>

            {/* Add Member Form */}
            <form onSubmit={handleAddMember} className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex gap-3">
                    <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="teammate@example.com"
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                    />
                    <button
                        type="submit"
                        disabled={isAdding || !newEmail.trim()}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-black rounded-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50"
                    >
                        <UserPlus className="h-4 w-4" />
                        {isAdding ? 'Inviting...' : 'Invite'}
                    </button>
                </div>
            </form>

            {/* Members List */}
            {members.length === 0 ? (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
                    <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-black text-gray-900 mb-2">No team members yet</h3>
                    <p className="text-sm font-medium text-gray-500">
                        Invite your team to collaborate on schemas.
                    </p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="divide-y divide-gray-100">
                        {members.map((member) => (
                            <div key={member.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-gray-900">{member.name}</h4>
                                    <p className="text-xs font-medium text-gray-500 mt-0.5">{member.email}</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <select
                                        value={member.role}
                                        onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                        <option value="admin">Admin</option>
                                    </select>

                                    <button
                                        onClick={() => handleRemoveMember(member.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
