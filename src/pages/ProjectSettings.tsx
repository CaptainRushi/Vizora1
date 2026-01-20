import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Settings,
    Database,
    Brain,
    Trash2,
    Save,
    CheckCircle2,
    Activity,
    Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useProjectContext } from '../context/ProjectContext';
import { useWorkspaceRole } from '../hooks/useWorkspaceRole';


interface ProjectSettingsState {
    general: {
        name: string;
        description: string;
        status: 'active' | 'archived';
    };
    schema: {
        input_mode: 'sql' | 'prisma' | 'mixed';
        auto_version: boolean;
        version_naming: 'auto' | 'timestamp' | 'custom';
    };
    intelligence: {
        explanation_depth: 'concise' | 'detailed';
        evidence_strict: boolean;
        auto_review: boolean;
        auto_onboarding: boolean;
    };
    members: any[];
}

export function ProjectSettings() {
    const navigate = useNavigate();
    const { projectId, project: projectInfo, refreshProject } = useProjectContext();
    const { isAdmin } = useWorkspaceRole({ workspaceId: projectInfo?.workspace_id });

    const [settings, setSettings] = useState<ProjectSettingsState | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSaved, setShowSaved] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');

    useEffect(() => {
        if (projectId) {
            fetchSettings();
        }
    }, [projectId]);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const data = await api.projectSettings.getAll(projectId!);
            setSettings(data);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGeneral = async () => {
        if (!settings || !projectId) return;
        setSaving(true);
        try {
            await api.projectSettings.updateGeneral(projectId, settings.general);
            triggerSaved();
            refreshProject(); // Update sidebar name
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSchema = async () => {
        if (!settings || !projectId) return;
        setSaving(true);
        try {
            await api.projectSettings.updateSchema(projectId, settings.schema);
            triggerSaved();
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveIntelligence = async () => {
        if (!settings || !projectId) return;
        setSaving(true);
        try {
            await api.projectSettings.updateIntelligence(projectId, settings.intelligence);
            triggerSaved();
        } catch (err) {
            console.error('Save failed:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProject = async () => {
        if (deleteConfirm !== settings?.general.name) return;
        try {
            await api.projectSettings.deleteProject(projectId!);
            navigate('/dashboard');
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const triggerSaved = () => {
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
    };

    if (loading || !settings) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-5">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                            <Settings className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 dark:text-white">Project Settings</h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Manage behavior and configuration for <span className="font-bold text-indigo-500">{settings.general.name}</span></p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <AnimatePresence>
                            {showSaved && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-bold bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-900/30"
                                >
                                    <CheckCircle2 className="h-4 w-4" />
                                    Changes Saved
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-8 pt-10 space-y-8">

                {/* 1. GENERAL */}
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">General Information</h2>
                        </div>
                        <button
                            onClick={handleSaveGeneral}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                        >
                            <Save className="h-4 w-4" />
                            Save Changes
                        </button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Project Name</label>
                                <input
                                    type="text"
                                    value={settings.general.name}
                                    onChange={e => setSettings({ ...settings, general: { ...settings.general, name: e.target.value } })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all"
                                    placeholder="Enter project name"
                                />
                                <p className="text-xs text-slate-400 font-medium italic">This affects the sidebar, exports, and document titles.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Project Status</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setSettings({ ...settings, general: { ...settings.general, status: 'active' } })}
                                        className={`px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${settings.general.status === 'active' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200'}`}
                                    >
                                        <Activity className="h-4 w-4" />
                                        Active
                                    </button>
                                    <button
                                        onClick={() => setSettings({ ...settings, general: { ...settings.general, status: 'archived' } })}
                                        className={`px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-center gap-2 ${settings.general.status === 'archived' ? 'border-amber-600 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200'}`}
                                    >
                                        <Archive className="h-4 w-4" />
                                        Archived
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Project Description</label>
                            <textarea
                                value={settings.general.description}
                                onChange={e => setSettings({ ...settings, general: { ...settings.general, description: e.target.value } })}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white transition-all h-24 resize-none"
                                placeholder="What is this project about?"
                            />
                        </div>
                    </div>
                </section>

                {/* 2. SCHEMA BEHAVIOR */}
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Database className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Schema Behavior</h2>
                        </div>
                        <button
                            onClick={handleSaveSchema}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                        >
                            <Save className="h-4 w-4" />
                            Save Changes
                        </button>
                    </div>
                    <div className="p-8 space-y-8">
                        <div>
                            <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-4">Schema Input Mode</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { id: 'sql', label: 'SQL Only', desc: 'Optimized for raw SQL files' },
                                    { id: 'prisma', label: 'Prisma Only', desc: 'Tailored for .prisma models' },
                                    { id: 'mixed', label: 'Mixed Mode', desc: 'Attempts to auto-detect format' }
                                ].map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setSettings({ ...settings, schema: { ...settings.schema, input_mode: mode.id as any } })}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${settings.schema.input_mode === mode.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-inner' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                                    >
                                        <div className={`font-black text-sm mb-1 ${settings.schema.input_mode === mode.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{mode.label}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-500 leading-tight">{mode.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div>
                                <div className="font-bold text-slate-900 dark:text-white">Auto Versioning</div>
                                <div className="text-xs text-slate-500 italic">Automatically creates a new schema version whenever you paste code.</div>
                            </div>
                            <button
                                onClick={() => setSettings({ ...settings, schema: { ...settings.schema, auto_version: !settings.schema.auto_version } })}
                                className={`w-12 h-6 rounded-full transition-colors relative ${settings.schema.auto_version ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.schema.auto_version ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div>
                            <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-4">Version Naming Style</label>
                            <div className="flex flex-wrap gap-3">
                                {['auto', 'timestamp', 'custom'].map(style => (
                                    <button
                                        key={style}
                                        onClick={() => setSettings({ ...settings, schema: { ...settings.schema, version_naming: style as any } })}
                                        className={`px-4 py-2 rounded-lg border-2 font-bold text-sm capitalize transition-all ${settings.schema.version_naming === style ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. INTELLIGENCE & AI */}
                <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Brain className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Intelligence & AI</h2>
                        </div>
                        <button
                            onClick={handleSaveIntelligence}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                        >
                            <Save className="h-4 w-4" />
                            Save Changes
                        </button>
                    </div>
                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">AI Explanation Depth</label>
                                <div className="space-y-3">
                                    {[
                                        { id: 'concise', label: 'Concise Mode', desc: 'Brief, technical summaries' },
                                        { id: 'detailed', label: 'Detailed Mode', desc: 'Thorough breakdowns with context' }
                                    ].map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setSettings({ ...settings, intelligence: { ...settings.intelligence, explanation_depth: mode.id as any } })}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${settings.intelligence.explanation_depth === mode.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-inner' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className={`font-black text-sm ${settings.intelligence.explanation_depth === mode.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{mode.label}</div>
                                                {settings.intelligence.explanation_depth === mode.id && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">{mode.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Evidence Strictness</label>
                                <div className="space-y-3">
                                    {[
                                        { id: true, label: 'Strict Mode', desc: 'AI must cite specific tables & columns' },
                                        { id: false, label: 'Relaxed Mode', desc: 'Allows high-level conceptual summaries' }
                                    ].map(mode => (
                                        <button
                                            key={String(mode.id)}
                                            onClick={() => setSettings({ ...settings, intelligence: { ...settings.intelligence, evidence_strict: mode.id } })}
                                            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${settings.intelligence.evidence_strict === mode.id ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 shadow-inner' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className={`font-black text-sm ${settings.intelligence.evidence_strict === mode.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{mode.label}</div>
                                                {settings.intelligence.evidence_strict === mode.id && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">{mode.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white text-sm">Auto Schema Review</div>
                                    <div className="text-xs text-slate-500 italic leading-tight">Run AI review on every version</div>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, intelligence: { ...settings.intelligence, auto_review: !settings.intelligence.auto_review } })}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${settings.intelligence.auto_review ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings.intelligence.auto_review ? 'left-5.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white text-sm">Auto Onboarding Guide</div>
                                    <div className="text-xs text-slate-500 italic leading-tight">Regenerate guide automatically</div>
                                </div>
                                <button
                                    onClick={() => setSettings({ ...settings, intelligence: { ...settings.intelligence, auto_onboarding: !settings.intelligence.auto_onboarding } })}
                                    className={`w-10 h-5 rounded-full transition-colors relative ${settings.intelligence.auto_onboarding ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'}`}
                                >
                                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${settings.intelligence.auto_onboarding ? 'left-5.5' : 'left-0.5'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>




                {/* 5. DATA & RETENTION / DANGER ZONE */}
                {
                    isAdmin && (
                        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 flex items-center gap-3">
                                <Trash2 className="h-5 w-5 text-red-500" />
                                <h2 className="text-lg font-bold text-red-650 dark:text-red-400">Danger Zone</h2>
                            </div>
                            <div className="p-8 space-y-8">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="font-bold text-slate-900 dark:text-white">Schema Version Retention</div>
                                        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-500 uppercase">Unlimited</span>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
                                        We currently keep all versions of your schema. You can manually archive old versions to clean up your timeline, but they will remain viewable in the history.
                                    </p>
                                </div>

                                <div className="pt-6 border-t border-red-50 dark:border-red-900/20">
                                    <div className="mb-6">
                                        <h3 className="text-red-600 dark:text-red-400 font-black mb-1 uppercase tracking-tight">Delete this project</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                            Once deleted, all schema versions, AI logs, diagrams, and historical data associated with this project will be permanently removed. This action cannot be undone.
                                        </p>
                                    </div>

                                    <div className="flex flex-col md:flex-row items-end gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-xs font-black text-slate-400 uppercase">Type <span className="text-slate-900 dark:text-white select-none">{settings.general.name}</span> to confirm</label>
                                            <input
                                                type="text"
                                                value={deleteConfirm}
                                                onChange={e => setDeleteConfirm(e.target.value)}
                                                className="w-full px-4 py-3 bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-red-600 placeholder:text-red-200"
                                                placeholder="Confirm project name"
                                            />
                                        </div>
                                        <button
                                            onClick={handleDeleteProject}
                                            disabled={deleteConfirm !== settings.general.name}
                                            className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:grayscale text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-red-200 dark:shadow-none min-w-[160px]"
                                        >
                                            Delete Project
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )
                }

                <div className="flex items-center justify-center gap-8 py-10 opacity-40">
                    <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1" />
                    <div className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">Vizora Core Settings</div>
                    <div className="h-px bg-slate-300 dark:bg-slate-700 flex-1" />
                </div>
            </div >
        </div >
    );
}
