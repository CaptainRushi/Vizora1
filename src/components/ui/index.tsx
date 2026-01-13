/**
 * VIZORA UI COMPONENTS
 * 
 * Reusable animated components following the Vizora motion system.
 * Every click feels acknowledged. Every transition reinforces understanding.
 */

import React, { forwardRef, ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

// ============================
// BUTTON COMPONENT
// ============================
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
        const baseStyles = `
            inline-flex items-center justify-center gap-2 font-semibold rounded-xl
            transition-all duration-[120ms] ease-out
            hover:-translate-y-[1px] hover:shadow-lg
            active:scale-[0.96] active:translate-y-0
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:active:scale-100
            focus:outline-none focus:ring-2 focus:ring-offset-2
        `;

        const variants = {
            primary: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-indigo-200 focus:ring-indigo-500',
            secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 focus:ring-gray-400',
            ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:ring-gray-400',
            danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-red-200 focus:ring-red-500',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-xs',
            md: 'px-4 py-2.5 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                {...props}
            >
                {loading && (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

// ============================
// CARD COMPONENT
// ============================
interface CardProps extends HTMLAttributes<HTMLDivElement> {
    interactive?: boolean;
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
    ({ className, interactive = false, padding = 'md', children, ...props }, ref) => {
        const baseStyles = `
            bg-white rounded-2xl border border-gray-200 shadow-sm
            transition-all duration-[180ms] ease-out
        `;

        const interactiveStyles = interactive
            ? 'cursor-pointer hover:-translate-y-[2px] hover:shadow-xl hover:border-gray-300'
            : '';

        const paddings = {
            none: '',
            sm: 'p-4',
            md: 'p-6',
            lg: 'p-8',
        };

        return (
            <div
                ref={ref}
                className={cn(baseStyles, interactiveStyles, paddings[padding], className)}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

// ============================
// SKELETON LOADER
// ============================
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    variant?: 'text' | 'circular' | 'rectangular';
    width?: string | number;
    height?: string | number;
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
    ({ className, variant = 'text', width, height, style, ...props }, ref) => {
        const baseStyles = `
            relative overflow-hidden bg-gray-100
            after:absolute after:inset-0
            after:translate-x-[-100%]
            after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent
            after:animate-shimmer
        `;

        const variants = {
            text: 'h-4 rounded-md',
            circular: 'rounded-full',
            rectangular: 'rounded-lg',
        };

        return (
            <div
                ref={ref}
                className={cn(baseStyles, variants[variant], className)}
                style={{
                    width: width,
                    height: height,
                    ...style,
                }}
                {...props}
            />
        );
    }
);

Skeleton.displayName = 'Skeleton';

// ============================
// PAGE TRANSITION WRAPPER
// ============================
interface PageTransitionProps extends HTMLAttributes<HTMLDivElement> {
    show?: boolean;
}

export const PageTransition = forwardRef<HTMLDivElement, PageTransitionProps>(
    ({ className, children, show = true, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'transition-all duration-[180ms] ease-out',
                    show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

PageTransition.displayName = 'PageTransition';

// ============================
// FADE TRANSITION
// ============================
interface FadeProps extends HTMLAttributes<HTMLDivElement> {
    show?: boolean;
    duration?: 'fast' | 'medium' | 'slow';
}

export const Fade = forwardRef<HTMLDivElement, FadeProps>(
    ({ className, children, show = true, duration = 'medium', ...props }, ref) => {
        const durations = {
            fast: 'duration-[120ms]',
            medium: 'duration-[180ms]',
            slow: 'duration-[220ms]',
        };

        return (
            <div
                ref={ref}
                className={cn(
                    'transition-opacity ease-out',
                    durations[duration],
                    show ? 'opacity-100' : 'opacity-0',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Fade.displayName = 'Fade';

// ============================
// DRAWER COMPONENT
// ============================
interface DrawerProps extends HTMLAttributes<HTMLDivElement> {
    isOpen: boolean;
    onClose: () => void;
    position?: 'left' | 'right';
    width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
    isOpen,
    onClose,
    position = 'right',
    width = 'max-w-md',
    children,
    className,
}) => {
    if (!isOpen) return null;

    const positionStyles = {
        left: 'left-0',
        right: 'right-0',
    };

    const translateStyles = {
        left: isOpen ? 'translate-x-0' : '-translate-x-full',
        right: isOpen ? 'translate-x-0' : 'translate-x-full',
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 bg-black/30 backdrop-blur-sm z-50',
                    'transition-opacity duration-[180ms] ease-out',
                    isOpen ? 'opacity-100' : 'opacity-0'
                )}
                onClick={onClose}
            />

            {/* Drawer Panel */}
            <div
                className={cn(
                    'fixed top-0 h-full w-full bg-white shadow-2xl z-50',
                    'transition-transform duration-[220ms] ease-out',
                    positionStyles[position],
                    translateStyles[position],
                    width,
                    className
                )}
            >
                {children}
            </div>
        </>
    );
};

// ============================
// INPUT WITH VALIDATION FEEDBACK
// ============================
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: string;
    label?: string;
    hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, error, label, hint, ...props }, ref) => {
        return (
            <div className="space-y-2">
                {label && (
                    <label className="block text-sm font-semibold text-gray-700">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={cn(
                        'w-full px-4 py-3 border rounded-xl text-gray-900 placeholder-gray-400',
                        'transition-all duration-[120ms] ease-out',
                        'focus:outline-none focus:ring-2',
                        error
                            ? 'border-red-300 focus:ring-red-500 bg-red-50 animate-shake'
                            : 'border-gray-200 focus:ring-indigo-500 focus:border-indigo-500',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-sm text-red-600 flex items-center gap-1 animate-fadeIn">
                        {error}
                    </p>
                )}
                {hint && !error && (
                    <p className="text-xs text-gray-400">{hint}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

// ============================
// THINKING INDICATOR
// ============================
interface ThinkingIndicatorProps extends HTMLAttributes<HTMLDivElement> {
    text?: string;
}

export const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
    text = 'Thinking',
    className,
}) => {
    return (
        <div className={cn('flex items-center gap-2 text-gray-500', className)}>
            <div className="flex gap-1">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm font-medium">{text}</span>
        </div>
    );
};

// ============================
// EMPTY STATE
// ============================
interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    action,
    className,
}) => {
    return (
        <div className={cn('text-center py-12', className)}>
            {icon && (
                <div className="mx-auto mb-4 text-gray-300">
                    {icon}
                </div>
            )}
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
            {description && (
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
            )}
            {action}
        </div>
    );
};

// ============================
// SIDEBAR ITEM
// ============================
interface SidebarItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    collapsed?: boolean;
}

export const SidebarItem = forwardRef<HTMLButtonElement, SidebarItemProps>(
    ({ icon: Icon, label, active, collapsed, className, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'relative flex items-center h-10 px-2 rounded-lg w-full',
                    'transition-all duration-[120ms] ease-out',
                    active ? 'bg-indigo-50/50' : 'hover:bg-gray-50',
                    className
                )}
                {...props}
            >
                {/* Active indicator bar */}
                {active && (
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 bg-indigo-600 rounded-r transition-transform duration-[180ms] ease-out origin-center"
                    />
                )}

                <Icon
                    className={cn(
                        'h-5 w-5 shrink-0 transition-colors duration-[120ms]',
                        active ? 'text-indigo-600' : 'text-gray-500 group-hover:text-gray-900'
                    )}
                    strokeWidth={2}
                />

                {!collapsed && (
                    <span
                        className={cn(
                            'ml-4 text-sm font-medium whitespace-nowrap',
                            'transition-opacity duration-[180ms] ease-out',
                            active ? 'text-indigo-900' : 'text-gray-600'
                        )}
                    >
                        {label}
                    </span>
                )}
            </button>
        );
    }
);

SidebarItem.displayName = 'SidebarItem';

// ============================
// SUCCESS CHECK ANIMATION
// ============================
export const SuccessCheck: React.FC<{ show: boolean }> = ({ show }) => {
    if (!show) return null;

    return (
        <div className="inline-flex items-center justify-center w-6 h-6 bg-green-500 rounded-full animate-scaleIn">
            <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                    className="animate-drawCheck"
                />
            </svg>
        </div>
    );
};
