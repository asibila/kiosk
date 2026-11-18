// Seller statistics for the post-publish screen. Everything here is derived
// from data the app already loads — own listings, their chat threads and the
// public catalog. There is no click/view tracking yet, so no impression
// numbers: the honest metrics are ads, contacts and how the price compares.

const DAY_MS = 24 * 60 * 60 * 1000

/** UTC day key (`YYYY-MM-DD`); UTC keeps a series stable across time zones. */
function dayKey(date) {
  return date.toISOString().slice(0, 10)
}

/** Visible chats (contacts) on one of the seller's own listings. */
function contactsOf(myListings, chats) {
  const ownIds = new Set(myListings.map((listing) => Number(listing.listingId)))
  return chats.filter((chat) => ownIds.has(Number(chat.listingId)))
}

/**
 * Active ads, drafts, contacts and unread contacts for one seller, plus the
 * daily contact series the chart draws.
 *
 * @param {{myListings?: any[], chats?: any[], days?: number, now?: Date}} [input]
 */
export function buildSellerStats({
  myListings = [],
  chats = [],
  days = 14,
  now = new Date(),
} = {}) {
  const contacts = contactsOf(myListings, chats)

  return {
    active: myListings.filter((listing) => listing.isActive !== false).length,
    drafts: myListings.filter((listing) => listing.isActive === false).length,
    contacts: contacts.length,
    unread: contacts.reduce((sum, chat) => sum + (Number(chat.unread) || 0), 0),
    activity: contactsByDay(contacts, { days, now }),
  }
}

/**
 * One bucket per day for the last `days` days, oldest first, counting chat
 * threads by their `createdAt`. Rows outside the window (or without a usable
 * date) are ignored.
 *
 * @param {any[]} [chats]
 * @param {{days?: number, now?: Date}} [options]
 * @returns {{days: Array<{key: string, count: number}>, total: number, max: number}}
 */
export function contactsByDay(chats = [], { days = 14, now = new Date() } = {}) {
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const buckets = new Map()
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    buckets.set(dayKey(new Date(end - offset * DAY_MS)), 0)
  }

  for (const chat of chats) {
    const time = chat?.createdAt ? Date.parse(chat.createdAt) : NaN
    if (!Number.isFinite(time)) continue
    const key = dayKey(new Date(time))
    if (buckets.has(key)) buckets.set(key, buckets.get(key) + 1)
  }

  const series = [...buckets].map(([key, count]) => ({ key, count }))
  return {
    days: series,
    total: series.reduce((sum, day) => sum + day.count, 0),
    max: series.reduce((top, day) => Math.max(top, day.count), 0),
  }
}

/**
 * Where a listing's price sits among the active listings of its own category.
 * `position` is 0–100 along the min–max track, so the UI can place a marker.
 *
 * @param {{listing?: any, catalog?: any[]}} [input]
 * @returns {{count: number, min: number, median: number, max: number, position: number}|null}
 */
export function pricePosition({ listing, catalog = [] } = {}) {
  const value = Number(listing?.price)
  if (listing?.price == null || !Number.isFinite(value)) return null

  const prices = catalog
    .filter((item) => item?.type === 'listing')
    .filter((item) => String(item.categoryId) === String(listing.categoryId))
    .filter((item) => String(item.id) !== String(listing.listingId ?? listing.id))
    .filter((item) => item.isActive !== false)
    .map((item) => Number(item.price))
    .filter((price) => Number.isFinite(price))
    .sort((a, b) => a - b)

  if (prices.length === 0) return null

  const min = prices[0]
  const max = prices[prices.length - 1]
  const middle = Math.floor(prices.length / 2)
  const median =
    prices.length % 2 === 1
      ? prices[middle]
      : (prices[middle - 1] + prices[middle]) / 2
  const position = max === min ? 50 : ((value - min) / (max - min)) * 100

  return {
    count: prices.length,
    min,
    max,
    median,
    position: Math.round(Math.min(100, Math.max(0, position))),
  }
}

/**
 * The next steps that make a listing more attractive. Each item is
 * `{ id, done }` plus `count` where the label needs a number.
 *
 * @param {{listing?: any, imageCount?: number, titles?: Record<string, string>, languages?: string[]}} [input]
 */
export function listingChecklist({
  listing,
  imageCount = 0,
  titles = {},
  languages = [],
} = {}) {
  const answered = Number(listing?.facetsCount) || 0
  const total = Number(listing?.facetsCountMax) || 0
  const missingTitles = languages.filter((code) => !titles?.[code])

  return [
    { id: 'photos', done: imageCount > 0 },
    { id: 'titles', done: missingTitles.length === 0, count: missingTitles.length },
    {
      id: 'questions',
      done: total === 0 || answered >= total,
      count: Math.max(0, total - answered),
    },
  ]
}
