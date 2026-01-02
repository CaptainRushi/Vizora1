import { useState, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/useProject';
import { Sidebar } from '../components/Sidebar';

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

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* macOS Window Safe Bar */}
            <div className="h-8 w-full shrink-0 z-50 select-none pointer-events-none" />

            <div className="flex flex-1 relative">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                {/* Content Area - Full Bleed for Infinite Canvas */}
                <div className="flex-1 lg:pl-[270px] w-full relative">
                    {children}
                </div>
            </div>
        </div>
    );
}
