import { ReactNode, useState } from 'react';
import { GlobalSidebar } from '../components/GlobalSidebar';
import { Menu, X } from 'lucide-react';

interface MainLayoutProps {
    children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* macOS Window Safe Bar */}
            <div className="h-8 w-full shrink-0 z-50 select-none pointer-events-none hidden lg:block" />

            {/* Mobile Header */}
            <header className="lg:hidden h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40 sticky top-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
                        <div className="grid grid-cols-2 gap-0.5">
                            <div className="w-1 h-1 rounded-full bg-white opacity-40" />
                            <div className="w-1 h-1 rounded-full bg-white" />
                            <div className="w-1 h-1 rounded-full bg-white" />
                            <div className="w-1 h-1 rounded-full bg-white opacity-40" />
                        </div>
                    </div>
                    <span className="font-bold text-gray-900">Vizora</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                >
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </header>

            <div className="flex-1 flex relative">
                {/* Global Sidebar - Always fixed */}
                <GlobalSidebar isMobileOpen={isMobileMenuOpen} />

                {/* Mobile Menu Overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Main Content */}
                <main className="flex-1 lg:pl-[72px] transition-all duration-300">
                    <div className="min-h-[calc(100vh-2rem)] w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] p-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
