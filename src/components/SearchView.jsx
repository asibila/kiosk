// Standalone search screen: title, structured facet chip input, a category
// picker (the Browse modal) and a "Filter" modal on one row. Orientation, like
// every other interview question, is a facet in the filter.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { CheckIcon, ChevronDownIcon, LayersIcon } from '../icons.jsx'
import { pluralKey, useI18n } from '../i18n.jsx'
import { isRangeChip, isValueChip } from '../facetTypes.js'
import {
  buildOptionIndex,
  buildSearchParams,
  filterListings,
  parseSearchQuery,
  resolveChips,
} from '../searchQuery.js'
import FacetChipInput from './FacetChipInput.jsx'
import FacetsModal from './FacetsModal.jsx'
import SimpleModal from './SimpleModal.jsx'

export default function SearchView({
  listings,
  categories,
  selections = [],
  categoryId = '',
  currentUserId = null,
  regions = [],
  regionId = 0,
  onRegionChange,
  onOpenBrowse,
  onCommitText,
  onUnmatchedToken,
}) {
  const { language, t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  // The query the form was opened with (Edit search / bookmarked /search URL).
  // It only seeds state; chips then live in this view.
  const [initialQuery] = useState(() => parseSearchQuery(location.search))
  const [facetsOpen, setFacetsOpen] = useState(false)
  const [regionOpen, setRegionOpen] = useState(false)
  const [suggestionCount, setSuggestionCount] = useState(null)
  const previousCategoryRef = useRef(categoryId)

  const categoryLabel =
    categories.find((category) => String(category.categoryId) === String(categoryId))?.title ??
    t('search.allCategories')

  // "Search <region>" title and its picker. Id 0 is the global "All regions"
  // entry and always comes first; the rest follows the catalog order (by id).
  const allRegionsName =
    regions.find((region) => Number(region.id) === 0)?.name ?? t('region.all')
  const regionOptions = useMemo(
    () => [
      { id: 0, name: allRegionsName },
      ...regions
        .filter((region) => Number(region.id) !== 0)
        .map((region) => ({ id: Number(region.id), name: region.name })),
    ],
    [allRegionsName, regions],
  )
  const currentRegion = regions.find(
    (region) => Number(region.id) === Number(regionId),
  )
  const regionTitle =
    Number(regionId) === 0 || !currentRegion
      ? t('search.allRegionsTitle')
      : t('search.regionTitle', { region: currentRegion.name })

  const rangeFacets = useMemo(
    () => [
      { facet: 'price', label: t('facet.price'), unit: '€' },
      { facet: 'year', label: t('facet.year') },
    ],
    [t],
  )

  // Which question/option each suggestion belongs to, used by the Filter modal.
  const optionIndex = useMemo(() => buildOptionIndex(categories), [categories])

  // Seed committed chips from the URL (Edit search / bookmark). Labels are
  // resolved from the catalog, so the URL only has to carry ids. The legacy
  // `direction` (the searcher's intent) is converted to the equivalent listing
  // orientation chip so old links keep filtering the same rows.
  const [chips, setChips] = useState(() => {
    const initial = resolveChips(
      initialQuery.chips,
      optionIndex,
      Object.fromEntries(rangeFacets.map((facet) => [facet.facet, facet.label])),
    )
    if (initialQuery.direction) {
      const valueId = initialQuery.direction === 'buy' ? 'sell' : 'buy'
      const alreadySet = initial.some(
        (chip) => isValueChip(chip) && chip.facet === 'orientation',
      )
      const match = optionIndex.get(valueId)
      if (!alreadySet && match) {
        initial.unshift({
          kind: 'value',
          facet: 'orientation',
          facetLabel: match.question.text,
          valueId,
          label: match.option.text,
        })
      }
    }
    return initial
  })

  // Facets from the selected category's ancestors apply to it. The generic
  // ALL PRODUCTS section always exists, and it always carries the same first
  // questions as the interview: orientation and condition (plus any other
  // generic option facets), followed by the price and year ranges.
  const facetGroups = useMemo(() => {
    const allGroup = {
      key: 'all',
      title: t('facets.all'),
      questions: [],
      ranges: rangeFacets,
    }

    const genericQuestions = []
    const seen = new Set()
    for (const session of categories) {
      for (const question of session.questions ?? []) {
        if (
          !question.isGeneric ||
          question.type === 'numeric' ||
          seen.has(question.id)
        ) {
          continue
        }
        seen.add(question.id)
        genericQuestions.push(question)
      }
    }

    const groups = [{ ...allGroup, questions: genericQuestions }]
    if (!categoryId) return groups

    const byCategoryId = new Map(
      categories.map((session) => [String(session.categoryId), session]),
    )
    const chain = []
    let current = byCategoryId.get(String(categoryId))
    while (current && !chain.includes(current)) {
      chain.unshift(current)
      current =
        current.parentCategoryId != null
          ? byCategoryId.get(String(current.parentCategoryId))
          : undefined
    }

    for (const ancestor of chain) {
      const questions = (ancestor.questions ?? []).filter(
        (question) =>
          question.type !== 'numeric' &&
          !question.isGeneric &&
          String(question.categoryId) === String(ancestor.categoryId),
      )
      if (questions.length === 0) continue
      groups.push({
        key: `category-${ancestor.categoryId}`,
        title: ancestor.title,
        questions,
      })
    }
    return groups
  }, [categories, categoryId, rangeFacets, t])

  // The Filter modal is a second view over the same chips: only value chips
  // appear there, mapped back to their question/option ids.
  const facetAnswers = useMemo(() => {
    const answers = {}
    for (const chip of chips) {
      if (!isValueChip(chip)) continue
      const match = optionIndex.get(chip.valueId)
      if (match) answers[match.question.id] = chip.valueId
    }
    return answers
  }, [chips, optionIndex])

  // A different category means a different facet set: drop incompatible chips.
  // The first render is skipped so chips hydrated from the URL survive.
  useEffect(() => {
    if (previousCategoryRef.current === categoryId) return
    previousCategoryRef.current = categoryId
    setChips([])
  }, [categoryId])

  // Chips carry display labels, so refresh them when the language (or the
  // localized facet data) changes. The structured ids stay untouched.
  useEffect(() => {
    setChips((previous) => {
      let changed = false
      const next = previous.map((chip) => {
        if (isValueChip(chip)) {
          const match = optionIndex.get(chip.valueId)
          if (!match) return chip
          const facet = match.question.facet ?? match.question.id
          if (
            chip.facet === facet &&
            chip.facetLabel === match.question.text &&
            chip.label === match.option.text
          ) {
            return chip
          }
          changed = true
          return {
            ...chip,
            facet,
            facetLabel: match.question.text,
            label: match.option.text,
          }
        }
        const range = rangeFacets.find((facet) => facet.facet === chip.facet)
        if (!range || range.label === chip.facetLabel) return chip
        changed = true
        return { ...chip, facetLabel: range.label }
      })
      return changed ? next : previous
    })
  }, [optionIndex, rangeFacets])

  // Mirror the form into /search's URL with replace, so the address bar is a
  // bookmarkable query and Back from /results restores the same form state.
  useEffect(() => {
    const params = buildSearchParams({ categoryId, chips })
    const next = params.toString()
    const current = location.search.replace(/^\?/, '')
    if (next === current) return
    navigate({ pathname: '/search', search: next ? `?${next}` : '' }, { replace: true })
  }, [categoryId, chips, location.search, navigate])

  // The explicit submit: a GET-style /results URL that can be bookmarked,
  // shared or reloaded. The form URL stays in history as the entry before it.
  function submitSearch() {
    const params = buildSearchParams({ categoryId, chips, regionId })
    const search = params.toString()
    navigate({ pathname: '/results', search: search ? `?${search}` : '' })
  }

  function toggleFacet(questionId, optionId) {
    const match = optionIndex.get(String(optionId))
    if (!match) return

    setChips((previous) => {
      const selected = previous.some(
        (chip) => isValueChip(chip) && chip.valueId === String(optionId),
      )
      if (selected) {
        return previous.filter(
          (chip) => !(isValueChip(chip) && chip.valueId === String(optionId)),
        )
      }
      const facet = match.question.facet ?? match.question.id
      return [
        ...previous.filter((chip) => !(isValueChip(chip) && chip.facet === facet)),
        {
          kind: 'value',
          facet,
          facetLabel: match.question.text,
          valueId: String(match.option.id),
          label: match.option.text,
        },
      ]
    })
  }

  function setRange(facet, nextChip) {
    setChips((previous) => [
      ...previous.filter((chip) => !(isRangeChip(chip) && chip.facet === facet)),
      ...(nextChip ? [nextChip] : []),
    ])
  }

  // Live count for the current structured query. It uses the same filter as
  // /results, so the number here and the results page agree. A region alone
  // also counts as a query.
  const hasQuery = chips.length > 0 || !!categoryId || Number(regionId) > 0
  const resultCount = useMemo(
    () =>
      hasQuery
        ? filterListings({
            listings,
            selections,
            categories,
            categoryId,
            regionId,
            chips,
          }).filter(
            (listing) =>
              listing.isActive !== false ||
              (currentUserId != null &&
                Number(listing.userId) === Number(currentUserId)),
          ).length
        : null,
    [
      categories,
      categoryId,
      chips,
      currentUserId,
      hasQuery,
      listings,
      regionId,
      selections,
    ],
  )

  const facetCount = chips.length
  const liveCount =
    suggestionCount == null
      ? ''
      : t(pluralKey(suggestionCount, 'facet.resultCount'), { count: suggestionCount })

  return (
    <section className="search-page" aria-label={t('search.aria')}>
      <div className="search-block">
        <h2 className="search-title">
          <button
            type="button"
            className="search-region"
            aria-haspopup="dialog"
            title={t('region.choose')}
            onClick={() => setRegionOpen(true)}
          >
            <span>{regionTitle}</span>
            <ChevronDownIcon size={22} />
          </button>
        </h2>

        <FacetChipInput
          key={categoryId || 'all'}
          chips={chips}
          onChange={setChips}
          lang={language}
          categoryId={categoryId}
          onCommitText={onCommitText}
          onUnmatchedToken={onUnmatchedToken}
          onResultsCount={setSuggestionCount}
          onSubmit={submitSearch}
        />

        <div className="search-controls">
          <button
            type="button"
            className="search-category"
            aria-haspopup="dialog"
            aria-label={t('search.categoryAria', { category: categoryLabel })}
            onClick={onOpenBrowse}
          >
            <span>{categoryLabel}</span>
            <ChevronDownIcon size={14} />
          </button>

          <button
            type="button"
            className="search-category filter-btn"
            aria-haspopup="dialog"
            onClick={() => setFacetsOpen(true)}
          >
            <LayersIcon size={14} />
            <span>
              {t('search.filter')}
              {facetCount > 0 ? ` (${facetCount})` : ''}
            </span>
          </button>
        </div>

        {resultCount != null && (
          <div className="search-result-count">
            <span>{t(pluralKey(resultCount, 'search.resultCount'), { count: resultCount })}</span>
          </div>
        )}

        <span className="sr-only" aria-live="polite">
          {liveCount}
        </span>
      </div>

      {facetsOpen && (
        <FacetsModal
          groups={facetGroups}
          answers={facetAnswers}
          rangeChips={chips.filter(isRangeChip)}
          onToggle={toggleFacet}
          onRangeChange={setRange}
          onClose={() => setFacetsOpen(false)}
        />
      )}

      {regionOpen && (
        <SimpleModal
          title={t('region.choose')}
          onClose={() => setRegionOpen(false)}
          body={
            <ul className="region-list">
              {regionOptions.map((region) => {
                const selected = Number(region.id) === Number(regionId)
                return (
                  <li key={region.id}>
                    <button
                      type="button"
                      className={selected ? 'region-option selected' : 'region-option'}
                      aria-pressed={selected}
                      onClick={() => {
                        onRegionChange?.(region.id)
                        setRegionOpen(false)
                      }}
                    >
                      <span className="region-option-name">{region.name}</span>
                      {selected && <CheckIcon size={16} />}
                    </button>
                  </li>
                )
              })}
            </ul>
          }
        />
      )}
    </section>
  )
}
