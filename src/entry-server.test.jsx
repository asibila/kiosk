// The SSR entry must produce real markup from preloaded data, outside a
// browser: no effects, no fetch, no hydration.
import { describe, expect, it } from 'vitest'
import { renderApp } from './entry-server.jsx'

const data = {
  users: [{ id: 1, name: 'Ana', email: 'ana@example.com', isActive: true }],
  languages: [{ code: 'en', name: 'English' }],
  descriptions: [
    { id: 9001, language: 'en', text: 'Cars' },
    { id: 9002, language: 'en', text: 'New' },
  ],
  categories: [{ id: 1, descriptionId: 9001, parentCategoryId: null }],
  regions: [{ id: 11, code: 'DE', descriptionId: 9001 }],
  listings: [
    {
      id: 10,
      categoryId: 1,
      regionId: 11,
      orientation: 'sell',
      userId: 1,
      isActive: true,
      price: 250,
    },
  ],
  'listing-translations': [{ listingId: 10, language: 'en', title: 'Trek bike' }],
  'facet-schemas': [],
  'facet-value-options': [],
  'facet-value-selections': [],
  'listing-images': [],
}

const strings = { en: { 'listing.back': 'Back to search' } }

describe('renderApp', () => {
  it('renders a listing page with its title, price and category', () => {
    const { html } = renderApp({ url: '/listing/10', data, strings })

    expect(html).toContain('Trek bike')
    expect(html).toContain('Cars')
    expect(html).toContain('250')
    expect(html).toContain('listing-page')
  })

  it('renders the same page in the requested language', () => {
    const { html } = renderApp({ url: '/listing/10', data, strings, language: 'hr' })

    expect(html).toContain('Trek bike')
    expect(html).toContain('lang')
  })
})
