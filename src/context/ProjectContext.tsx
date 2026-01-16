import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import { useLocation, matchPath } from 'react-router-dom';

interface Project {
    id: string;
    name: string;
    description: string | null;
    status: 'active' | 'archived';
    schema_type: string;
    current_step: string;
    created_at: string;
}

interface Billing {
    plan: any;
    usage: any;
}

interface ProjectContextType {
    projectId: string | null;
    project: Project | null;
    billing: Billing | null;
    loading: boolean;
    refreshProject: () => Promise<void>;
    refreshBilling: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const match = matchPath('/workspace/:projectId/*', location.pathname);
    const urlProjectId = match?.params.projectId || null;

    const [project, setProject] = useState<Project | null>(null);
    const [billing, setBilling] = useState<Billing | null>(null);
    const [loading, setLoading] = useState(true);

    const refreshProject = async () => {
        if (!urlProjectId) return;
        const { data } = await supabase
            .from('projects')
            .select('*')
            .eq('id', urlProjectId)
            .single();
        if (data) setProject(data);
    };

    const refreshBilling = async () => {
        if (!urlProjectId) return;
        try {
            const data = await api.getBilling(urlProjectId);
            setBilling(data);
        } catch (err) {
            console.error("Billing fetch error:", err);
        }
    };

    useEffect(() => {
        const loadAll = async () => {
            if (!urlProjectId) {
                setProject(null);
                setBilling(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const [pResult, bData] = await Promise.all([
                    supabase.from('projects').select('*').eq('id', urlProjectId).single(),
                    api.getBilling(urlProjectId)
                ]);

                if (pResult.data) setProject(pResult.data);
                if (bData) setBilling(bData);
            } catch (err) {
                console.error("Project/Billing load error:", err);
            } finally {
                setLoading(false);
            }
        };

        loadAll();
    }, [urlProjectId]);

    return (
        <ProjectContext.Provider value={{
            projectId: urlProjectId,
            project,
            billing,
            loading,
            refreshProject,
            refreshBilling
        }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProjectContext() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProjectContext must be used within a ProjectProvider');
    }
    return context;
}
