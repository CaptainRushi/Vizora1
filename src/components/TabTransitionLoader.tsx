import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * TabTransitionLoader
 * 
 * A subtle, premium loading indicator that appears during route/tab transitions.
 * Fixes the "stuck" issue by ensuring state resets on every location change.
 */
export function TabTransitionLoader() {
    const location = useLocation();
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        // Trigger loading on any path change
        setIsTransitioning(true);

        // Hide after a short duration to simulate "thinking" but ensure it's not stuck
        const timer = setTimeout(() => {
            setIsTransitioning(false);
        }, 600);

        return () => clearTimeout(timer);
    }, [location.pathname]);

    return (
        <AnimatePresence>
            {isTransitioning && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed top-0 left-0 right-0 h-1 z-[9999] pointer-events-none"
                >
                    {/* The actual animated bar */}
                    <div className="h-full bg-indigo-600 relative overflow-hidden shadow-sm">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-1/3 animate-shimmer" />
                        <motion.div
                            initial={{ width: "0%" }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className="h-full bg-indigo-600"
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
