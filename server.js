// HTTP server for the kiosk frontend: static assets, the SPA shell and
// server-rendered listing pages.
//
// Development (`node server.js --dev`) uses Vite in middleware mode so the SSR
// entry hot-reloads. Production serves `dist/` and the SSR bundle from `.ssr/`.
//
// Only `/listing/:id` is rendered on the server; the interactive app (`/app`,
// `/search`, `/results`, `/login`) still boots as an SPA so signed-in screens
// never need a per-request server render.
import compression from 'compression'
import express from 'express'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadCatalog, loadListingPage, loadSession as loadSessionFromApi, resolveServerApiBase } from './src/data.server.js'
import {
  buildListingHead,
  notFoundHead,
  renderDocument,
} from './src/server-head.js'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.join(ROOT, 'dist')
const INDEX_HTML = path.join(ROOT, 'index.html')
const SSR_ENTRY = path.join(ROOT, '.ssr', 'entry-server.js')

/** Routes the client renders itself (the server only returns the shell). */
const SPA_ROUTES = new Set([
  '/',
  '/search',
  '/results',
  '/app',
  '/login',
  '/signup',
  '/terms',
  '/privacy',
])
const LANGUAGES = new Set(['en', 'hr'])
const HTML = 'text/html; charset=utf-8'
const LISTING_CACHE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'

/** UI language from `?lang=`, else the `kiosk-language` cookie, else English. */
export function pickLanguage(headers = {}, query = {}) {
  const fromQuery = String(query.lang ?? '').toLowerCase()
  if (LANGUAGES.has(fromQuery)) return fromQuery

  const cookie = headers.cookie ?? ''
  const match = /(?:^|;\s*)kiosk-language=([^;]+)/.exec(cookie)
  const fromCookie = match ? decodeURIComponent(match[1]).toLowerCase() : ''
  return LANGUAGES.has(fromCookie) ? fromCookie : 'en'
}

/** Public site origin used in canonical/Open Graph URLs. */
export function publicOrigin(req) {
  const configured = (process.env.PUBLIC_ORIGIN ?? '').trim()
  if (configured) return configured.replace(/\/+$/, '')
  return `${req.protocol}://${req.get('host')}`
}

/** Absolute URL used for catalog images (`og:image` must be publicly reachable). */
function publicApiBase(apiBase) {
  const configured = (process.env.PUBLIC_API_URL ?? '').trim()
  return (configured || apiBase || '').replace(/\/+$/, '')
}

