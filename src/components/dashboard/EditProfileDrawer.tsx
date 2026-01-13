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
        <>
            {/* Backdrop - Fade in */}
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 animate-fadeIn"
                onClick={onClose}
            />

            {/* Drawer - Slide in from right */}
            <div
                className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 animate-slideInRight"
                onKeyDown={handleKeyDown}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Edit Profile</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Update your personal and workspace identity.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto" style={{ height: 'calc(100% - 180px)' }}>
                    {/* Success Message */}
                    {saveSuccess && (
                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 animate-scaleIn">
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

                    {/* Editable Section Header */}
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
                            <p className="text-sm text-red-600 flex items-center gap-1 animate-shake">
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
                        <p className="text-xs text-gray-400">
                            Shown alongside your username in team contexts.
                        </p>
                    </div>

                    {/* Read-Only Section Header */}
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider pt-4 border-t border-gray-100">
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
                        <p className="text-xs text-gray-400">
                            Email cannot be changed.
                        </p>
                    </div>

                    {/* Workspace Section */}
                    {workspaceId && (
                        <>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider pt-4 border-t border-gray-100">
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
                                        <p className="text-xs text-gray-400">
                                            2-50 characters.
                                        </p>
                                    </>
                                ) : (
                                    <div className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-500">
                                        {workspaceName || 'No workspace name set'}
                                    </div>
                                )}
                            </div>

                            {/* Workspace Type (Read-Only) */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-500">
                                    Workspace Type
                                </label>
                                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 capitalize">
                                    {workspaceType === 'team' ? 'Team Workspace' : 'Solo Workspace'}
                                </div>
                            </div>

                            {/* Role (Read-Only) */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-gray-500">
                                    Your Role
                                </label>
                                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 capitalize">
                                    {userRole}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            disabled={isSaving}
                            className="flex-1 px-4 py-3 text-gray-700 font-medium bg-gray-100 rounded-xl btn-motion hover:bg-gray-200 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || saveSuccess}
                            className="flex-1 px-4 py-3 text-white font-bold bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl btn-motion hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
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
                                'Save changes'
                            )}
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-3">
                        Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">⌘ Enter</kbd> to save
                    </p>
                </div>
            </div>
        </>
    );
}
