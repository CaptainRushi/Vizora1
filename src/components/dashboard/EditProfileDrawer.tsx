import { useState, useEffect } from 'react';
import { X, User, Building2, Lock, Check, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface EditProfileDrawerProps {
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

export function EditProfileDrawer({
    isOpen,
    onClose,
    onSave,
    userId,
    userEmail,
    workspaceId,
    workspaceType,
    userRole,
    initialData
}: EditProfileDrawerProps) {
    // Form state
    const [username, setUsername] = useState(initialData.username);
    const [displayName, setDisplayName] = useState(initialData.displayName);
    const [workspaceName, setWorkspaceName] = useState(initialData.workspaceName);

    // UI state
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [serverError, setServerError] = useState<string | null>(null);

    // Reset form when initial data changes
    useEffect(() => {
        setUsername(initialData.username);
        setDisplayName(initialData.displayName);
        setWorkspaceName(initialData.workspaceName);
        setErrors({});
        setSaveSuccess(false);
        setServerError(null);
    }, [initialData, isOpen]);

    // Can edit workspace name?
    const canEditWorkspace = userRole === 'admin' && workspaceId;

    // ============================
    // VALIDATION
    // ============================
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Username validation
        if (username.trim()) {
            const trimmed = username.trim();
            if (trimmed.length < 3) {
                newErrors.username = 'Username must be at least 3 characters';
            } else if (trimmed.length > 30) {
                newErrors.username = 'Username must be at most 30 characters';
            } else if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
                newErrors.username = 'Only letters, numbers, and underscores allowed';
            }
        }

        // Workspace name validation (only if editing)
        if (canEditWorkspace && workspaceName.trim()) {
            const trimmed = workspaceName.trim();
            if (trimmed.length < 2) {
                newErrors.workspaceName = 'Workspace name must be at least 2 characters';
            } else if (trimmed.length > 50) {
                newErrors.workspaceName = 'Workspace name must be at most 50 characters';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // ============================
    // SAVE HANDLER
    // ============================
    const handleSave = async () => {
        if (!validateForm()) return;

        setIsSaving(true);
        setServerError(null);
        setSaveSuccess(false);

        try {
            const payload: any = {
                userId
            };

            // Only include changed fields
            if (username.trim() !== initialData.username) {
                payload.username = username.trim();
            }
            if (displayName.trim() !== initialData.displayName) {
                payload.display_name = displayName.trim();
            }
            if (canEditWorkspace && workspaceName.trim() !== initialData.workspaceName) {
                payload.workspace_name = workspaceName.trim();
                payload.workspaceId = workspaceId;
            }

            // Only call API if there are changes
            if (Object.keys(payload).length > 1) {
                const result = await api.dashboard.updateProfile(payload);

                if (result.success) {
                    setSaveSuccess(true);
                    setTimeout(() => {
                        onSave();
                        onClose();
                    }, 1000);
                }
            } else {
                // No changes
                onClose();
            }
        } catch (err: any) {
            const errorData = err.response?.data;

            if (errorData?.errors) {
                // Field-level validation errors from server
                const serverErrors: FormErrors = {};
                if (errorData.errors.username) serverErrors.username = errorData.errors.username;
                if (errorData.errors.workspace_name) serverErrors.workspaceName = errorData.errors.workspace_name;
                setErrors(serverErrors);
            } else if (errorData?.error) {
                setServerError(errorData.error);
            } else {
                setServerError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    // ============================
    // KEYBOARD HANDLERS
    // ============================
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSave();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200"
                onKeyDown={handleKeyDown}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Edit Profile</h2>
                                <p className="text-indigo-200 text-sm mt-0.5">
                                    Update your personal and workspace info
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                    {/* Success Message */}
                    {saveSuccess && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
                            <Check className="w-5 h-5" />
                            <span className="font-medium">Profile updated successfully.</span>
                        </div>
                    )}

                    {/* Server Error */}
                    {serverError && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">{serverError}</span>
                        </div>
                    )}

                    {/* Personal Info Section */}
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <User className="w-4 h-4" />
                        Personal Information
                    </div>

                    {/* Username Field */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                if (errors.username) {
                                    setErrors(prev => ({ ...prev, username: undefined }));
                                }
                            }}
                            placeholder="your_username"
                            className={`w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${errors.username
                                ? 'border-red-300 focus:ring-red-500 bg-red-50'
                                : 'border-gray-200 focus:ring-indigo-500 focus:border-indigo-500'
                                }`}
                        />
                        {errors.username && (
                            <p className="text-sm text-red-600 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                {errors.username}
                            </p>
                        )}
                        <p className="text-xs text-gray-400">
                            3-30 characters. Letters, numbers, and underscores only.
                        </p>
                    </div>

                    {/* Display Name Field */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700">
                            Display Name
                            <span className="ml-2 text-xs font-normal text-gray-400">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Your name or role"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    {/* Read-Only Section */}
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider pt-2 border-t border-gray-100">
                        <Lock className="w-4 h-4" />
                        Read-Only
                    </div>

                    {/* Email (Read-Only) */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-500">
                            Email
                        </label>
                        <div className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 lowercase">
                            {userEmail}
                        </div>
                    </div>

                    {/* Workspace Section */}
                    {workspaceId && (
                        <>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider pt-2 border-t border-gray-100">
                                <Building2 className="w-4 h-4" />
                                Workspace
                                {!canEditWorkspace && (
                                    <span className="ml-auto text-[10px] px-2 py-0.5 bg-gray-100 rounded-full normal-case">
                                        Admin only
                                    </span>
                                )}
                            </div>

                            {/* Workspace Name */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Workspace Name
                                </label>
                                {canEditWorkspace ? (
                                    <>
                                        <input
                                            type="text"
                                            value={workspaceName}
                                            onChange={(e) => {
                                                setWorkspaceName(e.target.value);
                                                if (errors.workspaceName) {
                                                    setErrors(prev => ({ ...prev, workspaceName: undefined }));
                                                }
                                            }}
                                            placeholder="Your workspace or company name"
                                            className={`w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 transition-all ${errors.workspaceName
                                                ? 'border-red-300 focus:ring-red-500 bg-red-50'
                                                : 'border-gray-200 focus:ring-indigo-500 focus:border-indigo-500'
                                                }`}
                                        />
                                        {errors.workspaceName && (
                                            <p className="text-sm text-red-600 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" />
                                                {errors.workspaceName}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-500">
                                        {workspaceName || 'No workspace name set'}
                                    </div>
                                )}
                            </div>

                            {/* Info row */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-400">Type</label>
                                    <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600 capitalize">
                                        {workspaceType === 'team' ? 'Team' : 'Solo'}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-gray-400">Role</label>
                                    <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600 capitalize">
                                        {userRole}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="flex-1 px-4 py-3 text-gray-700 font-medium bg-white border border-gray-200 rounded-xl hover:bg-gray-100 disabled:opacity-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || saveSuccess}
                            className="flex-1 px-4 py-3 text-white font-bold bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : saveSuccess ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Saved!
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
