import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The NestJS API has no /api prefix and no CORS config, so dev/preview proxy
// /api/* to it. Override with VITE_API_BASE_URL for other deployments.
const apiProxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    globals: true,
  },
})
