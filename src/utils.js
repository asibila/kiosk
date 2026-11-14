// Small shared helpers.

let counter = 0

/** Unique id for dynamically created messages. */
export function newId(prefix = 'id') {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter}`
}

/** "09:41"-style timestamp for new chat messages. */
export function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
