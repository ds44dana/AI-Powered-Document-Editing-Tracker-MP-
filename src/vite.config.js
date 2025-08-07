import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // External packages that shouldn't be bundled
      external: ['mammoth', 'tesseract.js']
    }
  },
  // Add resolve options to help with problematic imports
  resolve: {
    dedupe: ['react', 'react-dom']
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['jszip'],
    exclude: ['mammoth', 'tesseract.js']
  },
  // Make Vite less strict about dynamic imports
  esbuild: {
    logOverride: {
      'this-is-undefined-in-esm': 'silent'
    }
  },
  // For PDF.js worker setup
  worker: {
    format: 'es'
  }
});