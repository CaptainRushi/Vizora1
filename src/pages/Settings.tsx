import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSettings, ExplanationMode } from '../context/SettingsContext';
import {
    Check,
    Zap,
    Brain,
    BellRing,
    Lock,
    Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSection } from '../components/LoadingSection';

// Components
function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    icons
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    icons?: Record<string, React.ReactNode>;
}) {
    return (
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${value === option.value
                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    {icons?.[option.value]}
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function Toggle({
    enabled,
    onChange,
    disabled = false
}: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            onClick={() => !disabled && onChange(!enabled)}
            disabled={disabled}
            className={`relative w-12 h-7 rounded-full transition-all duration-300 ${enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${enabled ? 'left-6' : 'left-1'
                    }`}
            />
        </button>
    );
}

function SettingRow({
    label,
    description,
    children,
    badge
}: {
    label: string;
    description: string;
    children: React.ReactNode;
    badge?: string;
}) {
    return (
        <div className="flex items-start justify-between gap-6 py-5 border-b border-slate-100 dark:border-slate-800 last:border-0">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</span>
                    {badge && (
                        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">{description}</p>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

function SectionHeader({
    icon: Icon,
    title,
    description
}: {
    icon: any;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
            </div>
        </div>
    );
}

function SavedIndicator({ show }: { show: boolean }) {
    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-200 dark:shadow-emerald-900/20"
                >
                    <Check className="h-4 w-4" />
                    <span className="text-xs font-black uppercase tracking-widest">Saved</span>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function Settings() {
    const {
        settings,
        loading,
        updateInteraction,
        updateIntelligence,
        updateNotifications,
        updatePrivacy
    } = useSettings();

    const [isAdmin, setIsAdmin] = useState(false);
    const [showSaved, setShowSaved] = useState(false);
    const [localLoading, setLocalLoading] = useState(true);

    // Initial check for roles
    useEffect(() => {
        const checkRoles = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data: profile } = await supabase
                    .from('users')
                    .select('workspace_id')
                    .eq('id', user.id)
                    .single();

                if (profile?.workspace_id) {
                    const { data: member } = await supabase
                        .from('workspace_members')
                        .select('role')
                        .eq('workspace_id', profile.workspace_id)
                        .eq('user_id', user.id)
                        .single();

                    setIsAdmin(member?.role === 'admin');
                }
            } catch (err) {
                console.error('Failed to check roles:', err);
            } finally {
                setLocalLoading(false);
            }
        };

        checkRoles();
    }, []);

    const triggerFeedback = () => {
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
    };

    const handleInteractionChange = async (updates: any) => {
        await updateInteraction(updates);
        triggerFeedback();
    };

    const handleIntelligenceChange = async (updates: any) => {
        if (!isAdmin) return;
        await updateIntelligence(updates);
        triggerFeedback();
    };

    const handleNotificationChange = async (updates: any) => {
        await updateNotifications(updates);
        triggerFeedback();
    };

    const handlePrivacyChange = async (updates: any) => {
        if (!isAdmin) return;
        await updatePrivacy(updates);
        triggerFeedback();
    };

    if (loading || localLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <LoadingSection title="Loading Settings..." subtitle="Fetching your personalized platform preferences." />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-20 animate-in fade-in duration-500 px-6">
            <div className="mb-12">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Settings</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Personalize your Vizora experience.</p>
            </div>

            <div className="space-y-12">

                {/* 2. INTERACTION & MOTION */}
                <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                    <SectionHeader
                        icon={Zap}
                        title="Interaction & Motion"
                        description="Respect focus, performance, and accessibility."
                    />

                    <div className="space-y-2">
                        <SettingRow
                            label="Reduced Motion"
                            description="Disable floating cards and shorten animations for accessibility."
                        >
                            <Toggle
                                enabled={settings.interaction.reducedMotion}
                                onChange={(v) => handleInteractionChange({ reducedMotion: v })}
                            />
                        </SettingRow>

                        <SettingRow
                            label="Auto-Focus Schema Input"
                            description="Automatically focus the schema paste input when opening."
                        >
                            <Toggle
                                enabled={settings.interaction.autoFocusSchema}
                                onChange={(v) => handleInteractionChange({ autoFocusSchema: v })}
                            />
                        </SettingRow>
                    </div>
                </section>

                {/* 3. SCHEMA & INTELLIGENCE */}
                <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                    <SectionHeader
                        icon={Brain}
                        title="Schema & Intelligence"
                        description="Control how AI explains and processes your schemas."
                    />

                    <div className="space-y-2">
                        <SettingRow
                            label="AI Explanation Mode"
                            description="Affects Ask Schema, Onboarding Guide, and schema explanations."
                            badge={!isAdmin ? 'Admin Only' : undefined}
                        >
                            <select
                                value={settings.intelligence.explanationMode}
                                onChange={(e) => handleIntelligenceChange({ explanationMode: e.target.value as ExplanationMode })}
                                disabled={!isAdmin}
                                className="bg-slate-50 dark:bg-slate-800 border-0 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="developer">Developer (Deep Tech)</option>
                                <option value="pm">Product / PM (High Level)</option>
                                <option value="onboarding">Onboarding (Educational)</option>
                            </select>
                        </SettingRow>

                        <SettingRow
                            label="Evidence Strictness"
                            description="Strict mode requires exact schema evidence. Relaxed allows high-level explanations."
                            badge={!isAdmin ? 'Admin Only' : undefined}
                        >
                            <SegmentedControl
                                options={[
                                    { value: 'strict', label: 'Strict' },
                                    { value: 'relaxed', label: 'Relaxed' }
                                ]}
                                value={settings.intelligence.evidenceStrict ? 'strict' : 'relaxed'}
                                onChange={(v) => handleIntelligenceChange({ evidenceStrict: v === 'strict' })}
                            />
                        </SettingRow>

                        <SettingRow
                            label="Auto-Run Schema Review"
                            description="Automatically analyze schema for issues after paste."
                            badge={!isAdmin ? 'Admin Only' : undefined}
                        >
                            <Toggle
                                enabled={settings.intelligence.autoSchemaReview}
                                onChange={(v) => handleIntelligenceChange({ autoSchemaReview: v })}
                                disabled={!isAdmin}
                            />
                        </SettingRow>

                        <SettingRow
                            label="Auto-Generate Onboarding Guide"
                            description="Automatically generate onboarding guide after schema paste."
                            badge={!isAdmin ? 'Admin Only' : undefined}
                        >
                            <Toggle
                                enabled={settings.intelligence.autoOnboarding}
                                onChange={(v) => handleIntelligenceChange({ autoOnboarding: v })}
                                disabled={!isAdmin}
                            />
                        </SettingRow>
                    </div>
                </section>

                {/* 4. NOTIFICATIONS */}
                <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                    <SectionHeader
                        icon={BellRing}
                        title="Notifications"
                        description="Stay informed without interruption."
                    />

                    <div className="space-y-2">
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Email Notifications</div>

                        <SettingRow
                            label="Schema Changes"
                            description="Receive emails when team members update schemas."
                        >
                            <Toggle
                                enabled={settings.notifications.emailSchemaChanges}
                                onChange={(v) => handleNotificationChange({ emailSchemaChanges: v })}
                            />
                        </SettingRow>

                        <SettingRow
                            label="Team Member Actions"
                            description="Get notified when team members join or leave."
                        >
                            <Toggle
                                enabled={settings.notifications.emailTeamActivity}
                                onChange={(v) => handleNotificationChange({ emailTeamActivity: v })}
                            />
                        </SettingRow>

                        <SettingRow
                            label="AI Usage Summary"
                            description="Weekly digest of AI feature usage."
                        >
                            <Toggle
                                enabled={settings.notifications.emailAiSummary}
                                onChange={(v) => handleNotificationChange({ emailAiSummary: v })}
                            />
                        </SettingRow>

                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-4" />
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">In-App Notifications</div>

                        <SettingRow
                            label="Schema Version Added"
                            description="Show notification when a new schema version is added."
                        >
                            <Toggle
                                enabled={settings.notifications.inappSchema}
                                onChange={(v) => handleNotificationChange({ inappSchema: v })}
                            />
                        </SettingRow>

                        <SettingRow
                            label="Team Member Joined"
                            description="Show notification when someone joins your workspace."
                        >
                            <Toggle
                                enabled={settings.notifications.inappTeam}
                                onChange={(v) => handleNotificationChange({ inappTeam: v })}
                            />
                        </SettingRow>
                    </div>
                </section>

                {/* 5. PRIVACY & SAFETY */}
                <section className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm">
                    <SectionHeader
                        icon={Lock}
                        title="Privacy & Safety"
                        description="Control how your data is handled."
                    />

                    <div className="space-y-2">
                        <SettingRow
                            label="Schema Retention"
                            description="Retain all schema versions or auto-delete older versions beyond plan limit."
                            badge={!isAdmin ? 'Admin Only' : undefined}
                        >
                            <SegmentedControl
                                options={[
                                    { value: 'all', label: 'Retain All' },
                                    { value: 'limit', label: 'Auto-Delete' }
                                ]}
                                value={settings.privacy.retainAllVersions ? 'all' : 'limit'}
                                onChange={(v) => handlePrivacyChange({ retainAllVersions: v === 'all' })}
                            />
                        </SettingRow>

                        <div className="mt-8 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">AI Data Usage</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Schemas are used only to generate diagrams and explanations.
                                        No schema is shared with other users. Your data remains private
                                        and is processed securely within our infrastructure.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <SavedIndicator show={showSaved} />
        </div>
    );
}
