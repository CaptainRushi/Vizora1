import { ReactNode } from 'react';
import { GlobalSidebar } from '../components/GlobalSidebar';

interface MainLayoutProps {
    children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* 1. macOS Window Safe Bar (Using fixed to ensure it stays above everything if needed, or just block flow) */}
            {/* The user wants a "Safe Area" that pushes content down. So a block element is best. */}
            <div className="h-8 w-full shrink-0 z-50 select-none pointer-events-none" />

            {/* Main Content Area - Offset by Global Sidebar width (w-20 = 5rem = 80px) */}
            <div className="flex-1 flex relative">
                <GlobalSidebar />

                <main className="flex-1 pl-[72px] transition-all duration-300">
                    {/* Content Container */}
                    <div className="min-h-[calc(100vh-2rem)] w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] p-0">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
