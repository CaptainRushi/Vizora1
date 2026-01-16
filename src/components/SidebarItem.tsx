import { LucideIcon, Lock } from 'lucide-react';

interface SidebarItemProps {
    icon: LucideIcon;
    label: string;
    subLabel?: string;
    active?: boolean;
    disabled?: boolean;
    onClick?: () => void;
}

export function SidebarItem({
    icon: Icon,
    label,
    subLabel,
    active,
    disabled,
    onClick
}: SidebarItemProps) {
    return (
        <div className="relative group/sidebar-item">
            <button
                onClick={disabled ? undefined : onClick}
                disabled={disabled}
                className={`
                    group relative flex w-full items-start gap-3 rounded-lg px-3 py-2 text-sm transition-all
                    ${disabled
                        ? 'opacity-30 cursor-not-allowed bg-transparent'
                        : active
                            ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white'
                    }
                `}
            >
                {/* Thin left indicator bar (2px) */}
                {active && !disabled && (
                    <div className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-gray-900 dark:bg-indigo-500" />
                )}

                <div className="relative mt-0.5">
                    <Icon className={`h-4 w-4 shrink-0 stroke-[1.5] ${disabled ? 'text-gray-300 dark:text-slate-600' : active ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-300'}`} />
                    {disabled && (
                        <div className="absolute -right-1 -top-1 rounded-full bg-white dark:bg-slate-900 p-0.5">
                            <Lock className="h-2 w-2 text-gray-400 dark:text-slate-600" />
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-start min-w-0">
                    <span className={`truncate w-full text-left leading-normal ${active ? 'font-medium' : 'font-normal'}`}>
                        {label}
                    </span>
                    {subLabel && (
                        <span className="text-[10px] text-gray-400 dark:text-slate-500 font-normal truncate w-full text-left mt-[-2px]">
                            {subLabel}
                        </span>
                    )}
                </div>
            </button>
        </div>
    );
}
