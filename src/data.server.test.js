import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CATALOG_RESOURCES,
  clearCatalogCache,
  loadCatalog,
  loadListingPage,
  loadResultsPage,
  resolveServerApiBase,
} from './data.server.js'

const descriptions = [
  {
    id: 1,
    name: 'common.close',
    translations: { en: 'Close', hr: 'Zatvori' },
  },
  { id: 2, name: null, translations: { en: 'Cars', hr: 'Automobili' } },
]

const listings = [
  { id: 10, categoryId: 1, userId: 1, isActive: true, orientation: 'sell' },
  { id: 11, categoryId: 1, userId: 1, isActive: false, orientation: 'buy' },
]

/** Rows keyed by resource name, repeated under every requested base URL. */
function catalogRows() {
  return {
    users: [{ id: 1, name: 'Ana', email: 'ana@example.com' }],
    languages: [{ code: 'en', name: 'English' }],
    descriptions,
    categories: [{ id: 1, descriptionId: 2, parentCategoryId: null }],
    regions: [
      { id: 0, code: 'ALL', descriptionId: 0 },
      { id: 4, code: 'HR', descriptionId: 2 },
    ],
    listings,
    'listing-translations': [{ listingId: 10, language: 'en', title: 'Bike' }],
    'facet-schemas': [],
    'facet-value-options': [],
    'facet-value-selections': [],
    'listing-images': [],
  }
}

function fakeApi(rows = catalogRows()) {
  return vi.fn(async (url) => {
    const resource = String(url).split('/').pop()
    if (!(resource in rows)) throw new Error(`unexpected request ${url}`)
    return { ok: true, status: 200, json: async () => rows[resource] }
  })
}

describe('resolveServerApiBase', () => {
  it('prefers API_URL and trims trailing slashes', () => {
    expect(
      resolveServerApiBase({ API_URL: 'https://api.internal/' }),
    ).toBe('https://api.internal')
  })

  it('accepts the public VITE_API_BASE_URL as a fallback', () => {
    expect(
      resolveServerApiBase({ VITE_API_BASE_URL: 'https://api.example.com' }),
    ).toBe('https://api.example.com')
  })

  it('defaults to the local backend', () => {
    expect(resolveServerApiBase({})).toBe('http://localhost:3000')
  })
})

describe('loadCatalog', () => {
  beforeEach(() => clearCatalogCache())

  it('fetches every catalog resource and keys the result by resource', async () => {
    const fetchImpl = fakeApi()

    const data = await loadCatalog({ fetchImpl, base: 'http://api' })

    expect(fetchImpl).toHaveBeenCalledTimes(CATALOG_RESOURCES.length)
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api/listings',
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    )
    expect(data.listings).toEqual(listings)
    expect(data['facet-value-options']).toEqual([])
  })

  it('reuses the snapshot inside the max age', async () => {
    const fetchImpl = fakeApi()

    await loadCatalog({ fetchImpl, base: 'http://api' })
    await loadCatalog({ fetchImpl, base: 'http://api' })

    expect(fetchImpl).toHaveBeenCalledTimes(CATALOG_RESOURCES.length)
  })

  it('refetches once the snapshot is older than the max age', async () => {
    const fetchImpl = fakeApi()

    await loadCatalog({ fetchImpl, base: 'http://api', maxAge: 0 })
    await loadCatalog({ fetchImpl, base: 'http://api', maxAge: 0 })

    expect(fetchImpl).toHaveBeenCalledTimes(CATALOG_RESOURCES.length * 2)
  })

  it('shares one in-flight request between concurrent renders', async () => {
    const fetchImpl = fakeApi()

    const [first, second] = await Promise.all([
      loadCatalog({ fetchImpl, base: 'http://api' }),
      loadCatalog({ fetchImpl, base: 'http://api' }),
    ])

    expect(first).toBe(second)
    expect(fetchImpl).toHaveBeenCalledTimes(CATALOG_RESOURCES.length)
  })

  it('reports a failing resource', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }))

    await expect(
      loadCatalog({ fetchImpl, base: 'http://api' }),
    ).rejects.toThrow('/users failed with 503')
  })

  it('does not cache a failed load', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      })

    await expect(
      loadCatalog({ fetchImpl, base: 'http://api' }),
    ).rejects.toThrow('Cannot reach the API at http://api: offline')

    const data = await loadCatalog({ fetchImpl, base: 'http://api' })
    expect(data.listings).toEqual([])
  })
})

describe('loadResultsPage', () => {
  beforeEach(() => clearCatalogCache())

  it('returns the catalog plus the dictionaries built from it', async () => {
    const page = await loadResultsPage({
      fetchImpl: fakeApi(),
      base: 'http://api',
    })

    expect(page.data.listings).toHaveLength(2)
    expect(page.strings.en['common.close']).toBe('Close')
    expect(page.strings.hr['common.close']).toBe('Zatvori')
  })
})

describe('loadListingPage', () => {
  beforeEach(() => clearCatalogCache())

  it('returns the catalog for an active listing', async () => {
    const page = await loadListingPage(10, {
      fetchImpl: fakeApi(),
      base: 'http://api',
    })

    expect(page.listingId).toBe(10)
    expect(page.strings.en['common.close']).toBe('Close')
  })

  it('returns null for an unknown listing', async () => {
    const page = await loadListingPage(99, {
      fetchImpl: fakeApi(),
      base: 'http://api',
    })

    expect(page).toBeNull()
  })

  it('returns null for an unpublished draft', async () => {
    const page = await loadListingPage(11, {
      fetchImpl: fakeApi(),
      base: 'http://api',
    })

    expect(page).toBeNull()
  })

  it('returns null for an id that is not a positive integer', async () => {
    expect(await loadListingPage('abc')).toBeNull()
    expect(await loadListingPage(0)).toBeNull()
    expect(await loadListingPage(-3)).toBeNull()
  })
})
