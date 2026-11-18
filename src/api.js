// Thin client for the NestJS CRUD API (see ../backend/API_ROUTES.md).
//
// In dev/preview the browser calls /api on the Vite origin and Vite proxies it
// to VITE_API_PROXY_TARGET (see vite.config.js). A production build cannot use
// that proxy, so it calls the deployed API directly. Override the production
// URL with VITE_API_BASE_URL when the API moves.
const PRODUCTION_API_BASE = 'https://kiosk-api-znxy.onrender.com'

/**
 * Resolve the API origin for this build.
 * @param {string | undefined} configuredBase `VITE_API_BASE_URL` from the build env.
 * @param {boolean} isProduction whether this is a production build.
 */
export function resolveApiBase(configuredBase, isProduction) {
  const base = configuredBase?.trim() || (isProduction ? PRODUCTION_API_BASE : '/api')
  return base.replace(/\/+$/, '') || '/api'
}

const API_BASE = resolveApiBase(
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.PROD,
)

export { API_BASE }

async function request(path, { headers, ...options } = {}) {
  // FormData requests must let the browser set the multipart boundary.
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      // Sessions are carried in an HTTP-only cookie.
      credentials: 'include',
      headers: {
        ...(isFormData ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
    })
  } catch {
    throw new Error(`Cannot reach the API at ${API_BASE}. Is the backend running?`)
  }

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (Array.isArray(body.message)) message = body.message.join(', ')
      else if (body.message) message = body.message
    } catch {
      // Non-JSON error body; keep the HTTP status text.
    }
    const error = new Error(message)
    error.status = res.status
    throw error
  }

  if (res.status === 204) return null
  const body = await res.text()
  return body ? JSON.parse(body) : null
}

/** Server-Sent Events stream that pushes new chat messages to the UI. */
export const CHAT_EVENTS_URL = `${API_BASE}/chat-events/stream`

/**
 * Turn an API-relative file path (e.g. `/listing-images/1/file`) into a URL the
 * browser can load through the dev proxy.
 */
export const mediaUrl = (path) => (path ? `${API_BASE}${path}` : '')

/**
 * Record one listing page view. Fire-and-forget: a failure must never affect the
 * page, and `keepalive` lets the request finish when the visitor navigates away.
 * The API dedupes per visitor and day and ignores the owner's own visits.
 */
export function trackListingView(listingId, { source = null, language = null } = {}) {
  const body = {}
  if (source) body.source = source
  if (language) body.language = language

  return fetch(`${API_BASE}/listings/${listingId}/view`, {
    method: 'POST',
    credentials: 'include',
    keepalive: true,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => null)
}

/** Views and contacts for one listing (owner, or admin). */
export function fetchListingStats(listingId, { days = 14 } = {}) {
  return request(`/listings/${listingId}/stats?days=${days}`)
}

/**
 * Full-page Google sign-in: the API redirects to Google and back to the site,
 * so this is a normal link rather than a fetch. `from` is a local path the
 * callback returns to.
 */
export function googleSignInUrl(from = '/search') {
  return `${API_BASE}/auth/google?from=${encodeURIComponent(from)}`
}

/** Link Google to the signed-in account (profile action). */
export function googleLinkUrl(from = '/app') {
  return `${API_BASE}/auth/google?link=1&from=${encodeURIComponent(from)}`
}

/** Social identities attached to the signed-in account. */
export function fetchAuthProviders() {
  return request('/auth/providers')
}

export const api = {
  list: (resource) => request(`/${resource}`),
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  /** Signup: creates the account and signs it in (same session cookie as login). */
  register: (name, email, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, acceptTerms: true }),
    }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  create: (resource, body, _actorId) =>
    request(`/${resource}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  /** POST a `FormData` body (multipart upload) without JSON encoding. */
  upload: (resource, formData, _actorId) =>
    request(`/${resource}`, {
      method: 'POST',
      body: formData,
    }),
  update: (resource, id, body, _actorId) =>
    request(`/${resource}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  remove: (resource, id, _actorId) =>
    request(`/${resource}/${id}`, {
      method: 'DELETE',
    }),
  /** Region for this visitor, resolved by the API from the request IP. */
  detectRegion: () => request('/regions/detect'),
}

let descriptionsPromise

/**
 * Load `/descriptions` once. The i18n provider and the regular data load both
 * need this response, so they share the same in-flight request. A failed load
 * clears the cache so a later retry can try again.
 */
export function loadDescriptions() {
  descriptionsPromise ??= api.list('descriptions').catch((error) => {
    descriptionsPromise = undefined
    throw error
  })
  return descriptionsPromise
}

const RESOURCES = [
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
  'chat-threads',
  'chat-messages',
  'inbox-items',
  'listing-chat-threads',
  'listing-images',
]

/** Resources that only exist for a signed-in user; guests skip the requests. */
const privateResources = new Set([
  'chat-threads',
  'chat-messages',
  'inbox-items',
  'listing-chat-threads',
])

/** Fetch every resource the UI needs, in parallel. Guests skip chat rows. */
export async function fetchKioskData({ signedIn = false } = {}) {
  const resources = signedIn
    ? RESOURCES
    : RESOURCES.filter((resource) => !privateResources.has(resource))

  const rows = await Promise.all(
    resources.map((resource) =>
      resource === 'descriptions'
        ? loadDescriptions()
        : api.list(resource),
    ),
  )

  const data = Object.fromEntries(RESOURCES.map((resource) => [resource, []]))
  resources.forEach((resource, index) => {
    data[resource] = rows[index]
  })
  return data
}
