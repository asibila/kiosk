// Client boot path: no server payload, so the provider loads the dictionaries
// and `KioskApp` fetches the catalog after mount. This guards the refactor that
// lets a server payload seed the same state.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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
  googleSignInUrl: (from = '/search') => `/api/auth/google?from=${encodeURIComponent(from)}`,
  googleLinkUrl: (from = '/app') =>
    `/api/auth/google?link=1&from=${encodeURIComponent(from)}`,
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

// One buyer (Ivo, id 2) started a contact on Ana's listing 10.
const rawWithChats = {
  ...raw,
  users: [
    { id: 1, name: 'Ana', email: 'ana@example.com', isActive: true },
    { id: 2, name: 'Ivo', email: 'ivo@example.com', isActive: true },
  ],
  'chat-threads': [{ id: 5, createdAt: '2026-11-18T10:00:00.000Z' }],
  'chat-messages': [
    {
      id: 1,
      threadId: 5,
      userId: 2,
      text: 'Is it available?',
      createdAt: '2026-11-18T10:01:00.000Z',
    },
  ],
  'listing-chat-threads': [
    { id: 70, listingId: 10, chatThreadId: 5, userId: 2, hasUnread: true },
  ],
  'inbox-items': [],
}

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

  it('opens the drawer for guests from the menu', async () => {
    render(
      <MemoryRouter initialEntries={['/results']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Trek bike' })
    expect(document.querySelector('.drawer')).not.toHaveClass('open')

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    expect(document.querySelector('.drawer')).toHaveClass('open')
    const drawer = document.querySelector('.drawer')
    expect(
      await within(drawer).findByRole('button', { name: 'Sign in' }),
    ).toBeInTheDocument()
    expect(
      within(drawer).queryByRole('button', { name: 'My items' }),
    ).not.toBeInTheDocument()
  })

  it('starts a new listing from Add item in My items', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(rawWithCondition)

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('button', { name: 'Open statistics for Trek bike' })
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))

    const browse = await screen.findByRole('dialog', { name: 'Browse marketplace' })
    fireEvent.click(within(browse).getByText('Cars'))
    fireEvent.click(within(browse).getByRole('button', { name: 'OK' }))

    // Choosing a category opens step 1 of the wizard with its two questions.
    expect(
      await screen.findByRole('dialog', { name: 'Wizard - step 1 of 3' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Are you buying or selling?' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'What is the condition of the item?' }),
    ).toBeInTheDocument()
  })

  it('reports the Google link result in the notice banner', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)

    render(
      <MemoryRouter initialEntries={['/app?google=connected']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('Google is connected to this account.'),
    ).toBeInTheDocument()
  })

  it('explains a refused Google link', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)

    render(
      <MemoryRouter initialEntries={['/app?google=error_email_mismatch']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText(/That Google account uses a different email\./),
    ).toBeInTheDocument()
  })

  it('lists the seller’s listings on /app', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('button', { name: 'Open statistics for Trek bike' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Your seller overview' }),
    ).not.toBeInTheDocument()

    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByText('My items')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('summarizes a My items row and expands the remaining facets', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(rawWithCondition)

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByText('For Sale - New')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Delete Trek bike' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Show details for Trek bike' }),
    )

    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(screen.getByText('250 €')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Hide details for Trek bike' }),
    ).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(
      screen.getByRole('button', { name: 'Hide details for Trek bike' }),
    )
    expect(screen.queryByText('Price')).not.toBeInTheDocument()
  })

  it('opens one conversation per user from a My items message icon', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(rawWithChats)

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole('button', { name: /Messages for Trek bike/ }),
    )

    const dialog = await screen.findByRole('dialog', {
      name: 'Messages · Trek bike',
    })
    expect(within(dialog).getByText('Ivo')).toBeInTheDocument()
    expect(within(dialog).getByText('Is it available?')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByText('Ivo'))
    expect(
      await within(dialog).findByRole('button', { name: 'Back to inbox' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Is it available?')).toBeInTheDocument()
  })

  it('badges My items, not Messages, for conversations on the user’s listings', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(rawWithChats)

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('button', { name: 'Open statistics for Trek bike' })
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    const drawer = document.querySelector('.drawer')
    const myItems = within(drawer).getByRole('button', { name: /My items/ })
    expect(within(myItems).getByText('1')).toBeInTheDocument()

    const messages = within(drawer).getByRole('button', { name: /Messages/ })
    expect(messages.querySelector('.badge')).toBeNull()
  })

  it('reopens the existing conversation instead of contacting a listing twice', async () => {
    apiMock.me.mockResolvedValueOnce({
      id: 2,
      name: 'Ivo',
      email: 'ivo@example.com',
    })
    apiMock.create.mockClear()
    fetchKioskData.mockResolvedValue({
      ...rawWithChats,
      'inbox-items': [{ id: 9, userId: 2, chatThreadId: 5, hasUnread: false }],
    })

    render(
      <MemoryRouter initialEntries={['/listing/10']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole('button', { name: 'Contact seller' }),
    )

    const dialog = await screen.findByRole('dialog', { name: 'Messages' })
    expect(within(dialog).getByText('Is it available?')).toBeInTheDocument()
    expect(apiMock.create).not.toHaveBeenCalled()
  })

  it('opens the new conversation in chat mode after contacting the seller', async () => {
    apiMock.me.mockResolvedValueOnce({
      id: 2,
      name: 'Ivo',
      email: 'ivo@example.com',
    })
    apiMock.create.mockReset()
    apiMock.create.mockImplementation(async (resource) => {
      if (resource === 'chat-threads') return { id: 9 }
      if (resource === 'listing-chat-threads') {
        return { id: 70, listingId: 10, chatThreadId: 9, userId: 2 }
      }
      if (resource === 'inbox-items') return { id: 5 }
      return {}
    })

    const rawBuyer = {
      ...raw,
      users: [
        { id: 1, name: 'Ana', email: 'ana@example.com', isActive: true },
        { id: 2, name: 'Ivo', email: 'ivo@example.com', isActive: true },
      ],
      'chat-threads': [],
      'chat-messages': [],
      'listing-chat-threads': [],
      'inbox-items': [],
    }
    const rawAfterContact = {
      ...rawBuyer,
      'chat-threads': [{ id: 9, createdAt: '2026-11-18T10:00:00.000Z' }],
      'listing-chat-threads': [
        { id: 70, listingId: 10, chatThreadId: 9, userId: 2, hasUnread: false },
      ],
      'inbox-items': [
        { id: 5, userId: 2, chatThreadId: 9, hasUnread: false },
      ],
    }
    fetchKioskData.mockImplementation(async () =>
      apiMock.create.mock.calls.some(([resource]) => resource === 'inbox-items')
        ? rawAfterContact
        : rawBuyer,
    )

    render(
      <MemoryRouter initialEntries={['/listing/10']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole('button', { name: 'Contact seller' }),
    )

    const dialog = await screen.findByRole('dialog', { name: 'Messages' })
    // Chat mode, not the inbox list: the conversation header and its back arrow.
    expect(
      await within(dialog).findByRole('button', { name: 'Back to inbox' }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('Chatting with Ana regarding Trek bike'),
    ).toBeInTheDocument()
    expect(apiMock.create).toHaveBeenCalledWith('chat-threads', {}, 2)
  })

  it('shows a spinner with a plain Loading label while the catalog loads', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)

    let resolveData
    fetchKioskData.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveData = resolve
      }),
    )

    const { container } = render(
      <MemoryRouter initialEntries={['/results']}>
        <App />
      </MemoryRouter>,
    )

    const status = await screen.findByRole('status')
    expect(status).toHaveTextContent('Loading')
    expect(status.querySelector('.spinner')).toBeInTheDocument()
    expect(screen.queryByText('Loading interviews…')).not.toBeInTheDocument()

    await act(async () => {
      resolveData(raw)
    })
    expect(
      await screen.findByRole('heading', { name: 'Trek bike' }),
    ).toBeInTheDocument()
  })

  it('redirects an anonymous visitor from /app to the login form', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('region', { name: 'Log in' })).toBeInTheDocument()
    expect(
      screen.queryByRole('navigation', { name: 'Breadcrumb' }),
    ).not.toBeInTheDocument()
  })

  it('navigates to Search and My items from the drawer', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(raw)

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('button', { name: 'Open statistics for Trek bike' })
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))

    let drawer = document.querySelector('.drawer')
    fireEvent.click(within(drawer).getByRole('button', { name: 'Search' }))
    expect(
      await screen.findByRole('button', { name: 'Search all regions' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    drawer = document.querySelector('.drawer')
    fireEvent.click(within(drawer).getByRole('button', { name: 'My items' }))
    expect(
      await screen.findByRole('button', { name: 'Open statistics for Trek bike' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Menu' }))
    drawer = document.querySelector('.drawer')
    fireEvent.click(within(drawer).getByRole('button', { name: 'Profile' }))
    expect(
      await screen.findByRole('dialog', { name: 'Profile' }),
    ).toBeInTheDocument()
  })

  it('shows per-listing statistics when a My items row is clicked', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValueOnce({
      ...raw,
      listings: [
        {
          id: 10,
          categoryId: 1,
          orientation: 'sell',
          userId: 1,
          isActive: true,
          price: 250,
        },
        {
          id: 12,
          categoryId: 1,
          orientation: 'sell',
          userId: 1,
          isActive: true,
          price: 900,
        },
      ],
      'listing-translations': [
        { listingId: 10, language: 'en', title: 'Trek bike' },
        { listingId: 12, language: 'en', title: 'City bike' },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    // Nothing is selected yet: the page lists the seller's ads.
    expect(
      await screen.findByRole('button', { name: 'Open statistics for Trek bike' }),
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Open statistics for Trek bike' }),
    )

    // The clicked listing's card replaces the list; no interview opens.
    expect(await screen.findByRole('heading', { name: 'Trek bike' })).toBeInTheDocument()
    expect(screen.getByText('Cars · 250 €')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Cars' })).not.toBeInTheDocument()
  })

  it('edits answers in a modal with Apply disabled until a change is made', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(rawWithCondition)

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Open statistics for Trek bike',
      }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Answer questions' }))

    const dialog = await screen.findByRole('dialog', { name: 'Answer questions' })
    const apply = within(dialog).getByRole('button', { name: 'Apply' })
    expect(apply).toBeDisabled()

    // Changing a numeric answer makes the draft dirty.
    const priceForm = within(dialog).getByRole('form', { name: 'Price' })
    fireEvent.change(within(priceForm).getByRole('spinbutton', { name: 'Price' }), {
      target: { value: '320' },
    })
    fireEvent.click(within(priceForm).getByRole('button', { name: 'Save' }))
    expect(apply).toBeEnabled()

    // Cancel always closes and writes nothing.
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(
      screen.queryByRole('dialog', { name: 'Answer questions' }),
    ).not.toBeInTheDocument()
    expect(apiMock.update).not.toHaveBeenCalled()
  })

  it('applies the changed answers to the listing', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(rawWithCondition)
    apiMock.update.mockImplementation(async (_resource, id, body) => ({
      id,
      ...body,
    }))

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Open statistics for Trek bike',
      }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Answer questions' }))

    const dialog = await screen.findByRole('dialog', { name: 'Answer questions' })
    const priceForm = within(dialog).getByRole('form', { name: 'Price' })
    fireEvent.change(within(priceForm).getByRole('spinbutton', { name: 'Price' }), {
      target: { value: '320' },
    })
    fireEvent.click(within(priceForm).getByRole('button', { name: 'Save' }))
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))

    await waitFor(() =>
      expect(apiMock.update).toHaveBeenCalledWith(
        'listings',
        10,
        { price: 320 },
        1,
      ),
    )
    expect(
      screen.queryByRole('dialog', { name: 'Answer questions' }),
    ).not.toBeInTheDocument()
  })

  it('records the outcome details before deleting a listing', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(raw)

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete Trek bike' }),
    )

    const dialog = await screen.findByRole('dialog', { name: 'Delete listing' })
    expect(
      within(dialog).queryByText('What was the outcome?'),
    ).not.toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Details' }))
    expect(within(dialog).getByText('What was the outcome?')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sold' }))
    fireEvent.change(within(dialog).getByRole('spinbutton', { name: /Sold for/ }), {
      target: { value: '240' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes' }))

    await waitFor(() =>
      expect(apiMock.create).toHaveBeenCalledWith(
        'listing-outcomes',
        { listingId: 10, outcome: 'sold', finalPrice: 240 },
        1,
      ),
    )
    await waitFor(() =>
      expect(apiMock.remove).toHaveBeenCalledWith('listings', 10, 1),
    )
    expect(
      screen.queryByRole('dialog', { name: 'Delete listing' }),
    ).not.toBeInTheDocument()
  })

  it('offers purchase outcomes for a wanted listing', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue({
      ...raw,
      listings: [
        {
          id: 10,
          categoryId: 1,
          orientation: 'buy',
          userId: 1,
          isActive: true,
          price: 250,
        },
      ],
    })

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete Trek bike' }),
    )

    const dialog = await screen.findByRole('dialog', { name: 'Delete listing' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Details' }))

    // Wanted ads do not offer sale outcomes.
    expect(within(dialog).getByRole('button', { name: 'Purchased' })).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Purchase fell through' }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'No longer needed' }),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Bought elsewhere' }),
    ).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Sold' })).not.toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Purchased' }))
    expect(
      within(dialog).getByRole('spinbutton', { name: /Purchased for/ }),
    ).toBeInTheDocument()
    fireEvent.change(
      within(dialog).getByRole('spinbutton', { name: /Purchased for/ }),
      { target: { value: '300' } },
    )
    fireEvent.click(within(dialog).getByRole('button', { name: 'Yes' }))

    await waitFor(() =>
      expect(apiMock.create).toHaveBeenCalledWith(
        'listing-outcomes',
        { listingId: 10, outcome: 'purchased', finalPrice: 300 },
        1,
      ),
    )
  })

  it('shows a breadcrumb on the search results page', async () => {
    render(
      <MemoryRouter initialEntries={['/results']}>
        <App />
      </MemoryRouter>,
    )

    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Search' })).toHaveAttribute(
      'href',
      '/search',
    )
    expect(within(nav).getByText('Search Results')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('shows the results breadcrumb on a listing opened from search results', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/listing/10',
            state: { from: '/results?category=1' },
          },
        ]}
      >
        <App />
      </MemoryRouter>,
    )

    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Search' })).toHaveAttribute(
      'href',
      '/search',
    )
    expect(
      await within(nav).findByRole('link', { name: 'Search Results' }),
    ).toHaveAttribute('href', '/results?category=1')
    expect(within(nav).getByText('Trek bike')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('shows My items › listing name on the dashboard of a drawer item', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(raw)

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Open statistics for Trek bike',
      }),
    )

    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'My items' })).toHaveAttribute(
      'href',
      '/app',
    )
    expect(within(nav).getByText('Trek bike')).toHaveAttribute(
      'aria-current',
      'page',
    )

    fireEvent.click(within(nav).getByRole('link', { name: 'My items' }))
    expect(
      await screen.findByRole('button', {
        name: 'Open statistics for Trek bike',
      }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('navigation', { name: 'Breadcrumb' })).getByText(
        'My items',
      ),
    ).toHaveAttribute('aria-current', 'page')
  })

  it('shows the dashboard breadcrumb on a listing opened from the dashboard', async () => {
    apiMock.me.mockResolvedValueOnce(signedIn)
    fetchKioskData.mockResolvedValue(raw)

    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>,
    )

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Open statistics for Trek bike',
      }),
    )
    fireEvent.click(await screen.findByRole('link', { name: 'View listing' }))

    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(
      await within(nav).findByRole('link', { name: 'My items' }),
    ).toHaveAttribute('href', '/app')
    expect(within(nav).getByRole('link', { name: 'Trek bike' })).toHaveAttribute(
      'href',
      '/app?listing=10',
    )
    expect(within(nav).getByText('Listing details')).toHaveAttribute(
      'aria-current',
      'page',
    )

    // "My items" returns to the listing list.
    fireEvent.click(within(nav).getByRole('link', { name: 'My items' }))
    expect(
      await screen.findByRole('button', {
        name: 'Open statistics for Trek bike',
      }),
    ).toBeInTheDocument()
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

    // Opening the owned listing from My items shows its statistics; the
    // interview is one click away from there.
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Open statistics for Trek bike',
      }),
    )
    expect(
      await screen.findByRole('heading', { name: 'Your seller overview' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Cars' }),
    ).not.toBeInTheDocument()

    // Edit from the checklist opens the wizard modal at step 2.
    fireEvent.click(screen.getAllByRole('button', { name: 'Finish' })[0])
    expect(
      await screen.findByRole('dialog', { name: 'Wizard - step 2 of 3' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Edit listing' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next >' }))
    expect(
      await screen.findByRole('dialog', { name: 'Wizard - step 3 of 3' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Preview listing' }),
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
