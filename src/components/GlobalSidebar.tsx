import { useLocation, useNavigate } from 'react-router-dom';
import { Folder, PenTool, CreditCard, Settings, HelpCircle } from 'lucide-react';
import { Logo } from './Logo';

export function GlobalSidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    const navItems = [
        { icon: Folder, label: 'Projects', path: '/projects' },
        { icon: PenTool, label: 'Designer', path: '/designer' },
        { icon: CreditCard, label: 'Billing', path: '/billing' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const isActive = (path: string) => {
        if (path === '/projects') return location.pathname === '/projects';
        return location.pathname.startsWith(path);
    };

    return (
        <aside className="fixed inset-y-0 left-0 z-50 w-[72px] hover:w-[240px] flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out group">
            {/* Top Brand Section */}
            <div className="h-16 flex items-center shrink-0 border-b border-transparent px-3 overflow-hidden">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-3 min-w-0 hover:bg-gray-50 p-1 rounded-xl transition-colors w-full"
                >
                    {/* 4 dots icon - Animated on hover */}
                    <div className="p-2 shrink-0">
                        <Logo size={20} animated={true} />
                    </div>
                    {/* Text only visible on expand */}
                    <span className="font-bold text-sm text-gray-900 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
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
                                ${active ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}
                            `}
                        >
                            {/* Active Indicator Line */}
                            {active && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-indigo-600 rounded-r" />
                            )}

                            {/* Icon */}
                            <item.icon
                                className={`h-5 w-5 shrink-0 transition-colors ${active ? 'text-indigo-600' : 'text-gray-500 group-hover/item:text-gray-900'}`}
                                strokeWidth={2}
                            />

                            {/* Label */}
                            <span className={`
                                ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200
                                ${active ? 'text-indigo-900' : 'text-gray-600'}
                            `}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="p-3 flex flex-col gap-1 mt-auto">
                <button className="flex items-center h-10 px-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all">
                    <HelpCircle className="h-5 w-5 shrink-0" strokeWidth={2} />
                    <span className="ml-4 text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        Help & Docs
                    </span>
                </button>

                <button
                    onClick={() => navigate('/account')}
                    className="flex items-center h-12 px-2 rounded-lg hover:bg-gray-50 transition-all mt-1"
                >
                    <div className="h-8 w-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                        JD
                    </div>
                    <div className="ml-3 text-left opacity-0 group-hover:opacity-100 transition-opacity overflow-hidden whitespace-nowrap">
                        <p className="text-xs font-bold text-gray-900">John Doe</p>
                        <p className="text-[10px] text-gray-500">Workspace</p>
                    </div>
                </button>
            </div>
        </aside>
    );
}
