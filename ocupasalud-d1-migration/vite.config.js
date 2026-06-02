import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Config based on ocupasalud + fix for lucide-react chunk-splitting bug
// References: vitejs/vite#20202, vitejs/vite#5142
export default defineConfig({
  plugins: [react()],
  // Force pre-bundle lucide-react as single module (fixes dev/build difference)
  optimizeDeps: {
    include: ['lucide-react'],
  },
  // Resolve alias to force single entry point
  resolve: {
    alias: {
      'lucide-react': 'lucide-react/dist/esm/lucide-react.js',
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Same as ocupasalud: react and lucide as dedicated vendor chunks
        manualChunks: {
          react: ['react', 'react-dom'],
          lucide: ['lucide-react'],
        },
      },
    },
  },
});
