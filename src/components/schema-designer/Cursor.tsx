
import { motion } from 'framer-motion';
import { MousePointer2 } from 'lucide-react';

interface CursorProps {
    x: number;
    y: number;
    label?: string;
    color?: string;
}

export function Cursor({ x, y, label, color = '#6366f1' }: CursorProps) {
    return (
        <motion.div
            className="absolute z-[9999] pointer-events-none flex flex-col items-start gap-1"
            animate={{ x, y }}
            transition={{ type: 'spring', damping: 30, stiffness: 200, mass: 0.5 }}
        >
            <MousePointer2
                className="h-5 w-5 -rotate-90 drop-shadow-sm"
                style={{ color, fill: color }}
            />
            {label && (
                <div
                    className="px-2 py-1 rounded-md text-[10px] font-black text-white whitespace-nowrap shadow-sm"
                    style={{ backgroundColor: color }}
                >
                    {label}
                </div>
            )}
        </motion.div>
    );
}
