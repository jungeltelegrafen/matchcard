import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const appRoot = fileURLToPath(new URL('.', import.meta.url))
const sharedLib = fileURLToPath(new URL('../../lib', import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = process.env.API_PORT || env.API_PORT || '3000'

  return {
    base: mode === 'production' ? '/cv-generator/' : '/',
    plugins: [react()],
    resolve: {
      alias: {
        // Shared CV schema/path utilities at the monorepo root (lib/cv/*),
        // also imported by the Next.js API routes via @/lib — single source of truth.
        '@lib': sharedLib,
      },
    },
    optimizeDeps: {
      exclude: ['pdfjs-dist'],
    },
    server: {
      port: 5199,
      fs: {
        allow: [appRoot, sharedLib],
      },
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', () => {})
          },
        },
      },
    },
    test: {
      environment: 'node',
    },
  }
})
