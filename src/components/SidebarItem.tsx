import { LucideIcon, Lock } from 'lucide-react';

interface SidebarItemProps {
    icon: LucideIcon;
    label: string;
    subLabel?: string;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    className?: string;
}

export function SidebarItem({
    icon: Icon,
    label,
    subLabel,
    active,
    disabled,
    onClick,
    className
}: SidebarItemProps) {
    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-200 group relative
                ${disabled
                    ? 'opacity-50 cursor-not-allowed bg-transparent'
                    : active
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}
                ${className || ''}
            `}
        >
            <div className={`
                flex items-center justify-center transition-colors relative
                ${active && !disabled ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300'}
            `}>
                <Icon className="w-4 h-4" />
                {disabled && (
                    <div className="absolute -right-1.5 -top-1.5 bg-white dark:bg-slate-900 rounded-full p-0.5 shadow-sm">
                        <Lock className="w-2 h-2 text-gray-400" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold tracking-wide truncate">{label}</div>
                {subLabel && (
                    <div className={`text-[10px] truncate mt-0.5 ${active && !disabled ? 'text-indigo-600/70 dark:text-indigo-400/70' : 'text-gray-400 dark:text-gray-500'}`}>
                        {subLabel}
                    </div>
                )}
            </div>
            {active && !disabled && (
                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shadow-sm animate-pulse" />
            )}
        </button>
    );
}
