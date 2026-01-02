import { useState, useRef, useEffect } from 'react';

interface MacDotsProps {
    type: 'schema' | 'diagram';
    actions: {
        label: string;
        onClick: () => void;
        icon?: React.ReactNode;
    }[];
}

export function MacDots({ actions }: MacDotsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex gap-1.5 p-2 rounded-lg hover:bg-slate-200/50 transition-all opacity-80 hover:opacity-100 cursor-pointer"
                aria-label="Canvas options"
            >
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] shadow-inner" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] shadow-inner" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F] shadow-inner" />
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 py-2 z-[9999] animate-in fade-in slide-in-from-top-2 duration-200">
                    {actions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                action.onClick();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                            {action.icon && <span className="opacity-70">{action.icon}</span>}
                            {action.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
