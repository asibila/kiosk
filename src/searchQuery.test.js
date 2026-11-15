import { describe, expect, it } from 'vitest'
import {
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
    orientation: 'sell',
    title: 'Mobile phones #28',
    createdAt: '2026-01-01T10:00:00.000Z',
  },
  {
    id: '2',
    categoryId: '2',
    orientation: 'buy',
    title: 'Mobile phones #25',
    createdAt: '2026-01-02T10:00:00.000Z',
  },
  {
    id: '3',
    categoryId: '1',
    orientation: 'sell',
    title: 'Electronics #30',
    createdAt: '2026-01-03T10:00:00.000Z',
  },
  {
    id: '4',
    categoryId: '3',
    orientation: 'sell',
    title: 'Vehicles #31',
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
      'category=2&direction=buy&facet=condition%3A8&range=price%3A500-',
    )
    expect(parseSearchQuery(`?${params}`)).toEqual({
      categoryId: '2',
      direction: 'buy',
      chips: [
        { kind: 'value', facet: 'condition', valueId: '8' },
        { kind: 'range', facet: 'price', min: 500, max: null },
      ],
    })
  })

  it('drops malformed or unsupported parameters', () => {
    const parsed = parseSearchQuery(
      '?category=abc&direction=maybe&facet=bad&facet=brand:x&facet=brand:4' +
        '&range=weight:1-2&range=price:200-100&range=year:-',
    )

    expect(parsed.categoryId).toBe('')
    expect(parsed.direction).toBeNull()
    expect(parsed.chips).toEqual([
      { kind: 'value', facet: 'brand', valueId: '4' },
      { kind: 'range', facet: 'price', min: 100, max: 200 },
    ])
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

  it('keeps range chips in the query but does not filter on them yet', () => {
    const rows = filterListings({
      listings,
      selections,
      categories,
      chips: [{ kind: 'range', facet: 'price', min: 100, max: 200 }],
    })

    expect(rows).toHaveLength(4)
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
})
