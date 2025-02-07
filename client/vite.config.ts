import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as dotenv from 'dotenv';

export default defineConfig({
  plugins: [react()],
  build: {
    target: "ESNEXT",
    outDir: 'dist',
    emptyOutDir: true
  },
  define: {
    define: {
      __VITE_STADIA_API_KEY__: JSON.stringify(process.env.VITE_STADIA_API_KEY),
      __VITE_HUME_API_KEY__: JSON.stringify(process.env.VITE_HUME_API_KEY),
      __VITE_HUME_SECRET_KEY__: JSON.stringify(process.env.VITE_HUME_SECRET_KEY),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});