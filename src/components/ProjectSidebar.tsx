
import {
    Terminal,
    Share2,
    Sparkles,
    FileText,
    History,
    GitBranch,
    Settings,
    Database,
    Layout
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarItem } from './SidebarItem';
import { useProject } from '../hooks/useProject';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface ProjectInfo {
    id: string;
    name: string;
    schema_type: string;
}

export function ProjectSidebar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { projectId } = useProject();
    const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);

    // If no project, we shouldn't be here (ProjectLayout handles this), makes this component safe
    const getWorkspacePath = (subpath: string) => `/workspace/${projectId}/${subpath}`;
    const isActive = (path: string) => location.pathname === path;

    // Fetch project details
    useEffect(() => {
        if (projectId) {
            const fetchProjectInfo = async () => {
                const { data } = await supabase
                    .from('projects')
                    .select('id, name, schema_type')
                    .eq('id', projectId)
                    .single();

                if (data) setProjectInfo(data);
            };
            fetchProjectInfo();
        }
    }, [projectId]);

    const handleNavigation = (path: string) => {
        navigate(path);
    };

    return (
        <aside
            className="fixed top-8 bottom-0 left-20 z-40 w-[240px] flex flex-col border-r border-gray-200 bg-white"
        >
            {/* PROJECT HEADER */}
            <div className="shrink-0 border-b border-gray-100 bg-gray-50/50">
                <div className="px-5 py-6">
                    <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-lg shadow-lg shrink-0">
                            {projectInfo?.name?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                            <h2 className="text-sm font-black text-gray-900 truncate leading-tight">
                                {projectInfo?.name || 'Loading...'}
                            </h2>
                            <div className="flex items-center gap-1.5 mt-1">
                                <Database className="h-3 w-3 text-indigo-600" />
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                                    {projectInfo?.schema_type || 'SQL'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* NAVIGATION */}
            <div className="flex-1 flex flex-col p-4 space-y-6 select-none overflow-y-auto custom-scrollbar">

                {/* Core Features */}
                <div className="space-y-1">
                    <div className="px-3 mb-2">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Core Features</span>
                    </div>
                    <SidebarItem
                        icon={Layout}
                        label="Dashboard"
                        subLabel="Overview"
                        active={isActive(getWorkspacePath('overview'))}
                        onClick={() => handleNavigation(getWorkspacePath('overview'))}
                    />
                    <SidebarItem
                        icon={Terminal}
                        label="Schema Input"
                        subLabel="Paste & Edit"
                        active={isActive(getWorkspacePath('schema-input'))}
                        onClick={() => handleNavigation(getWorkspacePath('schema-input'))}
                    />
                    <SidebarItem
                        icon={Share2}
                        label="ER Diagram"
                        subLabel="Visualize"
                        active={isActive(getWorkspacePath('er-diagram'))}
                        onClick={() => handleNavigation(getWorkspacePath('er-diagram'))}
                    />
                    <SidebarItem
                        icon={Sparkles}
                        label="AI Explain"
                        subLabel="Analysis"
                        active={isActive(getWorkspacePath('explanations'))}
                        onClick={() => handleNavigation(getWorkspacePath('explanations'))}
                    />
                    <SidebarItem
                        icon={FileText}
                        label="Auto Docs"
                        subLabel="Documentation"
                        active={isActive(getWorkspacePath('docs'))}
                        onClick={() => handleNavigation(getWorkspacePath('docs'))}
                    />
                </div>

                {/* History & Settings */}
                <div className="pt-4 border-t border-gray-100 space-y-1">
                    <div className="px-3 mb-2">
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">History</span>
                    </div>
                    <SidebarItem
                        icon={History}
                        label="Vers. History"
                        active={isActive(getWorkspacePath('versions'))}
                        onClick={() => handleNavigation(getWorkspacePath('versions'))}
                    />
                    <SidebarItem
                        icon={GitBranch}
                        label="Changes"
                        active={isActive(getWorkspacePath('changes'))}
                        onClick={() => handleNavigation(getWorkspacePath('changes'))}
                    />
                    <div className="pt-2">
                        <SidebarItem
                            icon={Settings}
                            label="Settings"
                            active={isActive(getWorkspacePath('settings'))}
                            onClick={() => handleNavigation(getWorkspacePath('settings'))}
                        />
                    </div>
                </div>
            </div>

            {/* FOOTER */}
            <div className="p-4 border-t border-gray-100 flex justify-center opacity-30 select-none">
                <span className="text-[9px] font-medium text-gray-400 tracking-widest">WORKSPACE MODE</span>
            </div>
        </aside>
    );
}
