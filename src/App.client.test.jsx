// Client boot path: no server payload, so the provider loads the dictionaries
// and `KioskApp` fetches the catalog after mount. This guards the refactor that
// lets a server payload seed the same state.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TEST_DESCRIPTIONS } from './test/strings.js'

vi.mock('./api.js', () => ({
  API_BASE: '',
  CHAT_EVENTS_URL: '/chat-events/stream',
  api: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    upload: vi.fn(),
    login: vi.fn(async () => null),
    me: vi.fn(async () => null),
    logout: vi.fn(async () => null),
    detectRegion: vi.fn(async () => ({ regionId: 0, countryCode: null })),
  },
  fetchKioskData: vi.fn(),
  loadDescriptions: vi.fn(),
  mediaUrl: (path) => path ?? '',
  trackListingView: vi.fn(async () => null),
  fetchListingStats: vi.fn(async (listingId) => ({
    listingId,
    days: [],
    totals: { views: 0, viewsInWindow: 0, contacts: 0 },
    contactRate: 0,
  })),
  fetchAuthProviders: vi.fn(async () => ({ google: false })),
}))

const { fetchKioskData, loadDescriptions } = await import('./api.js')
const { api: apiMock } = await import('./api.js')
const { default: App } = await import('./App.jsx')

// jsdom has no EventSource; the signed-in live-chat effect only needs a stub it
// can close again.
vi.stubGlobal(
  'EventSource',
  class {
    constructor(url) {
      this.url = url
    }
    close() {}
  },
)

const categoryDescription = {
  id: 9001,
  name: null,
  translations: { en: 'Cars', hr: 'Automobili' },
}

const regionDescriptions = [
  { id: 9500, name: null, translations: { en: 'All regions', hr: 'Sve regije' } },
  { id: 9501, name: null, translations: { en: 'Germany', hr: 'Njemačka' } },
]

// A generic "Condition" facet, so the interview has an answerable question that
// the search filter can pre-populate.
const conditionDescription = {
  id: 9600,
  name: null,
  translations: { en: 'Condition', hr: 'Stanje' },
}
const newDescription = {
  id: 9601,
  name: null,
  translations: { en: 'New', hr: 'Novo' },
}

const raw = {
  users: [{ id: 1, name: 'Ana', email: 'ana@example.com', isActive: true }],
  languages: [{ code: 'en', name: 'English' }],
  descriptions: [...TEST_DESCRIPTIONS, categoryDescription, ...regionDescriptions],
  categories: [{ id: 1, descriptionId: 9001, parentCategoryId: null }],
  regions: [
    { id: 0, code: 'ALL', descriptionId: 9500 },
    { id: 11, code: 'DE', descriptionId: 9501 },
  ],
  listings: [
    {
      id: 10,
      categoryId: 1,
      orientation: 'sell',
      userId: 1,
      isActive: true,
      price: 250,
    },
  ],
  'listing-translations': [
    { listingId: 10, language: 'en', title: 'Trek bike' },
  ],
  'facet-schemas': [],
  'facet-value-options': [],
  'facet-value-selections': [],
  'listing-images': [],
}

// Same catalog plus a generic "Condition" facet, so a search can pre-answer the
// interview: condition option 8 belongs to schema 1, and listing 10 owns it.
const rawWithCondition = {
  ...raw,
  descriptions: [...raw.descriptions, conditionDescription, newDescription],
  'facet-schemas': [
    {
      id: 1,
      descriptionId: 9600,
      name: 'condition',
      categoryId: 0,
      isGeneric: true,
      type: 'option',
      required: true,
    },
  ],
  'facet-value-options': [{ id: 8, descriptionId: 9601, schemaId: 1 }],
  'facet-value-selections': [{ id: 70, listingId: 10, facetValueOptionId: 8 }],
}

const signedIn = { id: 1, name: 'Ana', email: 'ana@example.com' }

