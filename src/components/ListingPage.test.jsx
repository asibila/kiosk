import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import ListingPage from './ListingPage.jsx'

const listing = {
  id: '28',
  userId: 3,
  categoryId: '2',
  orientation: 'sell',
  title: 'Mobile phones #28',
  desc: 'For sale · New · Samsung',
  thumb: 'box',
  createdAt: '2026-01-01T10:00:00.000Z',
  facetsCount: 2,
  facetsCountMax: 3,
  facetsCountMaxAnswerable: 3,
}

const categories = [
  {
    categoryId: 1,
    parentCategoryId: null,
    title: 'Electronics',
    questions: [
      {
        id: '1',
        facet: 'condition',
        text: 'Condition',
        priority: 1,
        options: [{ id: '8', text: 'New' }],
      },
      {
        id: '2',
        facet: 'brand',
        text: 'Brand',
        priority: 2,
        options: [{ id: '4', text: 'Samsung' }],
      },
    ],
  },
  {
    categoryId: 2,
    parentCategoryId: 1,
    title: 'Mobile phones',
    questions: [
      {
        id: '1',
        facet: 'condition',
        text: 'Condition',
        priority: 1,
        options: [{ id: '8', text: 'New' }],
      },
    ],
  },
]

const selections = [
  { listingId: 28, facetValueOptionId: 8 },
  { listingId: 28, facetValueOptionId: 4 },
]

const users = [
  { id: 1, name: 'arian', email: 'arian@example.com' },
  { id: 3, name: 'pero', email: 'pero@example.com' },
]

function renderPage(props = {}) {
  return render(
    <LanguageProvider initialStrings={TEST_STRINGS}>
      <MemoryRouter initialEntries={['/listing/28']}>
        <ListingPage
          listing={listing}
          categories={categories}
          selections={selections}
          images={[]}
          users={users}
          currentUserId={1}
          isLoggedIn
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

describe('ListingPage', () => {
  it('renders the listing, facets and seller', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Mobile phones #28' })).toBeInTheDocument()
    expect(screen.getAllByText('For sale').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Mobile phones').length).toBeGreaterThan(0)
    expect(screen.getByText('pero')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByText('Condition')).toBeInTheDocument()
    expect(screen.getByText('Brand')).toBeInTheDocument()
    expect(screen.getByText('Samsung')).toBeInTheDocument()
    expect(screen.getByText('(66.67)')).toBeInTheDocument()
  })

  it('notifies the contact handler', () => {
    const onContact = vi.fn()
    renderPage({ onContact })

    fireEvent.click(screen.getByRole('button', { name: 'Contact seller' }))
    expect(onContact).toHaveBeenCalledWith(listing)
  })

  it('shows the owner note instead of the contact action', () => {
    renderPage({ currentUserId: 3 })

    expect(screen.getByText('This is your listing.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Contact seller' })).not.toBeInTheDocument()
  })

  it('asks guests to sign in', () => {
    renderPage({ isLoggedIn: false, currentUserId: null, onContact: null })

    expect(
      screen.getByRole('link', { name: 'Sign in to contact the seller' }),
    ).toBeInTheDocument()
  })

  it('handles a missing listing', () => {
    renderPage({ listing: null })

    expect(screen.getByText('This listing no longer exists.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to search' })).toBeInTheDocument()
  })

  it('hides another user\'s draft', () => {
    renderPage({
      listing: { ...listing, isActive: false },
      currentUserId: 1,
    })

    expect(screen.getByText('This listing no longer exists.')).toBeInTheDocument()
  })

  it('renders the gallery and selects the primary image first', () => {
    renderPage({
      images: [
        { id: 1, listingId: 28, url: '/one.jpg', primaryImage: false },
        { id: 2, listingId: 28, url: '/two.jpg', primaryImage: true },
      ],
    })

    const hero = screen.getByRole('img', { name: 'Mobile phones #28' })
    expect(hero.getAttribute('src')).toContain('two.jpg')
    expect(screen.getAllByRole('button', { name: /Photo/ })).toHaveLength(2)
  })
})
