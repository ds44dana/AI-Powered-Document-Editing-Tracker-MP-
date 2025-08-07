import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // External packages that shouldn't be bundled
      external: [
        // Add any packages here that cause issues during build
      ]
    }
  }
});