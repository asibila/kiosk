// Shared shapes for the facet chip search input. The frontend is JavaScript, so
// these are JSDoc typedefs (checked by editors) rather than TypeScript types.
//
// Everything committed by the component is structured: either one facet value
// (`valueId`) or a numeric range. No free text is stored on an ad.

/**
 * @typedef {object} ValueChip
 * @property {'value'} kind
 * @property {string} facet          Facet schema name, e.g. "fuel".
 * @property {string} facetLabel     Human label for the facet.
 * @property {string} valueId        Facet value option id (string form).
 * @property {string} label          Human label for the value.
 */

/**
 * @typedef {object} RangeChip
 * @property {'range'} kind
 * @property {string} facet
 * @property {string} facetLabel
 * @property {number|null} min
 * @property {number|null} max
 * @property {string} [unit]
 */

/** @typedef {ValueChip | RangeChip} Chip */

/**
 * @typedef {object} Suggestion
 * @property {string} facet
 * @property {string} facetLabel
 * @property {string} valueId
 * @property {string} label
 * @property {number} count
 */

/**
 * @typedef {object} SuggestResponse
 * @property {Suggestion[]} suggestions
 */

/** @param {Chip} chip @returns {chip is ValueChip} */
export const isValueChip = (chip) => chip.kind === 'value'

/** @param {Chip} chip @returns {chip is RangeChip} */
export const isRangeChip = (chip) => chip.kind === 'range'

/** A stable key for dedupe and React lists. */
export function chipKey(chip) {
  return chip.kind === 'value'
    ? `value:${chip.valueId}`
    : `range:${chip.facet}:${chip.min ?? ''}:${chip.max ?? ''}`
}

/** Locale used for number grouping and sorting. */
export function localeFor(lang) {
  return lang === 'hr' ? 'hr-HR' : 'en-US'
}

/** Format a range chip body, without the facet label prefix. */
export function formatRange(chip, lang, t) {
  const formatter = new Intl.NumberFormat(localeFor(lang))
  const min = chip.min == null ? null : formatter.format(chip.min)
  const max = chip.max == null ? null : formatter.format(chip.max)
  const unit = chip.unit ? ` ${chip.unit}` : ''

  if (min != null && max != null) return `${min}–${max}${unit}`
  if (min != null) return t('facet.rangeFrom', { value: `${min}${unit}` })
  if (max != null) return t('facet.rangeUpTo', { value: `${max}${unit}` })
  return t('facet.rangeAny')
}
