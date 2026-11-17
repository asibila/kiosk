// Structured search query <-> URL parameters, plus the listing filter shared by
// the search form and the /results page.
//
// The URL is the serialized form of the query so results can be bookmarked:
//
//   /results?category=2&region=4&direction=buy&facet=condition:1&range=price:500-1000
//
// A `region` > 0 keeps only listings tagged with that region (global listings
// are excluded); without it the search covers every region.
//
// Only structured ids are encoded; labels are resolved from the catalog again
// when the URL is parsed, so switching language never leaves stale labels in a
// bookmark.
import { isRangeChip, isValueChip } from './facetTypes.js'

/** Numeric facets accepted in `range=` parameters. */
const RANGE_FACETS = new Set(['price', 'year'])
const DIRECTIONS = new Set(['buy', 'sell'])

/** Orientation is a facet, but its values are the Listing.orientation enum. */
export const ORIENTATION_FACET = 'orientation'
export const ORIENTATION_VALUES = new Set(['buy', 'sell'])

function formatBound(value) {
  return value == null ? '' : String(value)
}

/**
 * Serialize a search query into URLSearchParams. Region `0` (all regions) is
 * omitted, so an old link without `region` keeps searching everything.
 * @param {{categoryId?: string|number, regionId?: string|number, direction?: 'buy'|'sell'|null, chips?: import('./facetTypes.js').FacetChip[]}} query
 */
export function buildSearchParams({
  categoryId = '',
  regionId = '',
  direction = null,
  chips = [],
} = {}) {
  const params = new URLSearchParams()
  if (categoryId) params.set('category', String(categoryId))
  const region = Number(regionId)
  if (Number.isInteger(region) && region > 0) params.set('region', String(region))
  if (direction && DIRECTIONS.has(direction)) params.set('direction', direction)

  for (const chip of chips) {
    if (isValueChip(chip) && chip.facet && chip.valueId) {
      params.append('facet', `${chip.facet}:${chip.valueId}`)
      continue
    }
    if (isRangeChip(chip) && RANGE_FACETS.has(chip.facet)) {
      params.append(
        'range',
        `${chip.facet}:${formatBound(chip.min)}-${formatBound(chip.max)}`,
      )
    }
  }
  return params
}

/**
 * Parse and validate a search query from a location search string.
 * Unknown facets, malformed ids and non-numeric ranges are dropped.
 * @param {string} [search]
 * @returns {{categoryId: string, regionId: string, direction: 'buy'|'sell'|null, chips: import('./facetTypes.js').FacetChip[]}}
 */
export function parseSearchQuery(search = '') {
  const params = new URLSearchParams(search ?? '')
  const result = { categoryId: '', regionId: '', direction: null, chips: [] }

  const category = Number(params.get('category'))
  if (Number.isInteger(category) && category > 0) result.categoryId = String(category)

  // 0 / missing means "all regions" and applies no filter.
  const region = Number(params.get('region'))
  if (Number.isInteger(region) && region > 0) result.regionId = String(region)

  const direction = params.get('direction')
  if (direction && DIRECTIONS.has(direction)) result.direction = direction

  const seenValues = new Set()
  for (const raw of params.getAll('facet')) {
    const separator = raw.indexOf(':')
    if (separator <= 0) continue
    const facet = raw.slice(0, separator).trim()
    const valueId = raw.slice(separator + 1).trim()
    if (!/^[a-z0-9_]+$/i.test(facet)) continue
    if (facet === ORIENTATION_FACET) {
      if (!ORIENTATION_VALUES.has(valueId)) continue
    } else if (!/^\d+$/.test(valueId) || Number(valueId) <= 0) {
      continue
    }

    const key = `${facet}:${valueId}`
    if (seenValues.has(key)) continue
    seenValues.add(key)
    result.chips.push({ kind: 'value', facet, valueId })
  }

  const seenRanges = new Set()
  for (const raw of params.getAll('range')) {
    const separator = raw.indexOf(':')
    if (separator <= 0) continue
    const facet = raw.slice(0, separator).trim()
    if (!RANGE_FACETS.has(facet) || seenRanges.has(facet)) continue

    const bounds = raw.slice(separator + 1).match(/^(\d*(?:\.\d+)?)-(\d*(?:\.\d+)?)$/)
    if (!bounds) continue

    let min = bounds[1] === '' ? null : Number(bounds[1])
    let max = bounds[2] === '' ? null : Number(bounds[2])
    if (min == null && max == null) continue
    if (min != null && !Number.isFinite(min)) continue
    if (max != null && !Number.isFinite(max)) continue
    if (min != null && max != null && min > max) [min, max] = [max, min]

    seenRanges.add(facet)
    result.chips.push({ kind: 'range', facet, min, max })
  }

  return result
}

