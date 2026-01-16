import { motion } from 'framer-motion';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    items: {
        label: string;
        icon: any;
        onClick: () => void;
        variant?: 'default' | 'danger';
    }[];
}

export function ContextMenu({ x, y, onClose, items }: ContextMenuProps) {
    return (
        <div
            className="fixed inset-0 z-[100]"
            onClick={onClose}
            onContextMenu={(e) => { e.preventDefault(); onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                style={{ top: y, left: x }}
                className="absolute w-56 bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-2xl shadow-slate-200/50 py-2 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {items.map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => { item.onClick(); onClose(); }}
                        className={`
                            w-full px-4 py-2.5 flex items-center gap-3 text-xs font-bold transition-all
                            ${item.variant === 'danger'
                                ? 'text-red-500 hover:bg-red-50'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                        `}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </button>
                ))}
            </motion.div>
        </div>
    );
}
