
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLocation, matchPath, useNavigate } from 'react-router-dom';

export type ProjectStep = 'schema' | 'diagram' | 'explanation' | 'docs';

export interface Project {
    id: string;
    name: string;
    schema_type: string;
    current_step: string;
    created_at: string;
}

export function useProject() {
    const location = useLocation();
    const navigate = useNavigate();

    const match = matchPath('/workspace/:projectId/*', location.pathname);
    const urlProjectId = match?.params.projectId || null;

    const [projectId, setProjectId] = useState<string | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [currentStep, setCurrentStep] = useState<ProjectStep>('schema');
    const [loading, setLoading] = useState(true);

    const fetchProject = async () => {
        if (!urlProjectId) {
            setProjectId(null);
            setProject(null);
            setLoading(false);
            return;
        }

        try {
            const { data } = await supabase
                .from('projects')
                .select('*')
                .eq('id', urlProjectId)
                .single();

            if (data) {
                setProjectId(data.id);
                setProject(data);
                setCurrentStep(data.current_step as ProjectStep);
            } else {
                console.error("Invalid Project ID in URL");
                navigate('/projects');
            }
        } catch (err) {
            console.error("Project fetch error:", err);
            navigate('/projects');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProject();
    }, [urlProjectId]);

    const switchProject = (id: string) => {
        navigate(`/workspace/${id}/schema-input`);
    };

    const refreshStep = async () => {
        if (!projectId) return;
        const { data } = await supabase.from('projects').select('*').eq('id', projectId).single();
        if (data) {
            setProject(data);
            setCurrentStep(data.current_step as ProjectStep);
        }
    };

    return { projectId, project, currentStep, loading, switchProject, refreshStep };
}
