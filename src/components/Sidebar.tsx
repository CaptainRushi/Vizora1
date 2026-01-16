
import {
    Folder,
    Settings,
    X,
    HelpCircle,
    Terminal,
    Share2,
    Sparkles,
    FileText,
    History,
    GitBranch,
    ChevronLeft,
    Database,
    LayoutDashboard,
    Users,
    Github,
    Chrome,
    ShieldCheck,
    BookOpen,
    Brain,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SidebarItem } from './SidebarItem';
import { useProjectContext } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { projectId, project: projectInfo } = useProjectContext();
    const { user } = useAuth();

    const handleNavigation = (path: string) => {
        navigate(path);
        onClose();
    };

    const isActive = (path: string) => location.pathname === path;

    // Determine if we're in project context
    const inProjectContext = !!projectId;

    const getWorkspacePath = (subpath: string) => `/workspace/${projectId}/${subpath}`;

    // Helper to get provider icon
    const ProviderIcon = () => {
        const provider = user?.app_metadata?.provider;
        if (provider === 'github') return <Github className="w-3 h-3" />;
        if (provider === 'google') return <Chrome className="w-3 h-3 text-[#4285F4]" />;
        return null;
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-gray-900/10 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            <aside
                className={`
                    fixed inset-y-0 left-0 z-30 w-[270px] flex flex-col border-r border-gray-200 bg-white transition-transform duration-300 ease-in-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                    lg:translate-x-0
                `}
            >
                {/* TOP BRAND/PROJECT SECTION */}
                {!inProjectContext ? (
                    /* Global Brand */
                    <div className="flex h-20 items-center justify-between px-6 shrink-0 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 shadow-sm shrink-0">
                                <div className="grid grid-cols-2 gap-1 px-1.5">
                                    <div className="h-1 w-1 rounded-full bg-white opacity-40" />
                                    <div className="h-1 w-1 rounded-full bg-white" />
                                    <div className="h-1 w-1 rounded-full bg-white" />
                                    <div className="h-1 w-1 rounded-full bg-white opacity-40" />
                                </div>
                            </div>
                            <div className="flex flex-col justify-center">
                                <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-tight">Vizora</h1>
                                <p className="text-[10px] text-gray-400 font-medium leading-tight">Schema Intelligence</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 lg:hidden transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                ) : (
                    /* Project Context Header */
                    <div className="shrink-0 border-b border-gray-100">
                        {/* Back to Projects */}
                        <button
                            onClick={() => handleNavigation('/projects')}
                            className="w-full flex items-center gap-2 px-6 py-3 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors group"
                        >
                            <ChevronLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
                            <span className="font-medium">All Projects</span>
                        </button>

                        {/* Project Info */}
                        <div className="px-6 py-4 bg-gradient-to-br from-indigo-50 to-purple-50">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-lg shadow-lg shrink-0">
                                    {projectInfo?.name?.[0]?.toUpperCase() || 'P'}
                                </div>
                                <div className="flex-1 min-w-0">
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
                )}

                {/* CONTEXT-AWARE NAVIGATION */}
                <div className="flex-1 flex flex-col p-4 space-y-6 select-none overflow-y-auto custom-scrollbar">

                    {!inProjectContext ? (
                        /* GLOBAL NAVIGATION - No Project Selected */
                        <>
                            <div className="space-y-1">
                                <SidebarItem
                                    icon={Folder}
                                    label="Projects"
                                    subLabel="Manage all projects"
                                    active={isActive('/projects')}
                                    onClick={() => handleNavigation('/projects')}
                                />
                                <SidebarItem
                                    icon={HelpCircle}
                                    label="Help / Docs"
                                    active={isActive('/help')}
                                    onClick={() => handleNavigation('/help')}
                                />
                            </div>

                            {/* Empty State Message */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="px-3 py-6 text-center">
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                        Select or create a project to access schema features
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        /* PROJECT-SCOPED NAVIGATION - Project Selected */
                        <>
                            {/* Overview Section */}
                            <div className="space-y-1">
                                <div className="px-3 mb-2">
                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Overview</span>
                                </div>
                                <SidebarItem
                                    icon={LayoutDashboard}
                                    label="Dashboard"
                                    active={isActive(getWorkspacePath('overview'))}
                                    onClick={() => handleNavigation(getWorkspacePath('overview'))}
                                />
                                <SidebarItem
                                    icon={Users}
                                    label="Team"
                                    active={isActive(getWorkspacePath('team'))}
                                    onClick={() => handleNavigation(getWorkspacePath('team'))}
                                />
                            </div>

                            {/* Core 4 Features */}
                            <div className="space-y-1 pt-4 border-t border-gray-100">
                                <div className="px-3 mb-2">
                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Core Features</span>
                                </div>
                                <SidebarItem
                                    icon={Terminal}
                                    label="Schema Input"
                                    subLabel="Paste your schema"
                                    active={isActive(getWorkspacePath('schema-input'))}
                                    onClick={() => handleNavigation(getWorkspacePath('schema-input'))}
                                />
                                <SidebarItem
                                    icon={Share2}
                                    label="ER Diagram"
                                    subLabel="Visualize schema"
                                    active={isActive(getWorkspacePath('er-diagram'))}
                                    onClick={() => handleNavigation(getWorkspacePath('er-diagram'))}
                                />
                                <SidebarItem
                                    icon={Sparkles}
                                    label="AI Explain"
                                    subLabel="Understand schema"
                                    active={isActive(getWorkspacePath('explanations'))}
                                    onClick={() => handleNavigation(getWorkspacePath('explanations'))}
                                />
                                <SidebarItem
                                    icon={FileText}
                                    label="Auto Docs"
                                    subLabel="Generate docs"
                                    active={isActive(getWorkspacePath('docs'))}
                                    onClick={() => handleNavigation(getWorkspacePath('docs'))}
                                />
                            </div>

                            {/* Intelligence Section */}
                            <div className="space-y-1 pt-4 border-t border-gray-100">
                                <div className="px-3 mb-2">
                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">🧠 Intelligence</span>
                                </div>
                                <SidebarItem
                                    icon={ShieldCheck}
                                    label="Schema Review"
                                    subLabel="Audit quality & risks"
                                    active={isActive(getWorkspacePath('intelligence/review'))}
                                    onClick={() => handleNavigation(getWorkspacePath('intelligence/review'))}
                                />
                                <SidebarItem
                                    icon={BookOpen}
                                    label="Onboarding Guide"
                                    subLabel="Understand the DB"
                                    active={isActive(getWorkspacePath('intelligence/onboarding'))}
                                    onClick={() => handleNavigation(getWorkspacePath('intelligence/onboarding'))}
                                />
                                <SidebarItem
                                    icon={Brain}
                                    label="Ask Schema"
                                    subLabel="AI assistant"
                                    active={isActive(getWorkspacePath('intelligence/ask'))}
                                    onClick={() => handleNavigation(getWorkspacePath('intelligence/ask'))}
                                />
                            </div>

                            {/* Additional Features */}
                            <div className="pt-4 border-t border-gray-100 space-y-1">
                                <div className="px-3 mb-2">
                                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">History & Settings</span>
                                </div>
                                <SidebarItem
                                    icon={History}
                                    label="Version History"
                                    active={isActive(getWorkspacePath('versions'))}
                                    onClick={() => handleNavigation(getWorkspacePath('versions'))}
                                />
                                <SidebarItem
                                    icon={GitBranch}
                                    label="Change Tracking"
                                    active={isActive(getWorkspacePath('changes'))}
                                    onClick={() => handleNavigation(getWorkspacePath('changes'))}
                                />
                                <SidebarItem
                                    icon={Settings}
                                    label="Project Settings"
                                    active={isActive(getWorkspacePath('settings'))}
                                    onClick={() => handleNavigation(getWorkspacePath('settings'))}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* USER INFO PANEL */}
                <div className="mt-auto p-4 border-t border-gray-100 bg-slate-50/50">
                    <button
                        onClick={() => handleNavigation('/account')}
                        className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white transition-all text-left w-full group/user"
                    >
                        <div className="relative">
                            {user?.user_metadata?.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt={user.user_metadata.full_name}
                                    className="w-10 h-10 rounded-full border border-gray-200"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                                    {user?.user_metadata?.full_name?.[0] || 'U'}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                                <ProviderIcon />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate group-hover/user:text-indigo-600 transition-colors">
                                {user?.user_metadata?.full_name || 'Anonymous User'}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate lowercase">
                                {user?.email}
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5 flex items-center gap-1">
                                Signed in via <span className="capitalize">{user?.app_metadata?.provider}</span>
                            </p>
                        </div>
                    </button>
                </div>
            </aside >
        </>
    );
}
