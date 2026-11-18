import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import MyListingsList from './MyListingsList.jsx'

const listing = {
  id: '10',
  listingId: 10,
  categoryId: 1,
  title: 'Trek bike',
  orientation: 'sell',
  isActive: true,
}

const items = [
  {
    id: '10',
    listing,
    title: 'Trek bike',
    imageUrl: null,
    iconSvg: null,
    summary: 'For Sale - Used',
    details: [
      { label: 'Brand', value: 'Trek' },
      { label: 'Price', value: '250 €' },
    ],
    facetsCount: 2,
    facetsCountMax: 4,
    isActive: true,
  },
]

function renderList(props = {}) {
  return render(
    <LanguageProvider initialLanguage="en" initialStrings={TEST_STRINGS}>
      <MyListingsList
        items={items}
        onOpen={vi.fn()}
        onDelete={vi.fn()}
        onCreate={vi.fn()}
        onMessages={vi.fn()}
        {...props}
      />
    </LanguageProvider>,
  )
}

describe('MyListingsList', () => {
  it('shows each listing with its summary and actions', () => {
    renderList()

    expect(screen.getByText('Trek bike')).toBeInTheDocument()
    expect(screen.getByText('For Sale - Used')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Delete Trek bike' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Open statistics for Trek bike' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Messages for Trek bike' }),
    ).toBeInTheDocument()
  })

  it('expands the remaining facets in place', () => {
    renderList()

    const more = screen.getByRole('button', {
      name: 'Show details for Trek bike',
    })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Brand')).not.toBeInTheDocument()

    fireEvent.click(more)
    expect(screen.getByText('Brand')).toBeInTheDocument()
    expect(screen.getByText('Trek')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Hide details for Trek bike' }),
    ).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(
      screen.getByRole('button', { name: 'Hide details for Trek bike' }),
    )
    expect(screen.queryByText('Brand')).not.toBeInTheDocument()
  })

  it('opens the statistics and the delete confirmation from the row', () => {
    const onOpen = vi.fn()
    const onDelete = vi.fn()
    renderList({ onOpen, onDelete })

    fireEvent.click(
      screen.getByRole('button', { name: 'Open statistics for Trek bike' }),
    )
    expect(onOpen).toHaveBeenCalledWith('10')

    fireEvent.click(screen.getByRole('button', { name: 'Delete Trek bike' }))
    expect(onDelete).toHaveBeenCalledWith(listing)
  })

  it('opens that listing’s conversations from the message icon', () => {
    const onMessages = vi.fn()
    renderList({ onMessages })

    fireEvent.click(
      screen.getByRole('button', { name: 'Messages for Trek bike' }),
    )

    expect(onMessages).toHaveBeenCalledWith(listing)
  })

  it('shows the unread count on a listing’s message icon', () => {
    renderList({ items: [{ ...items[0], unreadCount: 2 }] })

    const button = screen.getByRole('button', {
      name: 'Messages for Trek bike (2 unread)',
    })
    expect(within(button).getByText('2')).toBeInTheDocument()
  })

  it('leaves the message icon plain when the listing has no unread chats', () => {
    renderList()

    const button = screen.getByRole('button', { name: 'Messages for Trek bike' })
    expect(button.querySelector('.badge')).toBeNull()
  })

  it('filters the list as the search text changes', () => {
    const city = {
      ...items[0],
      id: '12',
      listing: { ...listing, id: '12', listingId: 12 },
      title: 'City bike',
    }
    renderList({ items: [items[0], city] })

    const search = screen.getByRole('searchbox', { name: 'Search my items' })
    fireEvent.change(search, { target: { value: 'trek' } })

    expect(screen.getByText('Trek bike')).toBeInTheDocument()
    expect(screen.queryByText('City bike')).not.toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'nothing' } })
    expect(screen.getByText('No items match your search.')).toBeInTheDocument()
    expect(screen.queryByText('Trek bike')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(screen.getByText('Trek bike')).toBeInTheDocument()
    expect(screen.getByText('City bike')).toBeInTheDocument()
  })

  it('starts a new item from the search box', () => {
    const onCreate = vi.fn()
    renderList({ onCreate })

    fireEvent.click(screen.getByRole('button', { name: 'Add item' }))
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('shows the primary image when the listing has one', () => {
    const { container } = renderList({
      items: [{ ...items[0], imageUrl: '/image.jpg' }],
    })

    expect(container.querySelector('.my-listing-thumb img')).toHaveAttribute(
      'src',
      '/image.jpg',
    )
  })
})
