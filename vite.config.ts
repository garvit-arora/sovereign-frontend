import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// In development Vite proxies API calls to the separate coordinator.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.SOVEREIGN_BACKEND_URL || 'http://127.0.0.1:8000',
        // Preserve the browser-facing host so the coordinator's same-origin
        // check also works during local development.
        changeOrigin: false,
      },
    },
  },
})
