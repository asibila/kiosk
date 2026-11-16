// Thin client for the NestJS CRUD API (see ../backend/API_ROUTES.md).
// The browser always calls /api on the Vite origin. In dev/preview, Vite
// proxies it to VITE_API_PROXY_TARGET (see vite.config.js).
const API_BASE = '/api'

export { API_BASE }

async function request(path, { headers, ...options } = {}) {
  // FormData requests must let the browser set the multipart boundary.
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
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
    throw new Error(message)
  }

  if (res.status === 204) return null
  return res.json()
}

const actorHeader = (actorId) => (actorId ? { 'x-actor-id': String(actorId) } : {})

/** Server-Sent Events stream that pushes new chat messages to the UI. */
export const CHAT_EVENTS_URL = `${API_BASE}/chat-events/stream`

/**
 * Turn an API-relative file path (e.g. `/listing-images/1/file`) into a URL the
 * browser can load through the dev proxy.
 */
export const mediaUrl = (path) => (path ? `${API_BASE}${path}` : '')

export const api = {
  list: (resource) => request(`/${resource}`),
  create: (resource, body, actorId) =>
    request(`/${resource}`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: actorHeader(actorId),
    }),
  /** POST a `FormData` body (multipart upload) without JSON encoding. */
  upload: (resource, formData, actorId) =>
    request(`/${resource}`, {
      method: 'POST',
      body: formData,
      headers: actorHeader(actorId),
    }),
  update: (resource, id, body, actorId) =>
    request(`/${resource}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: actorHeader(actorId),
    }),
  remove: (resource, id, actorId) =>
    request(`/${resource}/${id}`, {
      method: 'DELETE',
      headers: actorHeader(actorId),
    }),
}

const RESOURCES = [
  'users',
  'languages',
  'descriptions',
  'categories',
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

/** Fetch every resource the UI needs, in parallel. */
export async function fetchKioskData() {
  const rows = await Promise.all(RESOURCES.map((resource) => api.list(resource)))
  return Object.fromEntries(RESOURCES.map((resource, index) => [resource, rows[index]]))
}
