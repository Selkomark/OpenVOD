import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Needed for docker port mapping
    port: 5173,
    hmr: {
        host: 'localhost',
    },
    proxy: {
      '/api': {
        target: 'http://api:3000',
        changeOrigin: true,
      },
      '/storage': {
        target: 'http://api:3000',
        changeOrigin: true,
      }
    }
  },
});
