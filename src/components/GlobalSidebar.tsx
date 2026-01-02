
import { useLocation, useNavigate } from 'react-router-dom';
import { Folder, PenTool, CreditCard, Settings, Layers } from 'lucide-react';

export function GlobalSidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    const navItems = [
        { icon: Folder, label: 'Projects', path: '/projects', id: 'projects' },
        { icon: PenTool, label: 'Designer', path: '/designer', id: 'designer' },
        { icon: CreditCard, label: 'Billing', path: '/billing', id: 'billing' },
        { icon: Settings, label: 'Settings', path: '/settings', id: 'settings' },
    ];

    const isActive = (item: typeof navItems[0]) => {
        if (item.id === 'projects') {
            // Projects is active only on exact /projects path
            return location.pathname === '/projects';
        }
        // Other items use startsWith
        return item.path ? location.pathname.startsWith(item.path) : false;
    };

    const handleNavClick = (item: typeof navItems[0]) => {
        if (item.path) {
            console.log('Navigating to:', item.path);
            navigate(item.path);
        }
    };

    return (
        <aside className="fixed top-8 bottom-0 left-0 z-50 w-20 flex flex-col items-center py-6 bg-gray-900 border-r border-gray-800 text-white">
            {/* Logo Icon */}
            <div className="mb-8 p-3 rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/20">
                <Layers className="h-6 w-6 text-white" />
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 flex flex-col gap-4 w-full px-3">
                {navItems.map((item) => {
                    const active = isActive(item);
                    return (
                        <button
                            key={item.label}
                            onClick={() => handleNavClick(item)}
                            className={`
                                group relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 w-full
                                ${active
                                    ? 'bg-white/10 text-white shadow-inner'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }
                            `}
                            title={item.label}
                        >
                            <item.icon className={`h-6 w-6 mb-1 ${active ? 'text-white' : 'group-hover:text-white'}`} />
                            <span className="text-[9px] font-medium tracking-wide opacity-80">{item.label}</span>

                            {/* Active Indicator */}
                            {active && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full -ml-3" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* User / Bottom Section */}
            <button
                onClick={() => navigate('/account')}
                className="mt-auto group relative"
                title="Account"
            >
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 ring-2 ring-gray-800 group-hover:ring-indigo-500 transition-all cursor-pointer" />
                {location.pathname === '/account' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r-full -ml-3" />
                )}
            </button>
        </aside>
    );
}
