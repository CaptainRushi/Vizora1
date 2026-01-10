import { useLocation } from 'react-router-dom';

export function BetaWatermark() {
    const location = useLocation();
    const text = 'Vizora Beta';

    // Don't show watermark on the hero/landing page
    if (location.pathname === '/') {
        return null;
    }

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {/* Top Right - Dark Theme */}
            <div className="absolute top-4 right-4 text-xs font-mono font-bold text-white/80 bg-gray-900/60 px-3 py-1.5 rounded-md backdrop-blur-sm uppercase tracking-widest select-none">
                {text}
            </div>
        </div>
    );
}
