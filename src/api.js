// Thin client for the NestJS CRUD API (see ../backend/API_ROUTES.md).
// In dev, Vite proxies /api → http://localhost:3000 (see vite.config.js).
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

async function request(path, { headers, ...options } = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { 'content-type': 'application/json', ...headers },
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

export const api = {
  list: (resource) => request(`/${resource}`),
  create: (resource, body, actorId) =>
    request(`/${resource}`, {
      method: 'POST',
      body: JSON.stringify(body),
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
  'descriptions',
  'categories',
  'listings',
  'facet-schemas',
  'facet-value-options',
  'facet-value-selections',
  'chat-threads',
  'chat-messages',
  'inbox-lists',
  'inbox-items',
  'listing-chat-threads',
]

/** Fetch every resource the UI needs, in parallel. */
export async function fetchKioskData() {
  const rows = await Promise.all(RESOURCES.map((resource) => api.list(resource)))
  return Object.fromEntries(RESOURCES.map((resource, index) => [resource, rows[index]]))
}
