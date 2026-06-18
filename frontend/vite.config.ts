import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  // Dev server with API + WebSocket proxy
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },

  build: {
    target: 'esnext', // modern browsers
    minify: 'esbuild', // fast minification
    cssCodeSplit: true, // split CSS for caching
    sourcemap: false, // optional: set true if you need source maps

    rollupOptions: {
      output: {
        // Let Vite automatically split chunks; avoids circular chunk issues
        manualChunks: undefined,

        // Stable hashed filenames for caching
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },

  optimizeDeps: {
    // Pre-bundle common libraries for faster dev startup
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'framer-motion',
      'lucide-react',
      '@tanstack/react-query',
      'react-table',
    ],
  },
});