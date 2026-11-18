// Build the server render entry only.
//
// The client build (PWA plugin, route shells) stays in `vite.config.js`; this
// config produces `.ssr/entry-server.js`, which `server.js` imports at runtime.
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    ssr: 'src/entry-server.jsx',
    outDir: '.ssr',
    emptyOutDir: true,
    // Relative imports are bundled; dependencies stay external so the server
    // uses the same `node_modules` (react, react-router, …) as the process.
    rollupOptions: { output: { format: 'es' } },
  },
})
