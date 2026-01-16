import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Folder, PenTool, Settings, HelpCircle, LogOut, Github, Chrome, MessageSquarePlus, ShieldCheck, BookOpen, Brain } from 'lucide-react';
import { Logo } from './VizoraLogo';
import { useAuth } from '../context/AuthContext';
import { FeedbackPrompt } from './beta/FeedbackPrompt';

interface GlobalSidebarProps {
    isMobileOpen?: boolean;
}

export function GlobalSidebar({ isMobileOpen = false }: GlobalSidebarProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [showFeedback, setShowFeedback] = useState(false);

    const navItems = [
        { icon: Folder, label: 'Projects', path: '/projects' },
        { icon: PenTool, label: 'Designer', path: '/designer' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const intelligenceItems = [
        { icon: ShieldCheck, label: 'Schema Review', path: `/workspace/${location.pathname.split('/')[2]}/intelligence/review` },
        { icon: BookOpen, label: 'Onboarding Guide', path: `/workspace/${location.pathname.split('/')[2]}/intelligence/onboarding` },
        { icon: Brain, label: 'Ask Schema', path: `/workspace/${location.pathname.split('/')[2]}/intelligence/ask` },
    ];

    const isActive = (path: string) => {
        if (path === '/projects') return location.pathname === '/projects';
        return location.pathname.startsWith(path);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    // Helper to get provider icon
    const ProviderIcon = () => {
        const provider = user?.app_metadata?.provider;
        if (provider === 'github') return <Github className="w-3 h-3" />;
        if (provider === 'google') return <Chrome className="w-3 h-3 text-[#4285F4]" />;
        return null;
    };

    return (
        <aside className={`sidebar-fixed left-0 z-50 w-[72px] hover:w-[240px] flex flex-col bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 ease-in-out group ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
            {/* Top Brand Section */}
            <div className="h-16 flex items-center shrink-0 border-b border-transparent px-3 overflow-hidden">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-3 min-w-0 hover:bg-gray-50 p-1 rounded-xl transition-colors w-full"
                >
                    <Logo size={32} animated={true} withBackground={true} />
                    <span className="vizora-brand font-bold text-base text-gray-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                        Vizora
                    </span>
                </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 flex flex-col gap-2 px-3 py-6">
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.path)}
                            className={`
                                relative flex items-center h-10 px-2 rounded-lg transition-all duration-200 group/item
                                ${active ? 'bg-indigo-50/50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-slate-800'}
                            `}
                        >
                            {active && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-indigo-600 rounded-r" />
                            )}

                            <item.icon
                                className={`h-5 w-5 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-gray-500 dark:text-slate-400 group-hover/item:text-gray-900 dark:group-hover/item:text-white'}`}
                                strokeWidth={2}
                            />

                            <span className={`
                                ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                ${active ? 'text-indigo-900 dark:text-indigo-400' : 'text-gray-600 dark:text-slate-300'}
                            `}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {/* Intelligence Section */}
                {location.pathname.startsWith('/workspace/') && location.pathname.split('/')[2] && (
                    <div className="mt-6 pt-6 border-t border-gray-100 flex flex-col gap-2">
                        <div className="px-2 mb-2 group-hover:opacity-100 opacity-0 transition-opacity">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">🧠 Intelligence</span>
                        </div>
                        {intelligenceItems.map((item) => {
                            const active = location.pathname === item.path;
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => navigate(item.path)}
                                    className={`
                                        relative flex items-center h-10 px-2 rounded-lg transition-all duration-200 group/item
                                        ${active ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}
                                    `}
                                >
                                    {active && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-indigo-600 rounded-r" />
                                    )}

                                    <item.icon
                                        className={`h-5 w-5 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-gray-500 group-hover/item:text-gray-900'}`}
                                        strokeWidth={2}
                                    />

                                    <span className={`
                                        ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                        ${active ? 'text-indigo-900' : 'text-gray-600'}
                                    `}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </nav>

            {/* Bottom Actions */}
            <div className="p-3 flex flex-col gap-2 mt-auto border-t border-gray-50 dark:border-slate-800">
                <button
                    onClick={() => setShowFeedback(true)}
                    className="flex items-center h-10 px-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all group/feedback"
                >
                    <MessageSquarePlus className="h-5 w-5 shrink-0 transition-colors group-hover/feedback:rotate-12" strokeWidth={2} />
                    <span className="ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        Give Feedback
                    </span>
                </button>

                <button
                    onClick={() => navigate('/help')}
                    className="flex items-center h-10 px-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
                >
                    <HelpCircle className="h-5 w-5 shrink-0" strokeWidth={2} />
                    <span className="ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        Help & Docs
                    </span>
                </button>

                <div className="flex flex-col gap-2 mt-2">
                    <button
                        onClick={() => navigate('/account')}
                        className="flex items-center h-12 px-2 rounded-lg hover:bg-gray-50 transition-all text-left w-full"
                    >
                        <div className="relative shrink-0">
                            {user?.user_metadata?.avatar_url ? (
                                <img
                                    src={user.user_metadata.avatar_url}
                                    alt={user.user_metadata.full_name}
                                    className="w-8 h-8 rounded-full border border-gray-200"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 border border-indigo-200">
                                    {user?.user_metadata?.full_name?.[0] || 'U'}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                                <ProviderIcon />
                            </div>
                        </div>
                        <div className="ml-3 text-left opacity-0 group-hover:opacity-100 transition-opacity overflow-hidden whitespace-nowrap">
                            <p className="text-xs font-bold text-gray-900 dark:text-white">{user?.user_metadata?.full_name || 'User'}</p>
                            <p className="text-[10px] text-gray-500 dark:text-slate-400 truncate lowercase">{user?.email}</p>
                        </div>
                    </button>

                    <button
                        onClick={handleSignOut}
                        className="flex items-center h-10 px-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                        <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
                        <span className="ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                            Sign out
                        </span>
                    </button>
                </div>
            </div>

            {showFeedback && (
                <FeedbackPrompt
                    onClose={() => setShowFeedback(false)}
                    context="dashboard"
                />
            )}
        </aside>
    );
}
