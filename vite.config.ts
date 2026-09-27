import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'

// The development server stays on loopback and forwards browser API calls to the
// selected coordinator. Production routing is configured separately in vercel.js.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, 'SOVEREIGN_')
  const backend = process.env.SOVEREIGN_BACKEND_URL || env.SOVEREIGN_BACKEND_URL || 'http://127.0.0.1:8000'
  const backendOrigin = new URL(backend).origin

  return {
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
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          target: backend,
          changeOrigin: true,
          // Render checks the Origin on authenticated browser requests. This
          // trusted loopback-only development proxy speaks as the backend origin.
          headers: { Origin: backendOrigin },
          configure(proxy) {
            if (!backend.startsWith('https://')) return
            proxy.on('proxyRes', (response) => {
              // Browsers cannot return a Secure cookie to an HTTP local preview.
              // This changes only the local proxy response, never Render's cookie.
              const cookies = response.headers['set-cookie']
              if (cookies) response.headers['set-cookie'] = cookies.map(cookie => cookie.replace(/;\s*Secure(?=;|$)/gi, ''))
            })
          },
        },
      },
    },
  }
})
