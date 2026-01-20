
import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const API_BASE_URL = rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl;

axios.defaults.timeout = 60000; // 60s timeout for AI operations

// Export for direct usage
export const BACKEND_URL = API_BASE_URL;

export const api = {
    createProject: async (name: string, schema_type: string, workspace_id: string, user_id?: string) => {
        const res = await axios.post(`${API_BASE_URL}/projects`, { name, schema_type, workspace_id, user_id });
        return res.data;
    },
    ingestSchema: async (projectId: string, raw_schema: string, user_id?: string) => {
        const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/schema`, { raw_schema, user_id });
        return res.data;
    },
    generateDiagram: async (projectId: string) => {
        const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/diagram`);
        return res.data;
    },
    generateExplanation: async (projectId: string) => {
        const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/explanation`);
        return res.data;
    },
    generatePdf: async (projectId: string) => {
        const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/docs`);
        return res.data;
    },
    generateDocs: async (projectId: string, version: number) => {
        const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/docs`, { version });
        return res.data;
    },
    getVersions: async (projectId: string) => {
        const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/versions`);
        return res.data;
    },
    compareVersions: async (projectId: string, from: number, to: number) => {
        const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/compare`, { from_version: from, to_version: to });
        return res.data;
    },
    getSettings: async (projectId: string) => {
        const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/settings`);
        return res.data;
    },
    updateSettings: async (projectId: string, settings: any) => {
        const res = await axios.patch(`${API_BASE_URL}/projects/${projectId}/settings`, settings);
        return res.data;
    },
    updateSchema: async (projectId: string, normalized_schema: any, user_id?: string) => {
        const res = await axios.put(`${API_BASE_URL}/projects/${projectId}/normalized-schema`, { normalized_schema, user_id });
        return res.data;
    },
    deleteProject: async (projectId: string) => {
        const res = await axios.delete(`${API_BASE_URL}/projects/${projectId}`);
        return res.data;
    },
    getBilling: async (projectId: string) => {
        const res = await axios.get(`${API_BASE_URL}/projects/${projectId}/billing`);
        return res.data;
    },
    unlockPlan: async (projectId: string, planId: string) => {
        const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/billing/unlock`, { plan_id: planId });
        return res.data;
    },
    getAppearance: async (_projectId?: string) => {
        // Placeholder for global or user-level appearance settings
        return { theme: 'light' };
    },
    updateAppearance: async (_projectId: string, _appearance: any) => {
        // Placeholder for updating appearance
        return { success: true };
    },
    // Beta Endpoints
    betaConfig: async () => {
        const res = await axios.get(`${API_BASE_URL}/beta/config`);
        return res.data;
    },
    betaUsage: async (userId: string) => {
        const res = await axios.get(`${API_BASE_URL}/beta/usage/${userId}`);
        return res.data;
    },
    submitFeedback: async (feedback: {
        user_id: string;
        project_id?: string;
        context: string;
        rating: number;
        confusing?: string;
        helpful?: string;
        missing?: string;
    }) => {
        const res = await axios.post(`${API_BASE_URL}/feedback/submit`, feedback);
        return res.data;
    },
    // Intelligence APIs
    BACKEND_URL: API_BASE_URL,
    getSchemaReview: async (projectId: string, userId?: string) => {
        const res = await axios.post(`${API_BASE_URL}/api/schema/review`, { project_id: projectId, user_id: userId });
        return res.data;
    },
    getOnboardingGuide: async (projectId: string, forceRefresh: boolean = false, userId?: string) => {
        const res = await axios.post(`${API_BASE_URL}/api/schema/onboarding-guide`, { project_id: projectId, force_refresh: forceRefresh, user_id: userId });
        return res.data;
    },
    askSchema: async (projectId: string, question: string, userId?: string) => {
        const res = await axios.post(`${API_BASE_URL}/api/schema/ask`, { project_id: projectId, question, user_id: userId });
        return res.data;
    },

    // Universal Username System APIs
    user: {
        getMe: async (userId: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/me`, {
                headers: { 'x-user-id': userId }
            });
            return res.data;
        },
        updateUsername: async (userId: string, username: string) => {
            const res = await axios.patch(`${API_BASE_URL}/api/me/username`, { username }, {
                headers: { 'x-user-id': userId }
            });
            return res.data;
        },
        updateIdentity: async (userId: string, data: { display_name?: string; workspace_name?: string; workspaceId?: string }) => {
            const res = await axios.patch(`${API_BASE_URL}/api/me`, data, {
                headers: { 'x-user-id': userId }
            });
            return res.data;
        },
        updateProfile: async (userId: string, data: { username?: string; display_name?: string; workspace_name?: string }) => {
            const res = await axios.patch(`${API_BASE_URL}/api/profile`, data, {
                headers: { 'x-user-id': userId }
            });
            return res.data;
        }
    },

    // User Dashboard APIs
    dashboard: {
        getUsage: async (workspaceId: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/dashboard/usage`, { params: { workspaceId } });
            return res.data;
        },
        getBilling: async (workspaceId: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/dashboard/billing`, { params: { workspaceId } });
            return res.data;
        },
        getTeam: async (workspaceId: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/dashboard/team`, { params: { workspaceId } });
            return res.data;
        },
        inviteTeamMember: async (workspaceId: string, role: string, userId: string) => {
            const res = await axios.post(`${API_BASE_URL}/api/dashboard/team/invite`, { workspaceId, role, userId });
            return res.data;
        },
        changeRole: async (memberId: string, newRole: string, workspaceId: string, userId: string) => {
            const res = await axios.patch(`${API_BASE_URL}/api/dashboard/team/role`, { memberId, newRole, workspaceId, userId });
            return res.data;
        },
        removeMember: async (memberId: string, workspaceId: string, userId: string) => {
            const res = await axios.delete(`${API_BASE_URL}/api/dashboard/team/remove`, { data: { memberId, workspaceId, userId } });
            return res.data;
        },
        getActivityLog: async (workspaceId: string, limit?: number) => {
            const res = await axios.get(`${API_BASE_URL}/api/dashboard/activity-log`, { params: { workspaceId, limit } });
            return res.data;
        }
    },

    // Workspace Member Management (Role Management System)
    workspace: {
        // GET /api/workspace/members - Fetch member list
        getMembers: async (workspaceId: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/workspace/members`, { params: { workspaceId } });
            return res.data;
        },
        // PATCH /api/workspace/members/:userId/role - Change role (Admin only)
        changeRole: async (userId: string, role: 'admin' | 'member', workspaceId: string, requesterId: string) => {
            const res = await axios.patch(`${API_BASE_URL}/api/workspace/members/${userId}/role`, {
                role,
                workspaceId,
                requesterId
            });
            return res.data;
        },
        // DELETE /api/workspace/members/:userId - Remove member (Admin only)
        removeMember: async (userId: string, workspaceId: string, requesterId: string) => {
            const res = await axios.delete(`${API_BASE_URL}/api/workspace/members/${userId}`, {
                data: { workspaceId, requesterId }
            });
            return res.data;
        }
    },

    // Platform Settings APIs
    settings: {
        // Get all settings at once
        getAll: async (userId: string, workspaceId?: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/settings/all`, {
                params: { userId, workspaceId }
            });
            return res.data;
        },
        // User appearance settings
        getAppearance: async (userId: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/settings/user/${userId}`);
            return res.data;
        },
        updateAppearance: async (userId: string, data: { color_mode?: string; diagram_theme?: string }) => {
            const res = await axios.patch(`${API_BASE_URL}/api/settings/user/${userId}`, data);
            return res.data;
        },
        // User interaction settings
        getInteraction: async (userId: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/settings/interaction/${userId}`);
            return res.data;
        },
        updateInteraction: async (userId: string, data: { reduced_motion?: boolean; auto_focus_schema?: boolean }) => {
            const res = await axios.patch(`${API_BASE_URL}/api/settings/interaction/${userId}`, data);
            return res.data;
        },
        // Workspace intelligence settings
        getIntelligence: async (workspaceId: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/settings/intelligence/${workspaceId}`);
            return res.data;
        },
        updateIntelligence: async (workspaceId: string, data: {
            explanation_mode?: string;
            evidence_strict?: boolean;
            auto_schema_review?: boolean;
            auto_onboarding?: boolean;
        }) => {
            const res = await axios.patch(`${API_BASE_URL}/api/settings/intelligence/${workspaceId}`, data);
            return res.data;
        },
        // User notification settings
        getNotifications: async (userId: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/settings/notifications/${userId}`);
            return res.data;
        },
        updateNotifications: async (userId: string, data: {
            email_schema_changes?: boolean;
            email_team_activity?: boolean;
            email_ai_summary?: boolean;
            inapp_schema?: boolean;
            inapp_team?: boolean;
        }) => {
            const res = await axios.patch(`${API_BASE_URL}/api/settings/notifications/${userId}`, data);
            return res.data;
        },
        // Workspace privacy settings
        getPrivacy: async (workspaceId: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/settings/privacy/${workspaceId}`);
            return res.data;
        },
        updatePrivacy: async (workspaceId: string, data: { retain_all_versions?: boolean }) => {
            const res = await axios.patch(`${API_BASE_URL}/api/settings/privacy/${workspaceId}`, data);
            return res.data;
        }
    },
    // Project-Specific Settings APIs
    projectSettings: {
        getAll: async (projectId: string) => {
            const res = await axios.get(`${API_BASE_URL}/api/project-settings/${projectId}`);
            return res.data;
        },
        updateGeneral: async (projectId: string, data: { name?: string; description?: string; status?: string }) => {
            const res = await axios.patch(`${API_BASE_URL}/api/project-settings/${projectId}/general`, data);
            return res.data;
        },
        updateSchema: async (projectId: string, data: { input_mode?: string; auto_version?: boolean; version_naming?: string }) => {
            const res = await axios.patch(`${API_BASE_URL}/api/project-settings/${projectId}/schema`, data);
            return res.data;
        },
        updateIntelligence: async (projectId: string, data: {
            explanation_depth?: string;
            evidence_strict?: boolean;
            auto_review?: boolean;
            auto_onboarding?: boolean;
        }) => {
            const res = await axios.patch(`${API_BASE_URL}/api/project-settings/${projectId}/intelligence`, data);
            return res.data;
        },
        addMember: async (projectId: string, userId: string, role: string) => {
            const res = await axios.post(`${API_BASE_URL}/api/project-settings/${projectId}/members`, { user_id: userId, role });
            return res.data;
        },
        removeMember: async (projectId: string, userId: string) => {
            const res = await axios.delete(`${API_BASE_URL}/api/project-settings/${projectId}/members/${userId}`);
            return res.data;
        },
        deleteProject: async (projectId: string) => {
            const res = await axios.delete(`${API_BASE_URL}/api/project-settings/${projectId}`);
            return res.data;
        }
    }
};
