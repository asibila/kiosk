import { describe, expect, it } from 'vitest'
import {
  answersFromSearchQuery,
  buildOptionIndex,
  buildSearchParams,
  categoryScope,
  filterListings,
  parseSearchQuery,
  resolveChips,
} from './searchQuery.js'

const categories = [
  {
    categoryId: 1,
    parentCategoryId: null,
    title: 'Electronics',
    questions: [
      {
        id: 'orientation',
        facet: 'orientation',
        text: 'For Sale / Wanted',
        options: [
          { id: 'sell', text: 'For Sale' },
          { id: 'buy', text: 'Wanted' },
        ],
      },
      {
        id: '1',
        facet: 'condition',
        text: 'Condition',
        options: [{ id: '8', text: 'New' }],
      },
    ],
  },
  { categoryId: 2, parentCategoryId: 1, title: 'Mobile phones', questions: [] },
  { categoryId: 3, parentCategoryId: null, title: 'Vehicles', questions: [] },
]

const listings = [
  {
    id: '1',
    categoryId: '2',
    regionId: 4,
    orientation: 'sell',
    title: 'Mobile phones #28',
    price: 100,
    year: 2020,
    createdAt: '2026-01-01T10:00:00.000Z',
  },
  {
    id: '2',
    categoryId: '2',
    regionId: 11,
    orientation: 'buy',
    title: 'Mobile phones #25',
    price: 250,
    year: 2022,
    createdAt: '2026-01-02T10:00:00.000Z',
  },
  {
    id: '3',
    categoryId: '1',
    regionId: 4,
    orientation: 'sell',
    title: 'Electronics #30',
    price: 150,
    year: 2019,
    createdAt: '2026-01-03T10:00:00.000Z',
  },
  {
    id: '4',
    categoryId: '3',
    regionId: 0,
    orientation: 'sell',
    title: 'Vehicles #31',
    price: null,
    year: null,
    createdAt: '2026-01-04T10:00:00.000Z',
  },
]

const selections = [
  { listingId: 1, facetValueOptionId: 8 },
  { listingId: 2, facetValueOptionId: 8 },
  { listingId: 3, facetValueOptionId: 9 },
]

describe('buildSearchParams / parseSearchQuery', () => {
  it('round-trips a structured query', () => {
    const params = buildSearchParams({
      categoryId: '2',
      regionId: '4',
      direction: 'buy',
      chips: [
        {
          kind: 'value',
          facet: 'condition',
          facetLabel: 'Condition',
          valueId: '8',
          label: 'New',
        },
        { kind: 'range', facet: 'price', facetLabel: 'Price', min: 500, max: null },
      ],
    })

    expect(params.toString()).toBe(
      'category=2&region=4&direction=buy&facet=condition%3A8&range=price%3A500-',
    )
    expect(parseSearchQuery(`?${params}`)).toEqual({
      categoryId: '2',
      regionId: '4',
      direction: 'buy',
      chips: [
        { kind: 'value', facet: 'condition', valueId: '8' },
        { kind: 'range', facet: 'price', min: 500, max: null },
      ],
    })
  })

  it('omits region 0 so "all regions" is the same as no region parameter', () => {
    expect(buildSearchParams({ regionId: 0 }).toString()).toBe('')
    expect(parseSearchQuery('?region=0').regionId).toBe('')
    expect(parseSearchQuery('?region=abc').regionId).toBe('')
  })

  it('drops malformed or unsupported parameters', () => {
    const parsed = parseSearchQuery(
      '?category=abc&direction=maybe&facet=bad&facet=brand:x&facet=brand:4' +
        '&facet=orientation:maybe&range=weight:1-2&range=price:200-100&range=year:-',
    )

    expect(parsed.categoryId).toBe('')
    expect(parsed.regionId).toBe('')
    expect(parsed.direction).toBeNull()
    expect(parsed.chips).toEqual([
      { kind: 'value', facet: 'brand', valueId: '4' },
      { kind: 'range', facet: 'price', min: 100, max: 200 },
    ])
  })

  it('round-trips an orientation facet chip', () => {
    const params = buildSearchParams({
      chips: [
        {
          kind: 'value',
          facet: 'orientation',
          facetLabel: 'For Sale / Wanted',
          valueId: 'sell',
          label: 'For Sale',
        },
      ],
    })

    expect(params.toString()).toBe('facet=orientation%3Asell')
    expect(parseSearchQuery(`?${params}`)).toEqual({
      categoryId: '',
      regionId: '',
      direction: null,
      chips: [{ kind: 'value', facet: 'orientation', valueId: 'sell' }],
    })
  })
})

