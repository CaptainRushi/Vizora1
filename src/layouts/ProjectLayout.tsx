import { useState, ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProjectContext } from '../context/ProjectContext';
import { Sidebar } from '../components/Sidebar';
import { Menu, X, Database } from 'lucide-react';
import { Logo } from '../components/VizoraLogo';

import { FeedbackButton } from '../components/beta/FeedbackButton';

interface ProjectLayoutProps {
    children: ReactNode;
}

export function ProjectLayout({ children }: ProjectLayoutProps) {
    const { projectId, project, loading } = useProjectContext();
    const navigate = useNavigate();
    const location = useLocation();

    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        if (!loading && !projectId && location.pathname !== '/projects') {
            navigate('/projects', { replace: true });
        }
    }, [projectId, loading, navigate, location.pathname]);

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

    if (!projectId) {
        return null;
    }

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-[270px_1fr] min-h-screen bg-gray-50">
            {/* macOS Window Safe Bar - Global */}
            <div className="h-8 w-full shrink-0 z-50 select-none pointer-events-none hidden lg:block col-span-full" />

            {/* Mobile Header */}
            <header className="lg:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40 sticky top-0">
                <div className="flex items-center gap-3">
                    <Logo size={32} animated={false} withBackground={true} />
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black text-gray-900 truncate leading-tight">{project?.name}</span>
                        <div className="flex items-center gap-1 opacity-60">
                            <Database className="h-2 w-2 text-indigo-600" />
                            <span className="text-[8px] font-bold uppercase tracking-wider">{project?.schema_type}</span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                >
                    {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </header>

            {/* Sidebar - Col 1 */}
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Layout Spacer for Fixed Sidebar - Col 1 */}
            <div className="hidden lg:block w-[270px] shrink-0" />

            {/* Main Content Area - Col 2 */}
            <main className="flex-1 w-full relative overflow-y-auto">
                <div className="min-h-[calc(100vh-2rem)] w-full">
                    {children}
                </div>
            </main>

            <FeedbackButton />
        </div>
    );
}
