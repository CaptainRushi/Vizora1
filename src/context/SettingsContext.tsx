import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

export type ColorMode = 'light' | 'dark' | 'system';
export type DiagramTheme = 'light' | 'dark' | 'auto';
export type ExplanationMode = 'developer' | 'pm' | 'onboarding';

interface SettingsState {
    appearance: {
        colorMode: ColorMode;
        diagramTheme: DiagramTheme;
    };
    interaction: {
        reducedMotion: boolean;
        autoFocusSchema: boolean;
    };
    intelligence: {
        explanationMode: ExplanationMode;
        evidenceStrict: boolean;
        autoSchemaReview: boolean;
        autoOnboarding: boolean;
    };
    notifications: {
        emailSchemaChanges: boolean;
        emailTeamActivity: boolean;
        emailAiSummary: boolean;
        inappSchema: boolean;
        inappTeam: boolean;
    };
    privacy: {
        retainAllVersions: boolean;
    };
}

interface SettingsContextType {
    settings: SettingsState;
    loading: boolean;
    updateAppearance: (updates: Partial<SettingsState['appearance']>) => Promise<void>;
    updateInteraction: (updates: Partial<SettingsState['interaction']>) => Promise<void>;
    updateIntelligence: (updates: Partial<SettingsState['intelligence']>) => Promise<void>;
    updateNotifications: (updates: Partial<SettingsState['notifications']>) => Promise<void>;
    updatePrivacy: (updates: Partial<SettingsState['privacy']>) => Promise<void>;
    refreshSettings: () => Promise<void>;
}

const DEFAULT_SETTINGS: SettingsState = {
    appearance: { colorMode: 'light', diagramTheme: 'auto' },
    interaction: { reducedMotion: false, autoFocusSchema: true },
    intelligence: { explanationMode: 'developer', evidenceStrict: true, autoSchemaReview: true, autoOnboarding: true },
    notifications: { emailSchemaChanges: true, emailTeamActivity: false, emailAiSummary: false, inappSchema: true, inappTeam: true },
    privacy: { retainAllVersions: true }
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    const loadSettings = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }
            setUserId(user.id);

            const { data: profile } = await supabase
                .from('users')
                .select('workspace_id')
                .eq('id', user.id)
                .single();

            const wsId = profile?.workspace_id;
            setWorkspaceId(wsId);

            const data = await api.settings.getAll(user.id, wsId);

            setSettings({
                appearance: {
                    colorMode: data.appearance?.color_mode || 'light',
                    diagramTheme: data.appearance?.diagram_theme || 'auto'
                },
                interaction: {
                    reducedMotion: data.interaction?.reduced_motion || false,
                    autoFocusSchema: data.interaction?.auto_focus_schema ?? true
                },
                intelligence: {
                    explanationMode: data.intelligence?.explanation_mode || 'developer',
                    evidenceStrict: data.intelligence?.evidence_strict ?? true,
                    autoSchemaReview: data.intelligence?.auto_schema_review ?? true,
                    autoOnboarding: data.intelligence?.auto_onboarding ?? true
                },
                notifications: {
                    emailSchemaChanges: data.notifications?.email_schema_changes ?? true,
                    emailTeamActivity: data.notifications?.email_team_activity ?? false,
                    emailAiSummary: data.notifications?.email_ai_summary ?? false,
                    inappSchema: data.notifications?.inapp_schema ?? true,
                    inappTeam: data.notifications?.inapp_team ?? true
                },
                privacy: {
                    retainAllVersions: data.privacy?.retain_all_versions ?? true
                }
            });
        } catch (err) {
            console.error('Failed to load settings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    // Apply motion settings to DOM
    useEffect(() => {
        const root = document.documentElement;
        if (settings.interaction.reducedMotion) {
            root.classList.add('reduce-motion');
            root.style.setProperty('--motion-duration-multiplier', '0');
        } else {
            root.classList.remove('reduce-motion');
            root.style.setProperty('--motion-duration-multiplier', '1');
        }
    }, [settings.interaction.reducedMotion]);

    const updateAppearance = async (updates: Partial<SettingsState['appearance']>) => {
        if (!userId) return;

        // Optimistic update
        setSettings(prev => ({
            ...prev,
            appearance: { ...prev.appearance, ...updates }
        }));

        try {
            await api.settings.updateAppearance(userId, {
                color_mode: updates.colorMode,
                diagram_theme: updates.diagramTheme
            });
        } catch (err) {
            console.error('Failed to update appearance:', err);
            // Revert on error if needed, but usually we trust the next fetch or local state
        }
    };

    const updateInteraction = async (updates: Partial<SettingsState['interaction']>) => {
        if (!userId) return;
        setSettings(prev => ({
            ...prev,
            interaction: { ...prev.interaction, ...updates }
        }));
        try {
            await api.settings.updateInteraction(userId, {
                reduced_motion: updates.reducedMotion,
                auto_focus_schema: updates.autoFocusSchema
            });
        } catch (err) {
            console.error('Failed to update interaction:', err);
        }
    };

    const updateIntelligence = async (updates: Partial<SettingsState['intelligence']>) => {
        if (!workspaceId) return;
        setSettings(prev => ({
            ...prev,
            intelligence: { ...prev.intelligence, ...updates }
        }));
        try {
            await api.settings.updateIntelligence(workspaceId, {
                explanation_mode: updates.explanationMode,
                evidence_strict: updates.evidenceStrict,
                auto_schema_review: updates.autoSchemaReview,
                auto_onboarding: updates.autoOnboarding
            });
        } catch (err) {
            console.error('Failed to update intelligence:', err);
        }
    };

    const updateNotifications = async (updates: Partial<SettingsState['notifications']>) => {
        if (!userId) return;
        setSettings(prev => ({
            ...prev,
            notifications: { ...prev.notifications, ...updates }
        }));
        try {
            await api.settings.updateNotifications(userId, {
                email_schema_changes: updates.emailSchemaChanges,
                email_team_activity: updates.emailTeamActivity,
                email_ai_summary: updates.emailAiSummary,
                inapp_schema: updates.inappSchema,
                inapp_team: updates.inappTeam
            });
        } catch (err) {
            console.error('Failed to update notifications:', err);
        }
    };

    const updatePrivacy = async (updates: Partial<SettingsState['privacy']>) => {
        if (!workspaceId) return;
        setSettings(prev => ({
            ...prev,
            privacy: { ...prev.privacy, ...updates }
        }));
        try {
            await api.settings.updatePrivacy(workspaceId, {
                retain_all_versions: updates.retainAllVersions
            });
        } catch (err) {
            console.error('Failed to update privacy:', err);
        }
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            loading,
            updateAppearance,
            updateInteraction,
            updateIntelligence,
            updateNotifications,
            updatePrivacy,
            refreshSettings: loadSettings
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