describe('categoryScope / filterListings', () => {
  it('includes the selected category subtree', () => {
    expect([...categoryScope('1', categories)].sort()).toEqual(['1', '2'])
    expect(categoryScope('', categories)).toBeNull()
  })

  it('filters by category subtree, direction and value chips', () => {
    const rows = filterListings({
      listings,
      selections,
      categories,
      categoryId: '1',
      direction: 'buy',
      chips: [{ kind: 'value', facet: 'condition', valueId: '8' }],
    })

    // Category 1 includes Electronics + Mobile phones; Buy shows sell listings;
    // only listing 1 owns condition option 8.
    expect(rows.map((row) => row.id)).toEqual(['1'])
  })

  it('filters by region and excludes global listings for a country', () => {
    const croatia = filterListings({ listings, categories, regionId: '4' })
    expect(croatia.map((row) => row.id)).toEqual(['3', '1'])

    // Empty and 0 both mean "all regions": global listings are included.
    const all = filterListings({ listings, categories, regionId: '' })
    expect(all.map((row) => row.id)).toEqual(['4', '3', '2', '1'])
    expect(
      filterListings({ listings, categories, regionId: 0 }).map((row) => row.id),
    ).toEqual(['4', '3', '2', '1'])
  })

  it('combines the region with the other filters', () => {
    const rows = filterListings({
      listings,
      selections,
      categories,
      regionId: '4',
      chips: [{ kind: 'value', facet: 'condition', valueId: '8' }],
    })

    // Listing 1 is in Croatia and owns option 8; listing 3 is Croatia but has
    // option 9, and listing 2 (Germany) is excluded by the region.
    expect(rows.map((row) => row.id)).toEqual(['1'])
  })

  it('filters by the orientation facet directly', () => {
    const rows = filterListings({
      listings,
      selections,
      categories,
      chips: [{ kind: 'value', facet: 'orientation', valueId: 'sell' }],
    })

    // For Sale means the listing orientation, unlike the legacy "direction"
    // parameter (which described the searcher's intent).
    expect(rows.map((row) => row.id)).toEqual(['4', '3', '1'])
  })

  it('filters price and year ranges and excludes listings without the field', () => {
    const byPrice = filterListings({
      listings,
      selections,
      categories,
      chips: [{ kind: 'range', facet: 'price', min: 100, max: 200 }],
    })
    expect(byPrice.map((row) => row.id)).toEqual(['3', '1'])

    const byYear = filterListings({
      listings,
      selections,
      categories,
      chips: [{ kind: 'range', facet: 'year', min: 2020, max: null }],
    })
    expect(byYear.map((row) => row.id)).toEqual(['2', '1'])
  })

  it('sorts newest first', () => {
    const rows = filterListings({ listings, categories, categoryId: '1' })
    expect(rows.map((row) => row.id)).toEqual(['3', '2', '1'])
  })
})

describe('resolveChips', () => {
  it('resolves catalog labels and drops unknown value ids', () => {
    const index = buildOptionIndex(categories)
    const resolved = resolveChips(
      [
        { kind: 'value', facet: 'condition', valueId: '8' },
        { kind: 'value', facet: 'brand', valueId: '999' },
        { kind: 'range', facet: 'price', min: null, max: 100 },
      ],
      index,
      { price: 'Price' },
    )

    expect(resolved).toEqual([
      {
        kind: 'value',
        facet: 'condition',
        facetLabel: 'Condition',
        valueId: '8',
        label: 'New',
      },
      { kind: 'range', facet: 'price', min: null, max: 100, facetLabel: 'Price' },
    ])
  })

  it('resolves the orientation facet from the synthetic options', () => {
    const index = buildOptionIndex(categories)
    const resolved = resolveChips(
      [{ kind: 'value', facet: 'orientation', valueId: 'buy' }],
      index,
    )

    expect(resolved).toEqual([
      {
        kind: 'value',
        facet: 'orientation',
        facetLabel: 'For Sale / Wanted',
        valueId: 'buy',
        label: 'Wanted',
      },
    ])
  })
})

describe('answersFromSearchQuery', () => {
  const interview = {
    questions: [
      {
        id: 'orientation',
        facet: 'orientation',
        type: 'option',
        options: [
          { id: 'sell', text: 'For Sale' },
          { id: 'buy', text: 'Wanted' },
        ],
      },
      {
        id: '1',
        facet: 'condition',
        type: 'option',
        options: [
          { id: '8', text: 'New' },
          { id: '9', text: 'Used' },
        ],
      },
      { id: 'price', facet: 'price', type: 'numeric', options: [] },
      { id: 'year', facet: 'year', type: 'numeric', options: [] },
      {
        id: '5',
        facet: 'brand',
        type: 'option',
        options: [{ id: '20', text: 'Acer' }],
      },
    ],
  }

  it('answers the facet questions the search filtered on', () => {
    const query = parseSearchQuery(
      '?facet=condition:8&facet=orientation:sell&facet=brand:20',
    )

    expect(answersFromSearchQuery(query, interview)).toEqual({
      '1': '8',
      orientation: 'sell',
      '5': '20',
    })
  })

  it('uses the middle of a selected range for price and year', () => {
    const query = parseSearchQuery('?range=price:500-1000&range=year:2014-2019')

    expect(answersFromSearchQuery(query, interview)).toEqual({
      price: 750,
      year: 2017,
    })
  })

  it('uses the one bound of an open range', () => {
    const query = parseSearchQuery('?range=price:500-&range=year:-2020')

    expect(answersFromSearchQuery(query, interview)).toEqual({
      price: 500,
      year: 2020,
    })
  })

  it('drops values that belong to another category', () => {
    const query = parseSearchQuery('?facet=brand:77&facet=condition:8')

    // Brand option 77 is not one of this interview's options.
    expect(answersFromSearchQuery(query, interview)).toEqual({ '1': '8' })
    expect(
      answersFromSearchQuery(query, { questions: interview.questions.slice(0, 1) }),
    ).toEqual({})
  })

  it('reads the legacy direction parameter as a listing orientation', () => {
    const query = parseSearchQuery('?direction=buy')

    expect(answersFromSearchQuery(query, interview)).toEqual({ orientation: 'sell' })
  })
})
