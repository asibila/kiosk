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
}))

const { fetchKioskData, loadDescriptions } = await import('./api.js')
const { api: apiMock } = await import('./api.js')
const { default: App } = await import('./App.jsx')

const categoryDescription = {
  id: 9001,
  name: null,
  translations: { en: 'Cars', hr: 'Automobili' },
}

const regionDescriptions = [
  { id: 9500, name: null, translations: { en: 'All regions', hr: 'Sve regije' } },
  { id: 9501, name: null, translations: { en: 'Germany', hr: 'Njemačka' } },
]

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

describe('client rendering', () => {
  beforeEach(() => {
    localStorage.clear()
    loadDescriptions.mockResolvedValue(TEST_DESCRIPTIONS)
    fetchKioskData.mockResolvedValue(raw)
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
})
