// Server-render smoke test: the whole app has to produce real markup from the
// payload the SSR entry passes in, without running effects or touching the
// browser-only storage it normally reads.
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import App from './App.jsx'
import { createStrings } from './i18n.jsx'
import { TEST_DESCRIPTIONS } from './test/strings.js'

// One category ("Cars" / "Automobili") with one active listing.
const categoryDescription = {
  id: 9001,
  name: null,
  translations: { en: 'Cars', hr: 'Automobili' },
}

const strings = createStrings([...TEST_DESCRIPTIONS, categoryDescription])

const raw = {
  users: [{ id: 1, name: 'Ana', email: 'ana@example.com', isActive: true }],
  languages: [
    { code: 'en', name: 'English' },
    { code: 'hr', name: 'Hrvatski' },
  ],
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
      year: 2023,
    },
    {
      id: 11,
      categoryId: 1,
      orientation: 'buy',
      userId: 1,
      isActive: false,
    },
  ],
  'listing-translations': [
    { listingId: 10, language: 'en', title: 'Trek bike' },
    { listingId: 10, language: 'hr', title: 'Trek bicikl' },
  ],
  'facet-schemas': [],
  'facet-value-options': [],
  'facet-value-selections': [],
  'listing-images': [],
}

function renderAt(url, { language = 'en' } = {}) {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App
          initialData={raw}
          initialStrings={strings}
          initialLanguage={language}
          initialTheme={null}
        />
      </StaticRouter>
    </StrictMode>,
  )
}

describe('server rendering with preloaded data', () => {
  it('renders /results with the catalog instead of a loading placeholder', () => {
    const html = renderAt('/results')

    expect(html).not.toContain('app-boot')
    expect(html).toContain('Trek bike')
    expect(html).toContain('Cars')
    // The unpublished draft stays out of the public results.
    expect(html).not.toContain('result-card inactive')
  })

  it('renders the language from the server, not the browser default', () => {
    const html = renderAt('/results', { language: 'hr' })

    expect(html).toContain('Automobili')
    expect(html).toContain('Trek bicikl')
    expect(html).toContain(strings.hr['results.title'])
  })

  it('renders /listing/:id from the same payload', () => {
    const html = renderAt('/listing/10')

    expect(html).toContain('Trek bike')
    expect(html).toContain('250')
  })

  it('renders a result count that matches the preloaded listings', () => {
    const html = renderAt('/results')

    expect(html).toMatch(/1/)
    expect(html).toContain(strings.en['results.title'])
  })
})