/** XML sitemap for every active listing. */
export function buildSitemap(data, origin) {
  const base = String(origin ?? '').replace(/\/+$/, '')
  const urls = (data?.listings ?? [])
    .filter((listing) => listing.isActive !== false)
    .map((listing) => {
      const lastmod = listing.updatedAt
        ? new Date(listing.updatedAt).toISOString().slice(0, 10)
        : null
      return [
        '  <url>',
        `    <loc>${base}/listing/${listing.id}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
        '    <changefreq>daily</changefreq>',
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n')
    })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}

const ERROR_PAGE = (message) => `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Kiosk</title><meta name="robots" content="noindex" /></head>
  <body style="font-family: system-ui, sans-serif; padding: 48px; text-align: center;">
    <h1>${message}</h1>
    <p><a href="/">Reload the marketplace</a></p>
  </body>
</html>`

/**
 * Build the Express app. Everything request-scoped is injectable so the routes
 * can be tested without a real API or a Vite instance.
 */
export async function createApp({
  getTemplate,
  renderApp,
  loadListing = loadListingPage,
  loadCatalogData = loadCatalog,
  loadSession = loadSessionFromApi,
  apiBase = resolveServerApiBase(),
  staticDir = null,
  extraMiddleware = [],
} = {}) {
  if (typeof getTemplate !== 'function' || typeof renderApp !== 'function') {
    throw new Error('createApp requires getTemplate and renderApp')
  }

  const app = express()
  app.set('trust proxy', true)
  app.disable('x-powered-by')
  app.use(compression())

  app.get('/healthz', (_req, res) => res.type('text/plain').send('ok'))

  app.get('/robots.txt', (req, res) => {
    const origin = publicOrigin(req)
    res
      .type('text/plain')
      .send(
        [
          'User-agent: *',
          'Allow: /',
          'Disallow: /app',
          'Disallow: /login',
          'Disallow: /signup',
          'Disallow: /api/',
          '',
          `Sitemap: ${origin}/sitemap.xml`,
          '',
        ].join('\n'),
      )
  })

  app.get('/sitemap.xml', async (req, res, next) => {
    try {
      const data = await loadCatalogData({ base: apiBase })
      res
        .type('application/xml')
        .set('cache-control', 'public, max-age=0, s-maxage=600')
        .send(buildSitemap(data, publicOrigin(req)))
    } catch (error) {
      next(error)
    }
  })

  /** Send the client shell (no SSR markup, no boot payload). */
  async function sendShell(req, res, { status = 200, head = null, language = null } = {}) {
    const template = await getTemplate(req.originalUrl)
    const html = renderDocument({ template, head, appHtml: '', language })
    res
      .status(status)
      .type('html')
      .set('cache-control', status === 200 ? 'no-cache' : 'no-store')
      .send(html)
  }

  app.get('/listing/:id', async (req, res, next) => {
    const id = Number(req.params.id)
    const origin = publicOrigin(req)

    // Non-numeric ids (`/listing/abc`) are not listings at all.
    if (!Number.isInteger(id) || id <= 0) {
      await sendShell(req, res, { status: 404, head: notFoundHead({ origin }) })
      return
    }

    try {
      const page = await loadListing(id, { base: apiBase })
      const language = pickLanguage(req.headers, req.query)

      // Unknown id or an unpublished draft: 404, but still boot the SPA so the
      // owner's session can show its own draft instead of a dead end.
      if (!page) {
        await sendShell(req, res, { status: 404, head: notFoundHead({ origin }) })
        return
      }

      const template = await getTemplate(req.originalUrl)
      const { html } = renderApp({
        url: req.originalUrl,
        data: page.data,
        strings: page.strings,
        language,
      })
      const head = buildListingHead({
        data: page.data,
        listingId: id,
        language,
        origin,
        apiBase: publicApiBase(apiBase),
      })

      res
        .status(200)
        .type('html')
        .set('cache-control', LISTING_CACHE)
        .send(
          renderDocument({
            template,
            head,
            appHtml: html,
            language,
            // `strings` is already the dictionary map; send the same snapshot to
            // the browser so hydration matches the server markup.
            boot: { data: page.data, strings: page.strings, language },
          }),
        )
    } catch (error) {
      next(error)
    }
  })

  // Dev: Vite's middlewares (HMR client, source files, public assets).
  for (const middleware of extraMiddleware) app.use(middleware)

  // Production: the built client. `/assets/*` is content-hashed, everything
  // else (icons, manifest, service worker) stays short-lived.
  if (staticDir) {
    app.use(
      '/assets',
      express.static(path.join(staticDir, 'assets'), {
        immutable: true,
        maxAge: '1y',
        fallthrough: true,
      }),
    )
    app.use(
      express.static(staticDir, {
        index: false,
        // Route-shell directories (`dist/search/index.html`) must not turn
        // `/search` into a 301 to `/search/`: those paths belong to the server.
        redirect: false,
        maxAge: '1h',
        setHeaders(res, filePath) {
          if (/(sw\.js|registerSW\.js|manifest\.webmanifest)$/.test(filePath)) {
            res.setHeader('cache-control', 'no-cache')
          }
        },
      }),
    )
  }

  // Client-side routes get the shell; anything else is a real 404.
  app.use(async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    try {
      const route = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path

      // `/app` is the signed-in dashboard. Answer guests here so a direct visit
      // never even receives the app shell; an unreachable API (`undefined`)
      // still gets the shell, where the client guard retries.
      if (route === '/app') {
        const session = await loadSession({
          base: apiBase,
          cookie: req.headers.cookie ?? '',
        })
        if (session === null) {
          res
            .status(302)
            .set('cache-control', 'no-store')
            .redirect(`/login?from=${encodeURIComponent(req.originalUrl)}`)
          return
        }
      }

      const known = SPA_ROUTES.has(route)
      await sendShell(req, res, {
        status: known ? 200 : 404,
        head: known ? null : notFoundHead({ origin: publicOrigin(req) }),
        language: pickLanguage(req.headers, req.query),
      })
    } catch (error) {
      next(error)
    }
  })

  // eslint-disable-next-line no-unused-vars -- Express needs the 4-argument shape.
  app.use((error, req, res, _next) => {
    console.error('[server]', error)
    if (res.headersSent) return
    res
      .status(503)
      .type(HTML)
      .set('cache-control', 'no-store')
      .set('retry-after', '30')
      .send(ERROR_PAGE('The marketplace is temporarily unavailable.'))
  })

  return app
}

/** Development: Vite in middleware mode renders the SSR entry on each request. */
async function startDev(port) {
  const { createServer } = await import('vite')
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })

  const app = await createApp({
    // The template is re-read each request so `index.html` edits show up.
    getTemplate: async (url) =>
      vite.transformIndexHtml(url, await readFile(INDEX_HTML, 'utf8')),
    renderApp: (await vite.ssrLoadModule('/src/entry-server.jsx')).renderApp,
    extraMiddleware: [vite.middlewares],
  })

  app.listen(port, () => {
    console.log(`[server] SSR dev server: http://localhost:${port}`)
    console.log(
      '[server] Vite runs in middleware mode (plain HTTP). For the HTTPS SPA-only dev server use: npm run dev:spa',
    )
  })
}

/** Production: serve the client build and the bundled SSR entry. */
async function startProduction(port) {
  const template = await readFile(path.join(DIST, 'index.html'), 'utf8')
  const { renderApp } = await import(pathToFileURL(SSR_ENTRY).href)

  const app = await createApp({
    getTemplate: async () => template,
    renderApp,
    staticDir: DIST,
  })

  app.listen(port, () => {
    const base = resolveServerApiBase()
    console.log(`[server] listening on ${port} (API ${base})`)
  })
}

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  const port = Number(process.env.PORT) || 5173
  const dev =
    process.argv.includes('--dev') ||
    process.env.NODE_ENV === 'development' ||
    !existsSync(path.join(DIST, 'index.html'))

  const start = dev ? startDev : startProduction
  start(port).catch((error) => {
    console.error('[server] failed to start', error)
    process.exitCode = 1
  })
}
