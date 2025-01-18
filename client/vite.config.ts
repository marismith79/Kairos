import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
// import * as dotenv from 'dotenv';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  css: {
    postcss: './postcss.config.js'
  },
  server: {
    port: 5173, // Default port for Vite
    open: true, // Automatically open the browser on server start
    strictPort: true, // Ensure the server exits if the port is unavailable
  },
  build: {
    outDir: 'dist', // Output directory for the build
    assetsDir: 'assets', // Directory for static assets
    sourcemap: true, // Generate source maps for debugging
  },
  preview: {
    port: 4173, // Port for the preview server
    strictPort: true, // Ensure the server exits if the port is unavailable
  },
  define: {
    __VITE_STADIA_API_KEY__: JSON.stringify(process.env.VITE_STADIA_API_KEY),
    __VITE_HUME_API_KEY__: JSON.stringify(process.env.VITE_HUME_API_KEY),
    __VITE_HUME_SECRET_KEY__: JSON.stringify(process.env.VITE_HUME_SECRET_KEY),
  },
});

