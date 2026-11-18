import { describe, expect, it } from 'vitest'
import { buildViewModel } from './viewModel.js'
import { TEST_STRINGS } from './test/strings.js'

const users = [
  { id: 1, name: 'Ana', email: 'ana@example.com', role: 'ADMIN', isActive: true },
  { id: 2, name: 'Ivo', email: 'ivo@example.com', role: 'USER', isActive: true },
]

const categories = [{ id: 1, descriptionId: 1, parentCategoryId: null }]

const listings = [
  { id: 10, categoryId: 1, orientation: 'sell', userId: 1, isActive: true },
  { id: 11, categoryId: 1, orientation: 'buy', userId: 2, isActive: true },
]

const raw = { users, categories, listings }

describe('buildViewModel current user', () => {
  it('has no current user when nobody is signed in', () => {
    const view = buildViewModel(raw, { userId: null, language: 'en', strings: TEST_STRINGS })

    expect(view.user).toBeNull()
    expect(view.myListings).toEqual([])
    expect(view.inbox).toEqual([])
  })

  it('treats a stored id that matches no user as signed out', () => {
    const view = buildViewModel(raw, { userId: 999, language: 'en', strings: TEST_STRINGS })

    expect(view.user).toBeNull()
    expect(view.myListings).toEqual([])
  })

  it('shows only the signed-in user listings', () => {
    const view = buildViewModel(raw, { userId: 2, language: 'en', strings: TEST_STRINGS })

    expect(view.user.id).toBe(2)
    expect(view.myListings.map((listing) => listing.listingId)).toEqual([11])
  })

  it('still builds the catalog for guests', () => {
    const view = buildViewModel(raw, { userId: null, language: 'en', strings: TEST_STRINGS })

    expect(view.interviews.map((interview) => interview.id)).toEqual(['1'])
    expect(view.browseData.root.items).toHaveLength(1)
  })
})

describe('buildViewModel category and listing counts', () => {
  it('keeps the virtual all category in interviews but out of the browse tree', () => {
    const view = buildViewModel(
      {
        users,
        listings: [{ ...listings[0], facetsCount: 2 }],
        categories: [
          {
            id: 0,
            descriptionId: 0,
            parentCategoryId: null,
            facetsCountMax: 3,
            facetsCountMaxAnswerable: 1,
          },
          {
            ...categories[0],
            facetsCountMax: 5,
            facetsCountMaxAnswerable: 4,
          },
        ],
      },
      { userId: null, language: 'en', strings: TEST_STRINGS },
    )

    expect(view.interviews.map((interview) => interview.id)).toEqual(['0', '1'])
    expect(view.interviews[0]).toMatchObject({
      title: 'All categories',
      facetsCountMax: 3,
      facetsCountMaxAnswerable: 1,
    })
    expect(view.interviews[1].facetsCountMax).toBe(5)
    expect(view.interviews[1].facetsCountMaxAnswerable).toBe(4)
    expect(view.browseData.root.items).toHaveLength(1)
    expect(view.browseData.root.items[0].id).toBe('1')
    expect(view.browseData.root.items[0].facetsCount).toBeUndefined()
    expect(view.myListings).toEqual([])
  })

  it('starts every interview with orientation, then price and year', () => {
    const view = buildViewModel(
      {
        users,
        categories,
        'facet-schemas': [
          { id: 1, categoryId: 1, isGeneric: true, name: 'condition', descriptionId: 1 },
        ],
        listings: [{ ...listings[0], price: 199.99, year: 2024 }],
      },
      { userId: null, language: 'en', strings: TEST_STRINGS },
    )

    expect(view.interviews[0].questions.map((question) => question.id)).toEqual([
      'orientation',
      '1',
      'price',
      'year',
    ])
    expect(view.interviews[0].questions[0]).toMatchObject({
      facet: 'orientation',
      type: 'option',
      required: true,
      options: [
        { id: 'sell', text: 'For Sale' },
        { id: 'buy', text: 'Wanted' },
      ],
    })
    expect(view.interviews[0].questions[2]).toMatchObject({
      type: 'numeric',
      facet: 'price',
      unit: '€',
    })
    expect(view.interviews[0].facetsCountMax).toBe(4)
    expect(view.interviews[0].facetsCountMaxAnswerable).toBe(2)
    expect(view.answers.orientation).toBe('sell')
    expect(view.answers.price).toBe(199.99)
    expect(view.answers.year).toBe(2024)
  })

  it('passes the listing answered count through to listing items', () => {
    const view = buildViewModel(
      {
        users,
        categories,
        'facet-schemas': [
          { id: 1, categoryId: 1, isGeneric: true },
          { id: 2, categoryId: 1, isGeneric: false },
        ],
        listings: [{ ...listings[0], facetsCount: 2 }],
      },
      { userId: 1, language: 'en', strings: TEST_STRINGS },
    )

    expect(view.myListings[0].facetsCount).toBe(2)
    expect(view.myListings[0].facetsCountMax).toBe(5)
    expect(view.myListings[0].facetsCountMaxAnswerable).toBe(3)
    expect(view.browseData.root.items[0].items).toBeUndefined()
    expect(view.browseData['1'].items[0].facetsCount).toBe(2)
    expect(view.browseData['1'].items[0].facetsCountMax).toBe(5)
    expect(view.browseData['1'].items[0].facetsCountMaxAnswerable).toBe(3)
  })
})

