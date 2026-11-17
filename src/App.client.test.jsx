// Client boot path: no server payload, so the provider loads the dictionaries
// and `KioskApp` fetches the catalog after mount. This guards the refactor that
// lets a server payload seed the same state.
import { render, screen } from '@testing-library/react'
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
  },
  fetchKioskData: vi.fn(),
  loadDescriptions: vi.fn(),
  mediaUrl: (path) => path ?? '',
}))

const { fetchKioskData, loadDescriptions } = await import('./api.js')
const { default: App } = await import('./App.jsx')

const categoryDescription = {
  id: 9001,
  name: null,
  translations: { en: 'Cars', hr: 'Automobili' },
}

const raw = {
  users: [{ id: 1, name: 'Ana', email: 'ana@example.com', isActive: true }],
  languages: [{ code: 'en', name: 'English' }],
  descriptions: [...TEST_DESCRIPTIONS, categoryDescription],
  categories: [{ id: 1, descriptionId: 9001, parentCategoryId: null }],
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
})
