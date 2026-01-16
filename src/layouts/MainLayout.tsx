import { ReactNode, useState } from 'react';
import { GlobalSidebar } from '../components/GlobalSidebar';
import { Menu, X } from 'lucide-react';
import { Logo } from '../components/VizoraLogo';

import { FeedbackButton } from '../components/beta/FeedbackButton';

interface MainLayoutProps {
    children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 lg:grid lg:grid-cols-[72px_1fr] flex flex-col">
            {/* macOS Window Safe Bar - Global */}
            <div className="h-8 w-full shrink-0 z-50 select-none pointer-events-none hidden lg:block col-span-full" />

            {/* Mobile Header */}
            <header className="lg:hidden h-14 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 z-40 sticky top-0">
                <div className="flex items-center gap-2">
                    <Logo size={32} animated={false} withBackground={true} />
                    <span className="font-bold text-gray-900 dark:text-white">Vizora</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </header>

            {/* Global Sidebar - Col 1 */}
            <GlobalSidebar isMobileOpen={isMobileMenuOpen} />

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/20 dark:bg-slate-950/60 backdrop-blur-md z-40 lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Layout Spacer for Fixed Sidebar - Col 1 */}
            <div className="hidden lg:block w-[72px] shrink-0" />

            {/* Main Content - Col 2 */}
            <main className="flex-1 w-full relative overflow-y-auto">
                <div className="min-h-[calc(100vh-2rem)] w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px]">
                    {children}
                </div>
            </main>

            <FeedbackButton />
        </div>
    );
}
