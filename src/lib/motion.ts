/**
 * VIZORA MOTION SYSTEM
 * 
 * Core Design Philosophy:
 * - Animations communicate state, intent, and causality
 * - Never animate for decoration alone
 * - Responsive, intelligent, calm, intentional
 * 
 * Motion Rules:
 * - Duration: 120ms – 220ms
 * - Easing: ease-out or cubic-bezier(0.2, 0.8, 0.2, 1)
 * - No infinite animations
 * - Motion stops when user stops
 */

// ============================
// MOTION TOKENS
// ============================
export const motion = {
    // Durations
    fast: 120,      // For immediate feedback (clicks, hovers)
    medium: 180,    // For content transitions
    slow: 220,      // For complex state changes

    // Duration strings for CSS
    duration: {
        fast: '120ms',
        medium: '180ms',
        slow: '220ms',
    },

    // Easing curves
    easing: {
        default: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        easeOut: 'ease-out',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },

    // Framer Motion variants
    variants: {
        // Page transition (fade + slight upward motion)
        page: {
            initial: { opacity: 0, y: 4 },
            animate: { opacity: 1, y: 0 },
            exit: { opacity: 0, y: -4 },
            transition: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] },
        },

        // Fade in only
        fadeIn: {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.18 },
        },

        // Stagger children
        staggerContainer: {
            animate: {
                transition: {
                    staggerChildren: 0.05,
                },
            },
        },

        // Stagger item
        staggerItem: {
            initial: { opacity: 0, y: 8 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] },
        },

        // Drawer slide
        drawer: {
            initial: { x: '100%', opacity: 0 },
            animate: { x: 0, opacity: 1 },
            exit: { x: '100%', opacity: 0 },
            transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] },
        },

        // Backdrop
        backdrop: {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.18 },
        },

        // Scale in (for modals, cards)
        scaleIn: {
            initial: { opacity: 0, scale: 0.96 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.96 },
            transition: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] },
        },

        // Expand (for accordions, panels)
        expand: {
            initial: { height: 0, opacity: 0 },
            animate: { height: 'auto', opacity: 1 },
            exit: { height: 0, opacity: 0 },
            transition: { duration: 0.22, ease: [0.2, 0.8, 0.2, 1] },
        },
    },
} as const;

// ============================
// BUTTON INTERACTION STYLES
// ============================
export const buttonMotion = {
    // Hover: slight elevation
    hover: {
        y: -1,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    },

    // Click: compress
    tap: {
        scale: 0.96,
        y: 0,
    },

    // Transition config
    transition: {
        duration: 0.12,
        ease: [0.2, 0.8, 0.2, 1],
    },
};

// ============================
// CARD INTERACTION STYLES
// ============================
export const cardMotion = {
    // Hover: slight lift
    hover: {
        y: -2,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
    },

    // Click: subtle compress
    tap: {
        scale: 0.99,
        y: 0,
    },

    transition: {
        duration: 0.18,
        ease: [0.2, 0.8, 0.2, 1],
    },
};

// ============================
// LOADING STATE CONFIG
// ============================
export const loadingMotion = {
    shimmer: {
        initial: { x: '-100%' },
        animate: { x: '100%' },
        transition: {
            repeat: Infinity,
            duration: 1.5,
            ease: 'linear',
        },
    },

    pulse: {
        animate: {
            opacity: [0.5, 1, 0.5],
        },
        transition: {
            repeat: Infinity,
            duration: 1.5,
            ease: 'easeInOut',
        },
    },
};

// ============================
// ERROR/VALIDATION FEEDBACK
// ============================
export const feedbackMotion = {
    // Subtle shake for errors (1-2px)
    shake: {
        x: [0, -2, 2, -2, 2, 0],
        transition: { duration: 0.3 },
    },

    // Success pulse
    success: {
        scale: [1, 1.02, 1],
        transition: { duration: 0.3 },
    },
};

// ============================
// SIDEBAR MOTION
// ============================
export const sidebarMotion = {
    // Active indicator bar
    activeBar: {
        initial: { scaleY: 0 },
        animate: { scaleY: 1 },
        exit: { scaleY: 0 },
        transition: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] },
    },

    // Background highlight
    highlight: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.12 },
    },
};

// ============================
// SCHEMA DIAGRAM MOTION
// ============================
export const diagramMotion = {
    // Node hover
    nodeHover: {
        scale: 1.02,
        transition: { duration: 0.15 },
    },

    // Node focus (connected highlight)
    nodeFocus: {
        opacity: 1,
        transition: { duration: 0.15 },
    },

    // Unrelated nodes dim
    nodeDim: {
        opacity: 0.4,
        transition: { duration: 0.15 },
    },

    // Edge highlight
    edgeHighlight: {
        strokeOpacity: 1,
        strokeWidth: 2,
        transition: { duration: 0.15 },
    },

    // Edge dim
    edgeDim: {
        strokeOpacity: 0.2,
        transition: { duration: 0.15 },
    },
};

// ============================
// AI RESPONSE MOTION
// ============================
export const aiMotion = {
    // Thinking indicator (subtle pulse, no spinner)
    thinking: {
        animate: {
            opacity: [0.5, 0.8, 0.5],
        },
        transition: {
            repeat: Infinity,
            duration: 1.2,
            ease: 'easeInOut',
        },
    },

    // Answer line-by-line fade in
    answerLine: {
        initial: { opacity: 0, x: -4 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.18 },
    },

    // Evidence panel slide in
    evidencePanel: {
        initial: { opacity: 0, x: 12 },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.22, delay: 0.1 },
    },
};

// ============================
// CSS CLASS HELPERS
// ============================
export const motionClasses = {
    // Button base motion
    button: 'transition-all duration-[120ms] ease-out hover:-translate-y-[1px] hover:shadow-lg active:scale-[0.96] active:translate-y-0',

    // Card base motion
    card: 'transition-all duration-[180ms] ease-out hover:-translate-y-[2px] hover:shadow-xl',

    // Fade transition
    fade: 'transition-opacity duration-[180ms] ease-out',

    // Transform transition
    transform: 'transition-transform duration-[180ms] ease-out',

    // All transitions
    all: 'transition-all duration-[180ms] ease-out',

    // Fast transition
    fast: 'transition-all duration-[120ms] ease-out',

    // Slow transition
    slow: 'transition-all duration-[220ms] ease-out',
};

export default motion;
