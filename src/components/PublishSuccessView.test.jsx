import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import PublishSuccessView from './PublishSuccessView.jsx'
import { fetchListingStats } from '../api.js'

vi.mock('../api.js', () => ({
  mediaUrl: (path) => path ?? '',
  fetchListingStats: vi.fn(async () => ({
    listingId: 42,
    days: [
      { date: '2026-11-17', views: 1 },
      { date: '2026-11-18', views: 3 },
    ],
    totals: { views: 12, viewsInWindow: 4, contacts: 2 },
    contactRate: 0.167,
  })),
}))

const listing = {
  listingId: 42,
  title: 'Novi mobitel',
  categoryId: 2,
  price: 750,
  facetsCount: 3,
  facetsCountMax: 4,
}

const priceStats = { count: 4, min: 100, median: 700, max: 900, position: 81 }

const checklist = [
  { id: 'photos', done: true },
  { id: 'titles', done: false, count: 1 },
  { id: 'questions', done: false, count: 2 },
]

function renderView(props = {}) {
  return render(
    <MemoryRouter>
      <LanguageProvider initialStrings={TEST_STRINGS}>
        <PublishSuccessView
          listing={listing}
          categoryTitle="Mobile phones"
          priceStats={priceStats}
          checklist={checklist}
          onPublishAnother={() => {}}
          onImproveQuestions={() => {}}
          onEditListing={() => {}}
          {...props}
        />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('PublishSuccessView', () => {
  it('shows the published listing with its category, price and score', () => {
    renderView()

    expect(
      screen.getByRole('heading', { name: 'Your ad is live' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Novi mobitel' })).toBeInTheDocument()
    expect(screen.getByText('Mobile phones · 750 €')).toBeInTheDocument()
    // 3 of 4 answered, rounded to a whole percent.
    expect(screen.getByText('(75)')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'View listing' })).toHaveAttribute(
      'href',
      '/listing/42',
    )
    expect(screen.getByRole('link', { name: 'Back to search' })).toHaveAttribute(
      'href',
      '/search',
    )
  })

  it('shows seller totals and the 14-day contact chart', async () => {
    const stats = {
      active: 2,
      drafts: 1,
      contacts: 3,
      unread: 1,
      activity: {
        days: [
          { key: '2026-11-17', count: 1 },
          { key: '2026-11-18', count: 2 },
        ],
        total: 3,
        max: 2,
      },
    }
    renderView({ stats })

    // Views are fetched from the API for the published listing.
    expect(await screen.findByText('Views')).toBeInTheDocument()

    // …and charted per day in its own panel.
    expect(
      screen.getByRole('heading', { name: 'Views, last 2 days' }),
    ).toBeInTheDocument()
    expect(screen.getByText('4 views in the last 2 days')).toBeInTheDocument()

    const tiles = within(screen.getByRole('region', { name: 'Your statistics' }))
    expect(tiles.getByText('Active ads')).toBeInTheDocument()
    expect(tiles.getByText('Contacts')).toBeInTheDocument()
    expect(tiles.getByText('Unread')).toBeInTheDocument()
    expect(tiles.getByText('4')).toBeInTheDocument()
    expect(tiles.getByText('3')).toBeInTheDocument()

    expect(
      screen.getByRole('heading', { name: 'Contacts, last 2 days' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('3 contacts in the last 2 days'),
    ).toBeInTheDocument()
  })

  it('replaces the chart with a hint when nobody has made contact yet', () => {
    const stats = {
      active: 1,
      drafts: 0,
      contacts: 0,
      unread: 0,
      activity: { days: [{ key: '2026-11-18', count: 0 }], total: 0, max: 0 },
    }
    renderView({ stats, priceStats: null })

    expect(screen.getByText(/^No contacts yet\./)).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Price in Mobile phones' }),
    ).not.toBeInTheDocument()
  })

  it('compares the price with the other ads of the category', () => {
    renderView()

    const heading = screen.getByRole('heading', { name: 'Price in Mobile phones' })
    const panel = heading.closest('.publish-panel')

    expect(within(panel).getByText('750 €')).toBeInTheDocument()
    expect(within(panel).getByText('100 €')).toBeInTheDocument()
    expect(within(panel).getByText('900 €')).toBeInTheDocument()
    expect(
      within(panel).getByText('Median 700 € · 4 similar ads'),
    ).toBeInTheDocument()
    expect(
      within(panel).getByRole('img', {
        name: 'Your price 750 €, between 100 € and 900 €',
      }),
    ).toBeInTheDocument()
  })

  it('drives the checklist actions', () => {
    const onEditListing = vi.fn()
    const onImproveQuestions = vi.fn()
    renderView({ onEditListing, onImproveQuestions })

    expect(screen.getByText('The ad has a photo')).toBeInTheDocument()
    expect(screen.getByText('Add titles in every language')).toBeInTheDocument()
    expect(screen.getByText('Answer 2 more questions')).toBeInTheDocument()

    const buttons = screen.getAllByRole('button', { name: 'Finish' })
    expect(buttons).toHaveLength(2)

    fireEvent.click(buttons[0])
    expect(onEditListing).toHaveBeenCalledTimes(1)

    fireEvent.click(buttons[1])
    expect(onImproveQuestions).toHaveBeenCalledTimes(1)
  })

  it('shows a hint when the new listing has no views yet', async () => {
    fetchListingStats.mockResolvedValueOnce({
      listingId: 42,
      days: [
        { date: '2026-11-17', views: 0 },
        { date: '2026-11-18', views: 0 },
      ],
      totals: { views: 0, viewsInWindow: 0, contacts: 0 },
      contactRate: 0,
    })

    renderView({
      stats: {
        active: 1,
        drafts: 0,
        contacts: 0,
        unread: 0,
        activity: { days: [{ key: '2026-11-18', count: 0 }], total: 0, max: 0 },
      },
    })

    expect(
      await screen.findByText('No views in this period yet.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('4 views in the last 2 days')).not.toBeInTheDocument()
  })

  it('uses the singular label for one remaining question', () => {
    renderView({
      checklist: [{ id: 'questions', done: false, count: 1 }],
    })

    expect(screen.getByText('Answer 1 more question')).toBeInTheDocument()
  })
})
