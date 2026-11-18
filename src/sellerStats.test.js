import { describe, expect, it } from 'vitest'
import {
  buildSellerStats,
  contactsByDay,
  listingChecklist,
  pricePosition,
} from './sellerStats.js'

const now = new Date('2026-11-18T12:00:00.000Z')

const myListings = [
  { listingId: 10, categoryId: 2, isActive: true, price: 750, facetsCount: 3, facetsCountMax: 4 },
  { listingId: 11, categoryId: 2, isActive: false, price: null, facetsCount: 1, facetsCountMax: 4 },
]

const chats = [
  { listingId: 10, createdAt: '2026-11-18T09:00:00.000Z', unread: 1 },
  { listingId: 10, createdAt: '2026-11-17T09:00:00.000Z', unread: 0 },
  { listingId: 11, createdAt: '2026-11-01T09:00:00.000Z', unread: 0 },
  // Someone else's listing and a chat outside the window.
  { listingId: 99, createdAt: '2026-11-18T10:00:00.000Z', unread: 4 },
  { listingId: 10, createdAt: '2026-09-01T10:00:00.000Z', unread: 0 },
]

describe('buildSellerStats', () => {
  it('counts active ads, drafts and the contacts of the seller’s own ads', () => {
    const stats = buildSellerStats({ myListings, chats, now })

    expect(stats.active).toBe(1)
    expect(stats.drafts).toBe(1)
    expect(stats.contacts).toBe(4)
    expect(stats.unread).toBe(1)
    expect(stats.activity.total).toBe(2)
    expect(stats.activity.days).toHaveLength(14)
  })

  it('scopes contacts to one listing while keeping the seller totals', () => {
    const stats = buildSellerStats({ myListings, chats, now, listingId: 10 })

    // Active ads and drafts describe the seller, not the shown ad.
    expect(stats.active).toBe(1)
    expect(stats.drafts).toBe(1)
    // Three threads belong to listing 10; two of them are inside the window.
    expect(stats.contacts).toBe(3)
    expect(stats.unread).toBe(1)
    expect(stats.activity.total).toBe(2)
  })

  it('reports no contacts for a listing without conversations', () => {
    const stats = buildSellerStats({
      myListings: [...myListings, { listingId: 12, isActive: true }],
      chats,
      now,
      listingId: 12,
    })

    expect(stats.contacts).toBe(0)
    expect(stats.unread).toBe(0)
    expect(stats.activity.total).toBe(0)
  })
})

describe('contactsByDay', () => {
  const rows = [
    { createdAt: '2026-11-18T09:00:00.000Z' },
    { createdAt: '2026-11-17T09:00:00.000Z' },
    // Before the 14-day window.
    { createdAt: '2026-11-01T09:00:00.000Z' },
    { createdAt: '2026-09-01T09:00:00.000Z' },
  ]

  it('buckets contacts into the last days, oldest first', () => {
    const series = contactsByDay(rows, { days: 14, now })

    expect(series.days[0].key).toBe('2026-11-05')
    expect(series.days.at(-1)).toEqual({ key: '2026-11-18', count: 1 })
    expect(series.days.find((day) => day.key === '2026-11-17').count).toBe(1)
    expect(series.total).toBe(2)
    expect(series.max).toBe(1)
  })

  it('ignores missing and unparsable dates', () => {
    const series = contactsByDay(
      [{ createdAt: 'nope' }, { createdAt: null }, {}],
      { days: 3, now },
    )

    expect(series.total).toBe(0)
    expect(series.max).toBe(0)
    expect(series.days.map((day) => day.key)).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
    ])
  })

  it('counts several contacts on the same day', () => {
    const series = contactsByDay(
      [
        { createdAt: '2026-11-18T08:00:00.000Z' },
        { createdAt: '2026-11-18T20:00:00.000Z' },
      ],
      { days: 2, now },
    )

    expect(series.days.at(-1).count).toBe(2)
    expect(series.max).toBe(2)
  })
})

describe('pricePosition', () => {
  const catalog = [
    { type: 'listing', id: '10', categoryId: '2', price: 750, isActive: true },
    { type: 'listing', id: '20', categoryId: '2', price: 100, isActive: true },
    { type: 'listing', id: '21', categoryId: '2', price: 700, isActive: true },
    { type: 'listing', id: '22', categoryId: '2', price: 900, isActive: true },
    // Other category, inactive and a category node: all ignored.
    { type: 'listing', id: '23', categoryId: '3', price: 5000, isActive: true },
    { type: 'listing', id: '24', categoryId: '2', price: 9999, isActive: false },
    { type: 'category', id: '2', categoryId: '2' },
  ]

  it('places the listing price between the other ads of its category', () => {
    expect(pricePosition({ listing: myListings[0], catalog })).toEqual({
      count: 3,
      min: 100,
      median: 700,
      max: 900,
      position: 81,
    })
  })

  it('averages the two middle prices for an even count', () => {
    const even = [...catalog, { type: 'listing', id: '25', categoryId: '2', price: 1200 }]

    expect(pricePosition({ listing: myListings[0], catalog: even })).toMatchObject({
      count: 4,
      median: 800,
      position: 59,
    })
  })

  it('centres the marker when every price is the same', () => {
    const flat = [
      { type: 'listing', id: '20', categoryId: '2', price: 750 },
      { type: 'listing', id: '21', categoryId: '2', price: 750 },
    ]

    expect(pricePosition({ listing: myListings[0], catalog: flat })).toMatchObject({
      count: 2,
      position: 50,
    })
  })

  it('returns null without a price or comparable ads', () => {
    expect(pricePosition({ listing: myListings[1], catalog })).toBeNull()
    expect(pricePosition({ listing: myListings[0], catalog: [] })).toBeNull()
    expect(
      pricePosition({ listing: myListings[0], catalog: [catalog[0]] }),
    ).toBeNull()
  })
})

describe('listingChecklist', () => {
  it('reports photos, title languages and remaining questions', () => {
    const items = listingChecklist({
      listing: myListings[0],
      imageCount: 0,
      titles: { en: 'Novi mobitel' },
      languages: ['en', 'hr'],
    })

    expect(items).toEqual([
      { id: 'photos', done: false },
      { id: 'titles', done: false, count: 1 },
      { id: 'questions', done: false, count: 1 },
    ])
  })

  it('marks everything done when the ad is complete', () => {
    const items = listingChecklist({
      listing: { facetsCount: 4, facetsCountMax: 4 },
      imageCount: 2,
      titles: { en: 'A', hr: 'B' },
      languages: ['en', 'hr'],
    })

    expect(items.every((item) => item.done)).toBe(true)
  })

  it('treats a listing without known questions as answered', () => {
    const items = listingChecklist({
      listing: { facetsCount: 0, facetsCountMax: 0 },
      titles: { en: 'A' },
      languages: ['en'],
    })

    expect(items.find((item) => item.id === 'questions').done).toBe(true)
  })
})