describe('buildViewModel category icons', () => {
  const iconSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24" /></svg>'
  const descriptions = [
    { id: 1, translations: { en: 'Bikes', hr: 'Bicikli' } },
  ]

  function build(category, options = {}) {
    return buildViewModel(
      {
        users,
        descriptions,
        categories: [category],
        listings,
      },
      { userId: 1, language: options.language ?? 'en', strings: TEST_STRINGS },
    )
  }

  it('passes the stored SVG to interviews and browse items', () => {
    const view = build({ ...categories[0], iconSvg })

    expect(view.interviews[0].iconSvg).toBe(iconSvg)
    expect(view.browseData.root.items[0].iconSvg).toBe(iconSvg)
    expect(view.browseData['1'].items[0].iconSvg).toBe(iconSvg)
  })

  it('gives photo-less listings their category icon and kind', () => {
    const view = build({ ...categories[0], iconSvg })

    expect(view.browseData['1'].items[0]).toMatchObject({
      iconSvg,
      thumb: 'bike',
    })
    expect(view.myListings[0].iconSvg).toBe(iconSvg)
  })

  it('keeps the title heuristic when the category has no icon', () => {
    const view = build(categories[0])

    expect(view.interviews[0].iconSvg).toBeNull()
    expect(view.browseData.root.items[0].iconSvg).toBeNull()
    expect(view.interviews[0].icon).toBe('bike')
    expect(view.browseData.root.items[0].thumb).toBe('bike')
  })

  it('reads the heuristic from English, so translations do not change the glyph', () => {
    const view = build(categories[0], { language: 'hr' })

    expect(view.interviews[0].title).toBe('Bicikli')
    expect(view.interviews[0].icon).toBe('bike')
    expect(view.browseData.root.items[0].thumb).toBe('bike')
  })

  it('falls back to the generic glyph for an unknown category', () => {
    const view = build({ ...categories[0], descriptionId: 999, iconSvg: null })

    expect(view.interviews[0].icon).toBe('layers')
    expect(view.browseData.root.items[0].thumb).toBe('tag')
  })
})

describe('buildViewModel category tree', () => {
  it('terminates when stored categories form a cycle', () => {
    const view = buildViewModel(
      {
        users,
        listings: [],
        categories: [
          { id: 1, descriptionId: 1, parentCategoryId: 1 },
          { id: 2, descriptionId: 1, parentCategoryId: 3 },
          { id: 3, descriptionId: 1, parentCategoryId: 2 },
        ],
      },
      { userId: null, language: 'en', strings: TEST_STRINGS },
    )

    expect(view.interviews.map((interview) => interview.id)).toEqual(['1', '2', '3'])
    expect(view.browseData['2'].path).toEqual(['Home', 'Category 3', 'Category 2'])
  })
})

describe('buildViewModel regions', () => {
  it('resolves region names in the UI language and keeps id 0 first', () => {
    const view = buildViewModel(
      {
        users,
        categories,
        listings: [],
        regions: [
          { id: 11, code: 'DE', descriptionId: 2 },
          { id: 0, code: 'ALL', descriptionId: 1 },
        ],
        descriptions: [
          { id: 1, name: null, translations: { en: 'All regions', hr: 'Sve regije' } },
          { id: 2, name: null, translations: { en: 'Germany', hr: 'Njemačka' } },
        ],
      },
      { userId: null, language: 'hr', strings: TEST_STRINGS },
    )

    expect(view.regions).toEqual([
      { id: 0, code: 'ALL', name: 'Sve regije' },
      { id: 11, code: 'DE', name: 'Njemačka' },
    ])
  })

  it('falls back to the country code when a name is missing', () => {
    const view = buildViewModel(
      { users, categories, listings: [], regions: [{ id: 4, code: 'HR', descriptionId: 99 }] },
      { userId: null, language: 'en', strings: TEST_STRINGS },
    )

    expect(view.regions).toEqual([{ id: 4, code: 'HR', name: 'HR' }])
  })
})