describe('client rendering', () => {
  beforeEach(() => {
    localStorage.clear()
    loadDescriptions.mockResolvedValue(TEST_DESCRIPTIONS)
    fetchKioskData.mockResolvedValue(raw)
    // Reset the session queue so a signed-in response cannot leak into the next
    // test (the guest default is `null`).
    apiMock.me.mockReset()
    apiMock.me.mockResolvedValue(null)
  })

  it('loads the dictionaries and the catalog when there is no server payload', async () => {
    render(
      <MemoryRouter initialEntries={['/results']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Trek bike' }),
    ).toBeInTheDocument()
    expect(loadDescriptions).toHaveBeenCalled()
    expect(fetchKioskData).toHaveBeenCalled()
  })

  it('titles /search with the region detected from the IP', async () => {
    apiMock.detectRegion.mockResolvedValueOnce({ regionId: 11, countryCode: 'DE' })

    render(
      <MemoryRouter initialEntries={['/search']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('button', { name: 'Search Germany' }),
    ).toBeInTheDocument()
    expect(apiMock.detectRegion).toHaveBeenCalled()
  })

  it('opens the drawer and asks guests to sign in from the "+" button', async () => {
    render(
      <MemoryRouter initialEntries={['/results']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Trek bike' })
    expect(document.querySelector('.drawer')).not.toHaveClass('open')

    fireEvent.click(screen.getByRole('button', { name: 'Add listing' }))

    expect(
      await screen.findByRole('dialog', { name: 'Please sign in to publish' }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('dialog', { name: 'Please sign in to publish' })).getByRole(
        'button',
        { name: 'Sign in' },
      ),
    ).toBeInTheDocument()
    expect(document.querySelector('.drawer')).toHaveClass('open')
  })

  it('opens the searched category with its facet answers already filled in', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(rawWithCondition)

    render(
      <MemoryRouter initialEntries={['/results?category=1&facet=condition:8']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Trek bike' })
    fireEvent.click(screen.getByRole('button', { name: 'Add listing' }))

    // The category comes from the search, so the Browse modal is skipped and
    // the interview shows the chosen condition as an answer.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Cars' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('does the same from the search form', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(rawWithCondition)

    render(
      <MemoryRouter initialEntries={['/search?category=1&facet=condition:8']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('button', { name: 'Search all regions' })
    fireEvent.click(screen.getByRole('button', { name: 'Add listing' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Cars' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'New' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('asks for a category when the search covers all categories', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)

    render(
      <MemoryRouter initialEntries={['/results?category=0']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Trek bike' })
    fireEvent.click(screen.getByRole('button', { name: 'Add listing' }))

    expect(
      await screen.findByRole('dialog', { name: 'Browse marketplace' }),
    ).toBeInTheDocument()
  })

  it('reports the Google link result in the notice banner', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)

    render(
      <MemoryRouter initialEntries={['/app?google=connected']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Google is connected to this account.',
    )
  })

  it('shows the post-publish screen after the wizard publishes', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    apiMock.update.mockImplementation(async (_resource, id, body) => ({
      id,
      ...body,
      facetsCount: 3,
    }))

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    // Open the owned listing from the drawer: its category interview opens.
    fireEvent.click(
      await screen.findByRole('button', { name: 'Toggle my listings drawer' }),
    )
    fireEvent.click(await screen.findByText('Trek bike'))
    expect(
      await screen.findByRole('heading', { name: 'Cars' }),
    ).toBeInTheDocument()

    // Interview → edit → preview → publish.
    fireEvent.click(screen.getByRole('button', { name: 'Next >' }))
    expect(
      await screen.findByRole('region', { name: 'Edit listing' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next >' }))
    expect(
      await screen.findByRole('region', { name: 'Preview listing' }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }))

    // The empty placeholder is replaced by the published card and statistics.
    expect(
      await screen.findByRole('heading', { name: 'Your ad is live' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View listing' })).toHaveAttribute(
      'href',
      '/listing/10',
    )
    expect(screen.getByRole('heading', { name: 'Trek bike' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
