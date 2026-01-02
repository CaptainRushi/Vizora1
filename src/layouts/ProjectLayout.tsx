import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { ProjectSidebar } from '../components/ProjectSidebar';

interface ProjectLayoutProps {
    children: ReactNode;
}

/**
 * ProjectLayout enforces that a project must be selected.
 * If no project is active, redirects to /projects.
 * This is the HARD BOUNDARY for all schema-related features.
 */
export function ProjectLayout({ children }: ProjectLayoutProps) {
    const { projectId, loading } = useProject();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading && !projectId) {
            // No project selected - redirect to projects page
            navigate('/projects', { replace: true });
        }
    }, [projectId, loading, navigate]);

    // Show loading state while checking project
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-sm text-gray-600">Loading project...</p>
                </div>
            </div>
        );
    }

    // Don't render children if no project (will redirect)
    if (!projectId) {
        return null;
    }

    // Project exists - render the feature
    return (
        <div className="flex min-h-screen">
            <ProjectSidebar />

            {/* Content Area - Full Bleed for Infinite Canvas */}
            <div className="flex-1 pl-[240px] w-full relative">
                {children}
            </div>
        </div>
    );
}
