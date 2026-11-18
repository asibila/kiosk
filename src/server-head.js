// Head tags and HTML document assembly for the server-rendered listing pages.
//
// Everything here is pure: it takes the raw catalog rows `loadListingPage()`
// returns (the same shapes `buildViewModel()` consumes) and produces strings.
// That keeps the SEO output unit-testable and lets a pre-render step reuse it.

const SITE_NAME = 'Kiosk'
const MAX_TITLE = 70
const MAX_DESCRIPTION = 160

/** Escape a value for use in HTML text or an attribute value. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Serialize a value as JSON that is safe inside an inline `<script>`: the
 * characters that could close the tag or break the script are escaped.
 */
export function escapeJson(value) {
  return JSON.stringify(value ?? null)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/** Shorten text on a word boundary so titles/descriptions stay readable. */
function clamp(text, limit) {
  const value = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (value.length <= limit) return value
  const cut = value.slice(0, limit - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > limit * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

/**
 * `Description` rows are either one row per language (`{ id, language, text }`)
 * or already grouped (`{ id, translations: { en, hr } }`). Group them once per
 * render so lookups are cheap.
 */
export function indexDescriptions(descriptions = []) {
  const texts = new Map()
  for (const row of descriptions) {
    if (!row || row.id == null) continue
    const group = texts.get(row.id) ?? {}
    if (row.translations) {
      for (const [language, text] of Object.entries(row.translations)) {
        if (typeof text === 'string') group[language] ??= text
      }
    }
    if (typeof row.text === 'string' && row.language) {
      group[row.language] ??= row.text
    }
    texts.set(row.id, group)
  }
  return texts
}

/** Pick the language's text, falling back to English, then any translation. */
function textOf(texts, descriptionId, language, fallback = '') {
  const group = texts.get(descriptionId)
  if (!group) return fallback
  return group[language] ?? group.en ?? Object.values(group)[0] ?? fallback
}

/** Listing title: the UI-language translation, English, any, then generated. */
function listingTitle(translations, listing, language, fallback) {
  const titles = {}
  for (const row of translations) {
    if (Number(row.listingId) === Number(listing.id)) {
      titles[row.language] = row.title
    }
  }
  return titles[language] ?? titles.en ?? Object.values(titles)[0] ?? fallback
}

function categoryChain(categories, categoryId) {
  const byId = new Map(categories.map((row) => [Number(row.id), row]))
  const chain = []
  const seen = new Set()
  let current = byId.get(Number(categoryId))
  while (current && !seen.has(Number(current.id))) {
    seen.add(Number(current.id))
    chain.unshift(current)
    current =
      current.parentCategoryId != null ? byId.get(Number(current.parentCategoryId)) : null
  }
  return chain
}

/** Human summary of the answered facets, e.g. "New", "14 inch", "Zagreb". */
function facetSummary({ data, listing, language, texts }) {
  const optionsById = new Map(
    (data['facet-value-options'] ?? []).map((row) => [Number(row.id), row]),
  )
  const schemasById = new Map(
    (data['facet-schemas'] ?? []).map((row) => [Number(row.id), row]),
  )
  const parts = []
  for (const selection of data['facet-value-selections'] ?? []) {
    if (Number(selection.listingId) !== Number(listing.id)) continue
    const option = optionsById.get(Number(selection.facetValueOptionId))
    if (!option) continue
    const schema = schemasById.get(Number(option.schemaId))
    if (!schema || schema.type === 'numeric') continue
    const label = textOf(texts, option.descriptionId, language, '')
    if (label) parts.push(label)
  }
  return parts
}

/** Absolute URL of the listing's primary image, when it has one. */
function primaryImageUrl(data, listingId, apiBase) {
  const images = (data['listing-images'] ?? []).filter(
    (row) => Number(row.listingId) === Number(listingId),
  )
  if (images.length === 0) return null
  const primary = images.find((row) => row.primaryImage) ?? images[0]
  const path = primary.url ?? `/listing-images/${primary.id}/file`
  return apiBase ? `${apiBase.replace(/\/+$/, '')}${path}` : path
}

/** Schema.org condition for the listing's `condition` facet, when known. */
function itemCondition(data, listing, texts) {
  const schemas = (data['facet-schemas'] ?? []).filter(
    (row) => row.name === 'condition',
  )
  if (schemas.length === 0) return null
  const schemaIds = new Set(schemas.map((row) => Number(row.id)))
  const options = new Map(
    (data['facet-value-options'] ?? [])
      .filter((row) => schemaIds.has(Number(row.schemaId)))
      .map((row) => [Number(row.id), row]),
  )
  const selected = (data['facet-value-selections'] ?? []).find(
    (row) =>
      Number(row.listingId) === Number(listing.id) &&
      options.has(Number(row.facetValueOptionId)),
  )
  if (!selected) return null
  // Compare against the English text so the mapping does not depend on the
  // language the page is rendered in.
  const english = textOf(texts, options.get(Number(selected.facetValueOptionId)).descriptionId, 'en', '')
  if (/^new$/i.test(english)) return 'https://schema.org/NewCondition'
  if (/^used$/i.test(english)) return 'https://schema.org/UsedCondition'
  return null
}

/**
 * Head tags for one listing page. `origin` is the public site origin used for
 * canonical/Open Graph URLs; `apiBase` only for the image URL.
 *
 * @param {{data: any, listingId: number|string, language?: string, origin: string, apiBase?: string}} input
 * @returns {string} HTML fragment for the `<head>`
 */
export function buildListingHead({
  data,
  listingId,
  language = 'en',
  origin,
  apiBase = '',
}) {
  const texts = indexDescriptions(data.descriptions)
  const listing = (data.listings ?? []).find(
    (row) => Number(row.id) === Number(listingId),
  )
  if (!listing) return notFoundHead({ origin })

  const chain = categoryChain(data.categories ?? [], listing.categoryId)
  const categoryTitle = chain.length
    ? textOf(texts, chain[chain.length - 1].descriptionId, language, '')
    : ''

  const title = clamp(
    [
      listingTitle(
        data['listing-translations'] ?? [],
        listing,
        language,
        `${categoryTitle || 'Listing'} #${listing.id}`,
      ),
      categoryTitle || null,
      SITE_NAME,
    ]
      .filter(Boolean)
      .join(' · '),
    MAX_TITLE,
  )

  const region = (data.regions ?? []).find(
    (row) => Number(row.id) === Number(listing.regionId),
  )
  const regionName = region
    ? textOf(texts, region.descriptionId, language, region.code ?? '')
    : ''

  const base = String(origin ?? '').replace(/\/+$/, '')
  const canonical = `${base}/listing/${listing.id}${
    language === 'en' ? '' : `?lang=${language}`
  }`
  const alternates = [
    { hreflang: 'en', href: `${base}/listing/${listing.id}` },
    { hreflang: 'hr', href: `${base}/listing/${listing.id}?lang=hr` },
    { hreflang: 'x-default', href: `${base}/listing/${listing.id}` },
  ]

  const description = clamp(
    [
      categoryTitle,
      listing.price != null ? `${listing.price} €` : '',
      regionName,
      ...facetSummary({ data, listing, language, texts }),
    ]
      .filter(Boolean)
      .join(' · '),
    MAX_DESCRIPTION,
  )

  const image = primaryImageUrl(data, listing.id, apiBase)
  const condition = itemCondition(data, listing, texts)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: title,
    ...(description ? { description } : {}),
    ...(image ? { image: [image] } : {}),
    ...(categoryTitle ? { category: categoryTitle } : {}),
    ...(listing.price != null
      ? {
          offers: {
            '@type': 'Offer',
            price: Number(listing.price),
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
            url: canonical,
            ...(condition ? { itemCondition: condition } : {}),
          },
        }
      : {}),
  }

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${base}/` },
      ...(categoryTitle
        ? [
            {
              '@type': 'ListItem',
              position: 2,
              name: categoryTitle,
              item: `${base}/results?category=${listing.categoryId}`,
            },
          ]
        : []),
      {
        '@type': 'ListItem',
        position: categoryTitle ? 3 : 2,
        name: title,
        item: canonical,
      },
    ],
  }

  return [
    `<title>${escapeHtml(title)}</title>`,
    description ? `<meta name="description" content="${escapeHtml(description)}" />` : '',
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    ...alternates.map(
      (row) =>
        `<link rel="alternate" hreflang="${row.hreflang}" href="${escapeHtml(row.href)}" />`,
    ),
    '<meta name="robots" content="index,follow" />',
    '<meta property="og:type" content="product" />',
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    description
      ? `<meta property="og:description" content="${escapeHtml(description)}" />`
      : '',
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : '',
    `<meta property="og:locale" content="${language === 'hr' ? 'hr_HR' : 'en_US'}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    description
      ? `<meta name="twitter:description" content="${escapeHtml(description)}" />`
      : '',
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : '',
    `<script type="application/ld+json">${escapeJson(jsonLd)}</script>`,
    `<script type="application/ld+json">${escapeJson(breadcrumbs)}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ')
}

/** Head for a page that must not be indexed (404, error, private routes). */
export function notFoundHead({ origin = '', title = `Page not found · ${SITE_NAME}` } = {}) {
  return [
    `<title>${escapeHtml(title)}</title>`,
    '<meta name="robots" content="noindex,follow" />',
    origin ? `<link rel="canonical" href="${escapeHtml(`${origin}/`)}" />` : '',
  ]
    .filter(Boolean)
    .join('\n    ')
}

const HEAD_START = '<!--ssr-head-->'
const HEAD_END = '<!--/ssr-head-->'
const OUTLET = '<!--ssr-outlet-->'

/** The default head baked into `index.html`, used when no page head is given. */
export function defaultHead(template) {
  const start = template.indexOf(HEAD_START)
  const end = template.indexOf(HEAD_END)
  if (start === -1 || end === -1) return ''
  return template.slice(start + HEAD_START.length, end).trim()
}

/** Replace the text between the head markers, in place. */
function replaceHeadRegion(template, head) {
  const start = template.indexOf(HEAD_START)
  const end = template.indexOf(HEAD_END)
  if (start === -1 || end === -1) return template
  // `slice(0, start)` keeps the indentation before the marker, and the slice
  // after the closing marker starts with its own newline.
  return template.slice(0, start) + head + template.slice(end + HEAD_END.length)
}

/**
 * Assemble the final HTML document.
 *
 * `boot`, when present, is serialized into `window.__KIOSK_BOOT__` so the browser
 * hydrates the server markup instead of re-rendering from scratch.
 */
export function renderDocument({
  template,
  head = null,
  appHtml = '',
  boot = null,
  language = null,
}) {
  let html = replaceHeadRegion(template, head ?? defaultHead(template))
  html = html.replace(OUTLET, () => appHtml)
  if (language) {
    html = html.replace(/<html lang="[^"]*"/, `<html lang="${escapeHtml(language)}"`)
  }
  if (boot) {
    const script = `<script>window.__KIOSK_BOOT__=${escapeJson(boot)}</script>`
    html = html.replace('</body>', () => `${script}\n  </body>`)
  }
  return html
}
