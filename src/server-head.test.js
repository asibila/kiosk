import { describe, expect, it } from 'vitest'
import {
  buildListingHead,
  defaultHead,
  escapeHtml,
  escapeJson,
  notFoundHead,
  renderDocument,
} from './server-head.js'

const descriptions = [
  { id: 9001, language: 'en', text: 'Cars' },
  { id: 9001, language: 'hr', text: 'Automobili' },
  { id: 9002, language: 'en', text: 'New' },
  { id: 9002, language: 'hr', text: 'Novo' },
  { id: 9003, language: 'en', text: 'Germany' },
]

const data = {
  descriptions,
  categories: [{ id: 1, descriptionId: 9001, parentCategoryId: null }],
  regions: [{ id: 11, code: 'DE', descriptionId: 9003 }],
  listings: [
    {
      id: 10,
      categoryId: 1,
      regionId: 11,
      isActive: true,
      orientation: 'sell',
      price: 250,
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ],
  'listing-translations': [{ listingId: 10, language: 'en', title: 'Trek bike' }],
  'facet-schemas': [
    { id: 1, descriptionId: 9002, name: 'condition', type: 'option', isGeneric: true },
  ],
  'facet-value-options': [{ id: 8, descriptionId: 9002, schemaId: 1 }],
  'facet-value-selections': [{ id: 70, listingId: 10, facetValueOptionId: 8 }],
  'listing-images': [
    { id: 7, listingId: 10, primaryImage: true, url: '/listing-images/7/file' },
  ],
}

function head(input = {}) {
  return buildListingHead({
    data,
    listingId: 10,
    language: 'en',
    origin: 'https://site.test',
    apiBase: 'https://api.test',
    ...input,
  })
}

describe('buildListingHead', () => {
  it('builds the title, description and canonical URL', () => {
    const tags = head()

    expect(tags).toContain('<title>Trek bike · Cars · Kiosk</title>')
    expect(tags).toContain(
      '<meta name="description" content="Cars · 250 € · Germany · New" />',
    )
    expect(tags).toContain(
      '<link rel="canonical" href="https://site.test/listing/10" />',
    )
    expect(tags).toContain('<meta name="robots" content="index,follow" />')
  })

  it('links the language alternates', () => {
    const tags = head()

    expect(tags).toContain(
      '<link rel="alternate" hreflang="hr" href="https://site.test/listing/10?lang=hr" />',
    )
    expect(tags).toContain(
      '<link rel="alternate" hreflang="x-default" href="https://site.test/listing/10" />',
    )
  })

  it('publishes Open Graph data with the absolute image URL', () => {
    const tags = head()

    expect(tags).toContain('<meta property="og:type" content="product" />')
    expect(tags).toContain(
      '<meta property="og:image" content="https://api.test/listing-images/7/file" />',
    )
    expect(tags).toContain(
      '<meta property="og:url" content="https://site.test/listing/10" />',
    )
  })

  it('describes the listing as a schema.org Product with an offer', () => {
    const tags = head()
    const json = tags
      .split('<script type="application/ld+json">')[1]
      .split('</script>')[0]

    expect(JSON.parse(json)).toMatchObject({
      '@type': 'Product',
      name: 'Trek bike · Cars · Kiosk',
      category: 'Cars',
      offers: {
        '@type': 'Offer',
        price: 250,
        priceCurrency: 'EUR',
        itemCondition: 'https://schema.org/NewCondition',
        url: 'https://site.test/listing/10',
      },
    })
  })

  it('uses the requested language for the title and canonical', () => {
    const tags = head({ language: 'hr' })

    // No Croatian title yet: the English one is the fallback.
    expect(tags).toContain('<title>Trek bike · Automobili · Kiosk</title>')
    expect(tags).toContain('Novo')
    expect(tags).toContain(
      '<link rel="canonical" href="https://site.test/listing/10?lang=hr" />',
    )
  })

  it('falls back to a noindex head for an unknown listing', () => {
    expect(head({ listingId: 999 })).toBe(notFoundHead({ origin: 'https://site.test' }))
  })
})

describe('notFoundHead', () => {
  it('asks crawlers not to index the page', () => {
    expect(notFoundHead({ origin: 'https://site.test' })).toContain(
      '<meta name="robots" content="noindex,follow" />',
    )
  })
})

describe('escapeHtml / escapeJson', () => {
  it('escapes markup and attribute-breaking characters', () => {
    expect(escapeHtml(`<b>"x" & 'y'</b>`)).toBe(
      '&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;',
    )
  })

  it('cannot close the inline script tag', () => {
    const json = escapeJson({ title: '</script><script>alert(1)</script>' })

    expect(json).not.toContain('</script>')
    expect(json).toContain('\\u003c')
    expect(JSON.parse(json.replace(/\\u003c/g, '<').replace(/\\u003e/g, '>'))).toEqual({
      title: '</script><script>alert(1)</script>',
    })
  })
})

describe('renderDocument', () => {
  const template = `<!doctype html>
<html lang="en">
  <head><!--ssr-head--><title>Default</title><!--/ssr-head--></head>
  <body><div id="root"><!--ssr-outlet--></div></body>
</html>`

  it('keeps the default head and leaves the root empty for SPA routes', () => {
    expect(defaultHead(template)).toBe('<title>Default</title>')

    const html = renderDocument({ template })

    expect(html).toContain('<title>Default</title>')
    expect(html).not.toContain('ssr-outlet')
    expect(html).not.toContain('__KIOSK_BOOT__')
  })

  it('replaces the head, the outlet and the language', () => {
    const html = renderDocument({
      template,
      head: '<title>Page</title>',
      appHtml: '<main>rendered</main>',
      language: 'hr',
    })

    expect(html).toContain('<title>Page</title>')
    expect(html).not.toContain('<title>Default</title>')
    expect(html).toContain('<div id="root"><main>rendered</main></div>')
    expect(html).toContain('<html lang="hr">')
  })

  it('adds the boot payload and treats markup literally', () => {
    const html = renderDocument({
      template,
      appHtml: '<p>$& $1 $`</p>',
      boot: { language: 'en', data: { x: '</script>' } },
    })

    // Replacement strings must not be interpreted as `$&`/`$1` patterns.
    expect(html).toContain('<p>$& $1 $`</p>')
    expect(html).toContain('<script>window.__KIOSK_BOOT__=')
    expect(html).not.toContain('</script></script>')
    expect(html).toContain('\\u003c/script\\u003e')
  })
})
