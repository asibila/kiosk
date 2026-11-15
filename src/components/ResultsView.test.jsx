import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import ResultsView from './ResultsView.jsx'

const condition = {
  id: '1',
  facet: 'condition',
  text: 'Condition',
  options: [
    { id: '8', text: 'New' },
    { id: '9', text: 'Used' },
  ],
}

const categories = [
  {
    categoryId: 1,
    parentCategoryId: null,
    title: 'Electronics',
    questions: [condition],
  },
  {
    categoryId: 2,
    parentCategoryId: 1,
    title: 'Mobile phones',
    questions: [condition],
  },
]

const listings = [
  {
    id: '28',
    userId: 1,
    categoryId: '2',
    orientation: 'sell',
    title: 'Mobile phones #28',
    desc: 'For sale · New',
    thumb: 'box',
    imageUrl: null,
    createdAt: '2026-01-01T10:00:00.000Z',
  },
  {
    id: '25',
    userId: 3,
    categoryId: '2',
    orientation: 'sell',
    title: 'Mobile phones #25',
    desc: 'For sale · Used',
    thumb: 'box',
    imageUrl: null,
    createdAt: '2026-01-02T10:00:00.000Z',
  },
]

const selections = [
  { listingId: 28, facetValueOptionId: 8 },
  { listingId: 25, facetValueOptionId: 9 },
]

function renderResults(url, props = {}) {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={[url]}>
        <ResultsView
          listings={listings}
          categories={categories}
          selections={selections}
          currentUserId={1}
          onContact={vi.fn()}
          {...props}
        />
      </MemoryRouter>
    </LanguageProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('ResultsView', () => {
  it('reads the query from the URL and renders matching cards', () => {
    renderResults('/results?category=2&direction=buy&facet=condition:8')

    expect(screen.getByRole('heading', { name: 'Search results' })).toBeInTheDocument()
    expect(screen.getByText('1 matching ad')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Mobile phones #28' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Mobile phones #25')).not.toBeInTheDocument()

    const filters = within(screen.getByLabelText('Active filters'))
    expect(filters.getByText('Mobile phones')).toBeInTheDocument()
    expect(filters.getByText('Buy')).toBeInTheDocument()
    expect(filters.getByText('Condition: New')).toBeInTheDocument()

    const envelope = screen.getByRole('button', {
      name: 'Your listing: Mobile phones #28',
    })
    expect(envelope).toBeDisabled()

    expect(screen.getByRole('link', { name: 'Edit search' }).getAttribute('href')).toMatch(
      /^\/search\?/,
    )
    expect(
      screen.getByRole('link', { name: 'Open Mobile phones #28' }).getAttribute('href'),
    ).toBe('/listing/28')
  })

  it('shows an empty state when nothing matches', () => {
    renderResults('/results?category=2&direction=sell')

    expect(screen.getByText('No listings match the current filters.')).toBeInTheDocument()
    expect(screen.getByText('0 matching ads')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Edit search' })).toHaveLength(2)
  })
})
