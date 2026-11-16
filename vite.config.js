import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import mkcert from 'vite-plugin-mkcert'



// https://vite.dev/config/
export default defineConfig( ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // The browser always calls `/api` on the Vite origin; this is the backend
  // that the dev/preview server proxies those requests to.
  const apiTarget = env.VITE_API_PROXY_TARGET;

  // The NestJS API has no /api prefix and no CORS config, so dev/preview proxy
  // /api/* to it.
  const apiProxy = apiTarget
    ? {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      }
    : undefined;


  return {
    plugins: [
      react(),
      mkcert(), // Generates a locally-trusted certificate on first run
      VitePWA({
        registerType: 'autoUpdate',
        // The plugin will automatically generate manifest and service worker
        manifest: {
          name: 'Kiosk',
          short_name: 'Kiosk',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'icon-192.png', // You need to prepare the icon file
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512.png', // You need to prepare the icon file
              sizes: '512x512',
              type: 'image/png'
            }
          ]
        }
      })
    ],
    server: {
      proxy: apiProxy,
      host: '0.0.0.0', // Required so your phone can reach the dev server
      https: true,     // mkcert injects the certificate here
    },
    preview: {
      proxy: apiProxy,
      host: '0.0.0.0',
      https: true,
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      globals: true,
    },
  }
});