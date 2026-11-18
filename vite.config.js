import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import mkcert from 'vite-plugin-mkcert'
import { copyFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

/**
 * Static hosts only serve files that exist. Emit an index.html shell for each
 * fixed app route so a direct visit to /search or /results works even when the
 * host has no SPA rewrite rule. /listing/:id still needs the host rewrite.
 */
function routeShells(routes) {
  let root = process.cwd()
  let outDir = 'dist'

  return {
    name: 'kiosk-route-shells',
    apply: 'build',
    configResolved(config) {
      root = config.root
      outDir = config.build.outDir
    },
    async closeBundle() {
      const publishDir = resolve(root, outDir)
      const shell = resolve(publishDir, 'index.html')
      await Promise.all(
        routes.map(async (route) => {
          const routeDir = resolve(publishDir, route)
          await mkdir(routeDir, { recursive: true })
          await copyFile(shell, resolve(routeDir, 'index.html'))
          // Also emit /route.html: some static hosts resolve /route to it
          // instead of /route/index.html.
          await copyFile(shell, resolve(publishDir, `${route}.html`))
        }),
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // The browser always calls `/api` on the Vite origin; this is the backend
  // that the dev/preview server proxies those requests to.
  const apiTarget = env.VITE_API_PROXY_TARGET;

  // The NestJS API has no /api prefix, so dev/preview proxy /api/* to it.
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
      // mkcert only exists to give the *local dev server* a trusted HTTPS
      // certificate: it downloads a CA binary from GitHub while Vite resolves
      // the config. That must never happen in CI or on Render (rate limits, no
      // network guarantees), so the plugin is loaded for `vite dev` only and is
      // absent from `vite build`.
      ...(command === 'serve' ? [mkcert()] : []),
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
      }),
      routeShells(['app', 'login', 'results', 'search']),
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