// HTTP behaviour of the SSR server: which routes render, which return the SPA
// shell, status codes and the 404/error paths.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildSitemap, createApp, pickLanguage } from './server.js'

const TEMPLATE = `<!doctype html>
<html lang="en">
  <head><!--ssr-head--><title>Default</title><!--/ssr-head--></head>
  <body><div id="root"><!--ssr-outlet--></div><script type="module" src="/assets/app.js"></script></body>
</html>`

const catalog = {
  descriptions: [],
  categories: [],
  regions: [],
  listings: [
    { id: 10, categoryId: 1, isActive: true, price: 250, updatedAt: '2026-01-02T00:00:00.000Z' },
    { id: 11, categoryId: 1, isActive: false, price: null, updatedAt: '2026-01-03T00:00:00.000Z' },
  ],
  'listing-translations': [],
  'facet-schemas': [],
  'facet-value-options': [],
  'facet-value-selections': [],
  'listing-images': [],
}

function createTestApp(overrides = {}) {
  return createApp({
    getTemplate: async () => TEMPLATE,
    renderApp: ({ url, language }) => ({
      html: `<main data-url="${url}" data-language="${language}">server rendered</main>`,
    }),
    loadListing: async (id) => (Number(id) === 10 ? { data: catalog, strings: {} } : null),
    loadCatalogData: async () => catalog,
    apiBase: 'https://api.test',
    staticDir: null,
    ...overrides,
  })
}

beforeEach(() => {
  delete process.env.PUBLIC_ORIGIN
  delete process.env.PUBLIC_API_URL
})

afterEach(() => {
  delete process.env.PUBLIC_ORIGIN
})

describe('GET /listing/:id', () => {
  it('server-renders the page with boot data and a cacheable response', async () => {
    const app = await createTestApp()
    const res = await request(app).get('/listing/10')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
    expect(res.headers['cache-control']).toContain('s-maxage=60')
    expect(res.text).toContain('<main data-url="/listing/10" data-language="en">')
    expect(res.text).toContain('window.__KIOSK_BOOT__')
    expect(res.text).toContain('<title>')
  })

  it('uses the ?lang parameter for the render', async () => {
    const app = await createTestApp()
    const res = await request(app).get('/listing/10?lang=hr')

    expect(res.text).toContain('data-language="hr"')
    expect(res.text).toContain('<html lang="hr">')
  })

  it('returns 404 with noindex and no boot payload for an unknown listing', async () => {
    const app = await createTestApp()
    const res = await request(app).get('/listing/999')

    expect(res.status).toBe(404)
    expect(res.text).toContain('noindex')
    expect(res.text).not.toContain('__KIOSK_BOOT__')
    expect(res.text).toContain('<div id="root"></div>')
  })

  it('returns 404 for an id that is not a number', async () => {
    const app = await createTestApp()
    const res = await request(app).get('/listing/abc')

    expect(res.status).toBe(404)
  })

  it('responds 503 when the API is unavailable', async () => {
    const app = await createTestApp({
      loadListing: async () => {
        throw new Error('connect ECONNREFUSED')
      },
    })
    const res = await request(app).get('/listing/10')

    expect(res.status).toBe(503)
    expect(res.headers['retry-after']).toBe('30')
    expect(res.text).toContain('temporarily unavailable')
  })
})

describe('SPA shell routes', () => {
  it.each(['/', '/search', '/results', '/app', '/login', '/search/'])(
    'serves the shell for %s',
    async (route) => {
      const app = await createTestApp()
      const res = await request(app).get(route)

      expect(res.status).toBe(200)
      expect(res.text).toContain('<div id="root"></div>')
      expect(res.text).not.toContain('__KIOSK_BOOT__')
      expect(res.text).toContain('<title>Default</title>')
    },
  )

  it('returns 404 for an unknown route', async () => {
    const app = await createTestApp()
    const res = await request(app).get('/does-not-exist')

    expect(res.status).toBe(404)
    expect(res.text).toContain('noindex')
  })

  it('does not redirect a route that also has a build-time shell directory', async () => {
    // `routeShells()` writes `dist/search/index.html`; express.static must not
    // turn `/search` into a 301 to `/search/`.
    const staticDir = await mkdtemp(path.join(tmpdir(), 'kiosk-static-'))
    await mkdir(path.join(staticDir, 'search'), { recursive: true })
    await writeFile(
      path.join(staticDir, 'search', 'index.html'),
      '<!doctype html><title>stale shell</title>',
    )

    try {
      const app = await createTestApp({ staticDir })
      const res = await request(app).get('/search')

      expect(res.status).toBe(200)
      expect(res.text).toContain('<title>Default</title>')
      expect(res.text).not.toContain('stale shell')
    } finally {
      await rm(staticDir, { recursive: true, force: true })
    }
  })
})

describe('robots.txt / sitemap.xml / healthz', () => {
  it('serves robots.txt with the sitemap URL', async () => {
    const app = await createTestApp()
    const res = await request(app).get('/robots.txt')

    expect(res.status).toBe(200)
    expect(res.text).toContain('Disallow: /app')
    expect(res.text).toContain('Sitemap: http://127.0.0.1')
    expect(res.text).toContain('/sitemap.xml')
  })

  it('serves a sitemap with the active listings only', async () => {
    const app = await createTestApp()
    const res = await request(app).get('/sitemap.xml')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toMatch(/xml/)
    expect(res.text).toContain('/listing/10</loc>')
    expect(res.text).toContain('<lastmod>2026-01-02</lastmod>')
    expect(res.text).not.toContain('/listing/11</loc>')
  })

  it('answers the health check', async () => {
    const app = await createTestApp()
    const res = await request(app).get('/healthz')

    expect(res.status).toBe(200)
    expect(res.text).toBe('ok')
  })
})

describe('pickLanguage', () => {
  it('prefers ?lang over the cookie', () => {
    expect(pickLanguage({ cookie: 'kiosk-language=en' }, { lang: 'hr' })).toBe('hr')
  })

  it('reads the language cookie', () => {
    expect(pickLanguage({ cookie: 'a=1; kiosk-language=hr' }, {})).toBe('hr')
  })

  it('falls back to English', () => {
    expect(pickLanguage({}, {})).toBe('en')
    expect(pickLanguage({ cookie: 'kiosk-language=de' }, { lang: 'xx' })).toBe('en')
  })
})

describe('buildSitemap', () => {
  it('writes one url per active listing', () => {
    const xml = buildSitemap(catalog, 'https://site.test/')

    expect(xml).toContain('<loc>https://site.test/listing/10</loc>')
    expect(xml).not.toContain('listing/11')
  })
})
