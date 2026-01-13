/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Vizora Motion System
      transitionDuration: {
        'fast': '120ms',
        'medium': '180ms',
        'slow': '220ms',
      },
      transitionTimingFunction: {
        'vizora': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        // Vizora Motion System Animations
        'fadeIn': 'fadeIn 180ms ease-out',
        'fadeInUp': 'fadeInUp 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'scaleIn': 'scaleIn 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'scaleOut': 'scaleOut 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'slideInRight': 'slideInRight 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'slideOutRight': 'slideOutRight 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'shake': 'shake 300ms ease-out',
        'shimmer': 'shimmer 1.5s linear infinite',
        'expand': 'expand 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'collapse': 'collapse 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'successPulse': 'successPulse 300ms ease-out',
        'thinkingPulse': 'thinkingPulse 1.2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        // Vizora Motion System Keyframes
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        scaleOut: {
          from: { opacity: '1', transform: 'scale(1)' },
          to: { opacity: '0', transform: 'scale(0.96)' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutRight: {
          from: { transform: 'translateX(0)', opacity: '1' },
          to: { transform: 'translateX(100%)', opacity: '0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-2px)' },
          '40%, 80%': { transform: 'translateX(2px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        expand: {
          from: { maxHeight: '0', opacity: '0' },
          to: { maxHeight: '2000px', opacity: '1' },
        },
        collapse: {
          from: { maxHeight: '2000px', opacity: '1' },
          to: { maxHeight: '0', opacity: '0' },
        },
        successPulse: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
        },
        thinkingPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '0.8' },
        },
      }
    },
  },
  plugins: [],
};
