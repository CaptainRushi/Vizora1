import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'axios'
    ],
    exclude: ['lucide-react'],
  },

  // Build optimizations
  build: {
    // Enable source maps for debugging (disable in production if needed)
    sourcemap: false,

    // Optimize chunk size
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'ui-vendor': ['lucide-react', 'reactflow'],

          // Feature-based chunks
          'auth': [
            './src/pages/auth/SignInPage',
            './src/context/AuthContext'
          ],
        },
      },
    },

    // Minification (using default esbuild)
    minify: 'esbuild',
  },

  // Server configuration
  server: {
    // Enable CORS
    cors: true,

    // Optimize HMR
    hmr: {
      overlay: true,
    },
  },
});
