// Server-side data loading for the pages that are rendered on the server.
//
// This file is imported by the SSR entry only. It never runs in the browser:
// the browser keeps using `api.js` against the public API.
//
// The API stays resource-oriented (`/listings`, `/categories`, ...). Putting the
// per-page composition here — rather than adding `/pages/...` routes to Nest —
// keeps frontend routes out of the backend: a new page only adds a function in
// this file, not an endpoint.
//
// `buildViewModel()` expects the same bundle as `fetchKioskData()`, so the
// catalog below mirrors its resources minus the chat ones, which only the
// signed-in `/app` screen needs.
import { createStrings } from './strings.js'

const DEFAULT_API_BASE = 'http://localhost:3000'

/** Resources that make up the public catalog shown by /results and /listing/:id. */
export const CATALOG_RESOURCES = [
  'users',
  'languages',
  'descriptions',
  'categories',
  'regions',
  'listings',
  'listing-translations',
  'facet-schemas',
  'facet-value-options',
  'facet-value-selections',
  'listing-images',
]

/** How long a catalog snapshot may be reused, in milliseconds. */
export const DEFAULT_CATALOG_MAX_AGE = 30_000

const REQUEST_TIMEOUT_MS = 5_000

/**
 * Resolve the API origin for server-side calls. On Render this is the private
 * service URL, which keeps the round trip inside the platform network.
 */
export function resolveServerApiBase(env = process.env) {
  const configured =
    env?.API_URL ||
    env?.VITE_API_BASE_URL ||
    import.meta.env?.VITE_API_BASE_URL ||
    ''
  return (configured.trim() || DEFAULT_API_BASE).replace(/\/+$/, '')
}

function timeoutSignal(ms = REQUEST_TIMEOUT_MS) {
  if (typeof AbortSignal === 'undefined' || !AbortSignal.timeout) return undefined
  return AbortSignal.timeout(ms)
}

async function fetchJson(base, path, fetchImpl) {
  let response
  try {
    response = await fetchImpl(`${base}${path}`, {
      headers: { accept: 'application/json' },
      signal: timeoutSignal(),
    })
  } catch (error) {
    throw new Error(`Cannot reach the API at ${base}: ${error.message}`)
  }

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}`)
  }

  return response.json()
}

/**
 * Resolve the browser session on the server by forwarding its cookie to
 * `/auth/me`.
 *
 * Returns the user, `null` when the API says the visitor is a guest, and
 * `undefined` when the check could not be made (the API is unreachable), so a
 * caller can avoid treating an outage as a sign-out.
 */
export async function loadSession({
  fetchImpl = fetch,
  base = resolveServerApiBase(),
  cookie = '',
} = {}) {
  if (!cookie) return null

  try {
    const response = await fetchImpl(`${base}/auth/me`, {
      headers: { accept: 'application/json', cookie },
      signal: timeoutSignal(),
    })
    if (response.status === 401) return null
    if (!response.ok) return undefined
    return await response.json()
  } catch {
    return undefined
  }
}

// One snapshot per process. The catalog changes only when someone edits it, so
// a short TTL removes a burst of identical queries without making edits wait
// for long. In-flight requests are shared so a second render joins the first.
let cachedCatalog = null
let catalogRequest = null

/** Drop the cached snapshot. Used by tests and after a known catalog change. */
export function clearCatalogCache() {
  cachedCatalog = null
  catalogRequest = null
}

/**
 * Load every resource `buildViewModel()` needs, in parallel, and cache the
 * result for `maxAge` milliseconds.
 */
export function loadCatalog({
  fetchImpl = fetch,
  base = resolveServerApiBase(),
  maxAge = DEFAULT_CATALOG_MAX_AGE,
} = {}) {
  if (cachedCatalog && Date.now() - cachedCatalog.loadedAt < maxAge) {
    return Promise.resolve(cachedCatalog.data)
  }
  if (catalogRequest) return catalogRequest

  catalogRequest = Promise.all(
    CATALOG_RESOURCES.map((resource) => fetchJson(base, `/${resource}`, fetchImpl)),
  )
    .then((rows) => {
      const data = Object.fromEntries(
        CATALOG_RESOURCES.map((resource, index) => [resource, rows[index]]),
      )
      cachedCatalog = { data, loadedAt: Date.now() }
      return data
    })
    .finally(() => {
      catalogRequest = null
    })

  return catalogRequest
}

/**
 * Data for `/results`. The query string is applied by the browser from the same
 * catalog (`filterListings` in `searchQuery.js`), so a shared or edited URL
 * produces the same rows on the server and after hydration.
 */
export async function loadResultsPage(options = {}) {
  const data = await loadCatalog(options)
  return { data, strings: createStrings(data.descriptions) }
}

/**
 * Data for `/listing/:id`, or `null` when the listing does not exist or is an
 * unpublished draft. Drafts are private to their owner, and the server renders
 * the public version of the page, so it cannot show them.
 */
export async function loadListingPage(listingId, options = {}) {
  const id = Number(listingId)
  if (!Number.isInteger(id) || id <= 0) return null

  const data = await loadCatalog(options)
  const listing = (data.listings ?? []).find(
    (row) => Number(row.id) === id && row.isActive !== false,
  )
  if (!listing) return null

  return {
    data,
    listingId: listing.id,
    strings: createStrings(data.descriptions),
  }
}
