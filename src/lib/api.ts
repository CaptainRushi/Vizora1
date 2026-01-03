
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

export const api = {
    createProject: async (name: string, schema_type: string) => {
        const res = await axios.post(`${API_BASE_URL}/projects`, { name, schema_type });
        return res.data;
    },
    ingestSchema: async (projectId: string, raw_schema: string) => {
        const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/schema`, { raw_schema });
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
    updateSchema: async (projectId: string, normalized_schema: any) => {
        const res = await axios.put(`${API_BASE_URL}/projects/${projectId}/normalized-schema`, { normalized_schema });
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
    upgradePlan: async (projectId: string, planId: string) => {
        const res = await axios.post(`${API_BASE_URL}/projects/${projectId}/billing/upgrade`, { plan_id: planId });
        return res.data;
    },
    getAppearance: async (_projectId?: string) => {
        // Placeholder for global or user-level appearance settings
        return { theme: 'light' };
    },
    updateAppearance: async (_projectId: string, _appearance: any) => {
        // Placeholder for updating appearance
        return { success: true };
    }
};