/** Category id from a location search string ('' when absent/invalid). */
export function getCategoryIdFromSearch(search = '') {
  return parseSearchQuery(search).categoryId
}

/** Flat option id -> { question, option } index over every category interview. */
export function buildOptionIndex(categories = []) {
  const index = new Map()
  for (const category of categories) {
    for (const question of category.questions ?? []) {
      for (const option of question.options ?? []) {
        index.set(String(option.id), { question, option })
      }
    }
  }
  return index
}

/**
 * Turn parsed URL chips into display chips by resolving catalog labels.
 * Value ids that no longer exist are dropped so stale bookmarks stay useful.
 * @param {import('./facetTypes.js').FacetChip[]} chips
 * @param {Map<string, {question: any, option: any}>} optionIndex
 * @param {Record<string, string>} [rangeLabels]
 */
export function resolveChips(chips = [], optionIndex = new Map(), rangeLabels = {}) {
  const resolved = []
  for (const chip of chips) {
    if (isRangeChip(chip)) {
      resolved.push({
        ...chip,
        facetLabel: rangeLabels[chip.facet] ?? chip.facet,
      })
      continue
    }

    const match = optionIndex.get(String(chip.valueId))
    if (!match) continue
    resolved.push({
      kind: 'value',
      facet: match.question.facet ?? match.question.id,
      facetLabel: match.question.text,
      valueId: String(match.option.id),
      label: match.option.text,
    })
  }
  return resolved
}

/** All category ids that belong to a selected category's subtree. */
export function categoryScope(categoryId, categories = []) {
  if (!categoryId) return null
  const ids = new Set([String(categoryId)])
  let changed = true
  while (changed) {
    changed = false
    for (const category of categories) {
      if (
        category.parentCategoryId != null &&
        ids.has(String(category.parentCategoryId)) &&
        !ids.has(String(category.categoryId))
      ) {
        ids.add(String(category.categoryId))
        changed = true
      }
    }
  }
  return ids
}

/**
 * Apply a structured query to a flat listing list. Category filters include
 * descendants, a buy search shows sell listings (and vice versa), value chips
 * are AND constraints, and price/year ranges filter the matching Listing
 * fields. Listings without the requested numeric field are excluded.
 *
 * `regionId` > 0 keeps only listings tagged with that region; global listings
 * (`regionId: 0`) are not included. `regionId` 0 or empty means all regions.
 *
 * Orientation is also a value chip (`facet: "orientation"`); unlike the legacy
 * `direction` parameter it filters `Listing.orientation` directly.
 */
export function filterListings({
  listings = [],
  selections = [],
  categories = [],
  categoryId = '',
  regionId = '',
  direction = null,
  chips = [],
} = {}) {
  const scope = categoryScope(categoryId, categories)
  const region = Number(regionId)
  const regionFilter = Number.isInteger(region) && region > 0 ? region : null
  const wantedOrientation =
    direction === 'buy' ? 'sell' : direction === 'sell' ? 'buy' : null
  const orientationValues = chips
    .filter((chip) => isValueChip(chip) && chip.facet === ORIENTATION_FACET)
    .map((chip) => String(chip.valueId))
    .filter((valueId) => ORIENTATION_VALUES.has(valueId))
  const valueIds = chips
    .filter((chip) => isValueChip(chip) && chip.facet !== ORIENTATION_FACET)
    .map((chip) => String(chip.valueId))
  const rangeChips = chips.filter(isRangeChip)

  const rows = listings.filter((listing) => {
    if (scope && !scope.has(String(listing.categoryId))) return false
    if (regionFilter != null && Number(listing.regionId) !== regionFilter) return false
    if (wantedOrientation && listing.orientation !== wantedOrientation) return false
    if (orientationValues.length > 0 && !orientationValues.includes(listing.orientation)) {
      return false
    }

    for (const chip of rangeChips) {
      const value =
        chip.facet === 'price'
          ? listing.price
          : chip.facet === 'year'
            ? listing.year
            : null
      if (value == null) return false
      if (chip.min != null && Number(value) < chip.min) return false
      if (chip.max != null && Number(value) > chip.max) return false
    }

    if (valueIds.length === 0) return true

    const owned = new Set(
      selections
        .filter((selection) => Number(selection.listingId) === Number(listing.id))
        .map((selection) => String(selection.facetValueOptionId)),
    )
    return valueIds.every((valueId) => owned.has(valueId))
  })

  // Newest first, with the id as a stable tie-breaker.
  return rows.sort((a, b) => {
    const aTime = a.createdAt ? Date.parse(a.createdAt) : 0
    const bTime = b.createdAt ? Date.parse(b.createdAt) : 0
    const timeDiff = (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0)
    if (timeDiff !== 0) return timeDiff
    return Number(b.id) - Number(a.id)
  })
}
