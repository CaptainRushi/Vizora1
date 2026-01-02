import { useState, useEffect } from 'react';
import { useProject } from '../hooks/useProject';
import { api } from '../lib/api';
import { Settings as SettingsIcon, Save, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

interface ProjectSettings {
    explanation_mode: 'developer' | 'pm' | 'onboarding';
    auto_generate_docs: boolean;
    retain_all_versions: boolean;
}

export function Settings() {
    const { projectId, loading: projectLoading } = useProject();
    const [settings, setSettings] = useState<ProjectSettings | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchSettings = async () => {
        if (!projectId) return;
        try {
            const data = await api.getSettings(projectId);
            if (data) setSettings(data);
        } catch (err) {
            console.error("Settings fetch error:", err);
        }
    };

    useEffect(() => {
        if (projectLoading) return;
        if (!projectId) {
            return;
        }
        fetchSettings();
    }, [projectId, projectLoading]);

    const handleSave = async () => {
        if (!projectId || !settings) return;
        setSaving(true);
        setMessage(null);

        try {
            await api.updateSettings(projectId, settings);
            setMessage({ type: 'success', text: 'Behavioral settings synchronized.' });
        } catch (err: any) {
            console.error("Save error:", err);
            setMessage({ type: 'error', text: 'Failed to update settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (projectLoading) return null;

    return (
        <div className="mx-auto max-w-2xl space-y-12 pb-20 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                        <SettingsIcon className="h-6 w-6 text-white" />
                    </div>
                    Behavior Control
                </h2>
                <p className="mt-2 text-gray-500 font-medium">
                    Fine-tune how the platform analyzes and persists your architectural data.
                </p>
            </div>

            <div className="space-y-8">
                {/* AI / Automation */}
                <div className="rounded-[2.5rem] border-4 border-gray-50 bg-white p-10 shadow-2xl shadow-gray-200/50">
                    <h3 className="flex items-center gap-2 text-xl font-black text-gray-900 mb-8">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        Intelligence Engine
                    </h3>
                    <div className="space-y-8">
                        <div className="flex items-center justify-between gap-6">
                            <div>
                                <label className="text-sm font-black text-gray-900 uppercase tracking-widest block mb-1">Architecture Persona</label>
                                <p className="text-xs text-gray-500 font-medium">Controls the tone and depth of AI generated explanations.</p>
                            </div>
                            <select
                                value={settings?.explanation_mode || 'developer'}
                                onChange={(e) => settings && setSettings({ ...settings, explanation_mode: e.target.value as any })}
                                className="bg-gray-50 border-0 rounded-xl px-4 py-3 text-xs font-bold text-gray-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            >
                                <option value="developer">Developer (Deep Tech)</option>
                                <option value="pm">Project Manager (High Level)</option>
                                <option value="onboarding">Tutorial (Educational)</option>
                            </select>
                        </div>

                        <div className="h-px bg-gray-50" />

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-black text-gray-900 uppercase tracking-widest block mb-1">Auto-Sync Artifacts</label>
                                <p className="text-xs text-gray-500 font-medium font-medium">Generate fresh PDF documentation immediately after every schema ingest.</p>
                            </div>
                            <button
                                onClick={() => settings && setSettings({ ...settings, auto_generate_docs: !settings.auto_generate_docs })}
                                className={`w-14 h-8 rounded-full transition-all relative ${settings?.auto_generate_docs ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings?.auto_generate_docs ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-black text-gray-900 uppercase tracking-widest block mb-1">Retain Immutable History</label>
                                <p className="text-xs text-gray-500 font-medium">Keep every single version ever pasted. Disable to only keep the last 20 snapshots.</p>
                            </div>
                            <button
                                onClick={() => settings && setSettings({ ...settings, retain_all_versions: !settings.retain_all_versions })}
                                className={`w-14 h-8 rounded-full transition-all relative ${settings?.retain_all_versions ? 'bg-indigo-600' : 'bg-gray-200'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings?.retain_all_versions ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`rounded-2xl p-6 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 ${message.type === 'success' ? 'bg-green-50 text-green-700 border-2 border-green-100' : 'bg-red-50 text-red-700 border-2 border-red-100'}`}>
                    <div className={`p-2 rounded-lg ${message.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {message.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
                    </div>
                    <p className="text-sm font-black uppercase tracking-widest">{message.text}</p>
                </div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving || !settings}
                    className="group flex items-center gap-3 rounded-[2rem] bg-gray-900 px-12 py-5 text-xs font-black text-white hover:bg-black shadow-2xl shadow-gray-900/20 transition-all active:scale-95 disabled:opacity-50"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Save className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />}
                    COMMIT SYSTEM PARAMETERS
                </button>
            </div>
        </div>
    );
}
