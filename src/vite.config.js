import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // External packages that shouldn't be bundled
      external: [
        // Add any packages that cause issues during build
      ]
    }
  },
  // Add resolve options to help with problematic imports
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // Add any aliases if needed
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['jszip', 'mammoth', 'pdfjs-dist']
  }
});