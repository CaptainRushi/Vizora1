import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface DeleteAccountModalProps {
    workspaceId: string;
    onClose: () => void;
}

export function DeleteAccountModal({ workspaceId, onClose }: DeleteAccountModalProps) {
    const { user, signOut } = useAuth();
    const [confirmPhrase, setConfirmPhrase] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (!user || confirmPhrase !== 'DELETE MY ACCOUNT') return;

        setLoading(true);
        setError(null);

        try {
            const { error: rpcError } = await supabase.rpc('delete_account_completely', {
                target_user_id: user.id,
                target_workspace_id: workspaceId
            });

            if (rpcError) throw rpcError;

            // Log out and redirect
            await signOut();
            window.location.href = '/?deleted=true';
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to delete account.');
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-[480px] overflow-hidden transform transition-all scale-100 border border-red-100">

                {/* Header */}
                <div className="bg-white p-6 border-b border-gray-100 flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">Delete your account permanently</h2>
                    </div>
                    <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                        This will permanently delete your account and workspace.
                        All projects, schemas, documentation, exports, comments, team members, and billing data will be erased.
                    </p>

                    <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6">
                        <p className="text-red-800 text-sm font-bold flex items-center gap-2">
                            This action cannot be undone.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Type <span className="text-gray-900 select-all">DELETE MY ACCOUNT</span> to confirm
                        </label>
                        <input
                            type="text"
                            value={confirmPhrase}
                            onChange={(e) => setConfirmPhrase(e.target.value)}
                            placeholder="Type the confirmation phrase"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all font-mono text-sm"
                            autoComplete="off"
                            disabled={loading}
                        />
                    </div>

                    {error && (
                        <p className="text-red-600 text-xs mt-4 font-medium">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={confirmPhrase !== 'DELETE MY ACCOUNT' || loading}
                        className="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        Yes, delete everything
                    </button>
                </div>
            </div>
        </div>
    );
}
