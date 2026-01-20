import { useState, useEffect } from 'react';
import { X, User, Building2, Lock, Check, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    userId: string;
    userEmail: string;
    workspaceId: string | null;
    workspaceType: 'personal' | 'team' | null;
    userRole: 'admin' | 'member';
    initialData: {
        username: string;
        displayName: string;
        workspaceName: string;
    };
}

interface FormErrors {
    username?: string;
    displayName?: string;
    workspaceName?: string;
}

export function EditProfileModal({
    isOpen,
    onClose,
    onSave,
    userId,
    userEmail,
    workspaceId: _workspaceId,
    workspaceType,
    userRole,
    initialData
}: EditProfileModalProps) {
    const { refreshIdentity } = useAuth();

    // Form state
    const [username, setUsername] = useState(initialData.username);
    const [displayName, setDisplayName] = useState(initialData.displayName);
    const [workspaceName, setWorkspaceName] = useState(initialData.workspaceName);

    // UI state
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSaving, setIsSaving] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    // Reset/Sync form
    useEffect(() => {
        if (isOpen) {
            setUsername(initialData.username);
            setDisplayName(initialData.displayName || '');
            setWorkspaceName(initialData.workspaceName || '');
            setErrors({});
            setTouched({});
            setServerError(null);
        }
    }, [initialData, isOpen]);

    // Validation logic
    const validateUsername = (val: string) => {
        if (!val) return 'Username is required';
        if (val.length < 3 || val.length > 30) return 'Username must be 3–30 characters.';
        if (!/^[a-z0-9_]+$/.test(val)) return 'Username can only contain lowercase letters, numbers, or underscores.';
        return undefined;
    };

    const validateDisplayName = (val: string) => {
        if (val && val.length > 50) return 'Display name cannot exceed 50 characters.';
        return undefined;
    };

    const validateWorkspaceName = (val: string) => {
        if (userRole === 'admin' && !val) return 'Workspace name is required';
        if (val && (val.length < 2 || val.length > 50)) return 'Workspace name must be 2–50 characters.';
        return undefined;
    };

    // Run validation on change/blur
    useEffect(() => {
        const newErrors: FormErrors = {};
        const uErr = validateUsername(username);
        if (uErr) newErrors.username = uErr;

        const dErr = validateDisplayName(displayName);
        if (dErr) newErrors.displayName = dErr;

        const wErr = validateWorkspaceName(workspaceName);
        if (wErr) newErrors.workspaceName = wErr;

        setErrors(newErrors);
    }, [username, displayName, workspaceName, userRole]);

    const hasChanges =
        username !== initialData.username ||
        displayName !== (initialData.displayName || '') ||
        workspaceName !== (initialData.workspaceName || '');

    const isValid = Object.keys(errors).length === 0;

    const handleSave = async () => {
        if (!isValid || !hasChanges || isSaving) return;

        setIsSaving(true);
        setServerError(null);

        try {
            await api.user.updateProfile(userId, {
                username: username !== initialData.username ? username : undefined,
                display_name: displayName !== (initialData.displayName || '') ? displayName : undefined,
                workspace_name: (userRole === 'admin' && workspaceName !== initialData.workspaceName) ? workspaceName : undefined
            });

            await refreshIdentity(userId);
            onSave();
            onClose();
        } catch (err: any) {
            setServerError(err.response?.data?.error || 'Something went wrong. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                        transition={{ duration: 0.3, ease: 'circOut' }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60"
                    />

                    {/* Modal Window */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 30, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.96, y: 20, filter: 'blur(10px)' }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 350,
                            mass: 0.8,
                            restDelta: 0.001
                        }}
                        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                                    <User className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tight">Edit Profile</h2>
                                    <p className="text-sm font-medium text-slate-400">Update your personal and workspace details.</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-90"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            {serverError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-600 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="w-5 h-5 shrink-0" />
                                    <p className="text-sm font-bold leading-tight">{serverError}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column: Identity */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                                        <User className="w-4 h-4" />
                                        Identity
                                    </div>

                                    {/* Username */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider ml-1">Username</label>
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within:text-indigo-500 transition-colors">@</div>
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                                                onBlur={() => handleBlur('username')}
                                                className={`w-full pl-9 pr-4 py-4 bg-slate-50 border-2 rounded-2xl text-sm font-bold focus:outline-none transition-all ${touched.username && errors.username
                                                    ? 'border-red-200 focus:border-red-400 text-red-600 bg-red-50/50'
                                                    : 'border-transparent focus:border-indigo-500 focus:bg-white'
                                                    }`}
                                                placeholder="username"
                                            />
                                        </div>
                                        {touched.username && errors.username && (
                                            <p className="text-[11px] font-bold text-red-500 flex items-center gap-1 mt-1 ml-1">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                {errors.username}
                                            </p>
                                        )}
                                    </div>

                                    {/* Display Name */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-600 uppercase tracking-wider ml-1">Display Name</label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            onBlur={() => handleBlur('displayName')}
                                            className={`w-full px-4 py-4 bg-slate-50 border-2 rounded-2xl text-sm font-bold focus:outline-none transition-all ${touched.displayName && errors.displayName
                                                ? 'border-red-200 focus:border-red-400 text-red-600 bg-red-50/50'
                                                : 'border-transparent focus:border-indigo-500 focus:bg-white'
                                                }`}
                                            placeholder="Your full name"
                                        />
                                        {touched.displayName && errors.displayName && (
                                            <p className="text-[11px] font-bold text-red-500 flex items-center gap-1 mt-1 ml-1">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                {errors.displayName}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Workspace */}
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                                        <Building2 className="w-4 h-4" />
                                        Workspace
                                    </div>

                                    {/* Workspace Name */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Name</label>
                                            {userRole !== 'admin' && (
                                                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                                                    <Lock className="w-2.5 h-2.5" />
                                                    ADMIN ONLY
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={workspaceName}
                                            onChange={(e) => setWorkspaceName(e.target.value)}
                                            onBlur={() => handleBlur('workspaceName')}
                                            disabled={userRole !== 'admin'}
                                            className={`w-full px-4 py-4 border-2 rounded-2xl text-sm font-bold focus:outline-none transition-all ${userRole !== 'admin'
                                                ? 'bg-slate-100 border-transparent text-slate-400 cursor-not-allowed italic font-medium'
                                                : touched.workspaceName && errors.workspaceName
                                                    ? 'border-red-200 focus:border-red-400 text-red-600 bg-red-50/50'
                                                    : 'bg-slate-50 border-transparent focus:border-indigo-500 focus:bg-white'
                                                }`}
                                            placeholder="Workspace Name"
                                        />
                                        {touched.workspaceName && errors.workspaceName && (
                                            <p className="text-[11px] font-bold text-red-500 flex items-center gap-1 mt-1 ml-1">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                {errors.workspaceName}
                                            </p>
                                        )}
                                    </div>

                                    {/* Platform Context (Badges) */}
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 opacity-60 grayscale">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Plan</p>
                                            <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{workspaceType || 'Solo'}</p>
                                        </div>
                                        <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 opacity-60 grayscale">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Role</p>
                                            <p className="text-xs font-black text-slate-700 uppercase tracking-tight">{userRole}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Info */}
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
                                <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                                    <Check className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-700 uppercase tracking-tight">Verified Account</p>
                                    <p className="text-xs font-medium text-slate-400 mt-0.5 lowercase">{userEmail}</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-8 border-t border-slate-100 bg-slate-50/30 flex items-center gap-4 sticky bottom-0">
                            <button
                                onClick={onClose}
                                className="px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl text-sm font-black text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || !isValid || isSaving}
                                className={`flex-1 px-8 py-4 rounded-2xl text-sm font-black text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${!hasChanges || !isValid || isSaving
                                    ? 'bg-slate-300 shadow-none cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                    }`}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Saving Changes...</span>
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-5 h-5" />
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
