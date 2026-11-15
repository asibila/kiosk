// Standalone search screen: title, structured facet chip input, direction
// chips, a category picker (the Browse modal) and a "Filter" modal on one row.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { ChevronDownIcon, LayersIcon } from '../icons.jsx'
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

export default function SearchView({
  listings,
  categories,
  selections = [],
  categoryId = '',
  onOpenBrowse,
  onCommitText,
  onUnmatchedToken,
}) {
  const { language, t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  // The query the form was opened with (Edit search / bookmarked /search URL).
  // It only seeds state; chips and direction then live in this view.
  const [initialQuery] = useState(() => parseSearchQuery(location.search))
  const [direction, setDirection] = useState(initialQuery.direction) // 'buy' | 'sell' | null
  const [facetsOpen, setFacetsOpen] = useState(false)
  const [suggestionCount, setSuggestionCount] = useState(null)
  const previousCategoryRef = useRef(categoryId)

  // A buy search shows listings on sale; a sell search shows wanted listings,
  // mirroring the interview screen's Search action.
  const wantedOrientation =
    direction === 'buy' ? 'sell' : direction === 'sell' ? 'buy' : null

  const categoryLabel =
    categories.find((category) => String(category.categoryId) === String(categoryId))?.title ??
    t('search.allCategories')

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
  // resolved from the catalog, so the URL only has to carry ids.
  const [chips, setChips] = useState(() =>
    resolveChips(
      initialQuery.chips,
      optionIndex,
      Object.fromEntries(rangeFacets.map((facet) => [facet.facet, facet.label])),
    ),
  )

  // Facets from the selected category's ancestors apply to it. The generic
  // ALL section always exists; with no category selected it only has the
  // generic range facets (price + year).
  const facetGroups = useMemo(() => {
    const allGroup = {
      key: 'all',
      title: t('facets.all'),
      questions: [],
      ranges: rangeFacets,
    }
    if (!categoryId) return [allGroup]

    const genericQuestions = []
    const seen = new Set()
    for (const session of categories) {
      for (const question of session.questions ?? []) {
        if (!question.isGeneric || seen.has(question.id)) continue
        seen.add(question.id)
        genericQuestions.push(question)
      }
    }

    const byCategoryId = new Map(
      categories.map((session) => [String(session.categoryId), session]),
    )
    const chain = []
    let current = byCategoryId.get(String(categoryId))
    while (current) {
      chain.unshift(current)
      current =
        current.parentCategoryId != null
          ? byCategoryId.get(String(current.parentCategoryId))
          : undefined
    }

    const groups = [{ ...allGroup, questions: genericQuestions }]
    for (const ancestor of chain) {
      const questions = (ancestor.questions ?? []).filter(
        (question) =>
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
    const params = buildSearchParams({ categoryId, direction, chips })
    const next = params.toString()
    const current = location.search.replace(/^\?/, '')
    if (next === current) return
    navigate({ pathname: '/search', search: next ? `?${next}` : '' }, { replace: true })
  }, [categoryId, direction, chips, location.search, navigate])

  function toggleDirection(value) {
    setDirection((prev) => (prev === value ? null : value))
  }

  // The explicit submit: a GET-style /results URL that can be bookmarked,
  // shared or reloaded. The form URL stays in history as the entry before it.
  function submitSearch() {
    const params = buildSearchParams({ categoryId, direction, chips })
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
  // /results, so the number here and the results page agree.
  const hasQuery = chips.length > 0 || !!categoryId || !!direction
  const resultCount = useMemo(
    () =>
      hasQuery
        ? filterListings({
            listings,
            selections,
            categories,
            categoryId,
            direction,
            chips,
          }).length
        : null,
    [categories, categoryId, chips, direction, hasQuery, listings, selections],
  )

  const facetCount = chips.length
  const liveCount =
    suggestionCount == null
      ? ''
      : t(pluralKey(suggestionCount, 'facet.resultCount'), { count: suggestionCount })

  return (
    <section className="search-page" aria-label={t('search.aria')}>
      <div className="search-block">
        <h2 className="search-title">{t('search.title')}</h2>

        <FacetChipInput
          key={categoryId || 'all'}
          chips={chips}
          onChange={setChips}
          lang={language}
          categoryId={categoryId}
          orientation={wantedOrientation}
          onCommitText={onCommitText}
          onUnmatchedToken={onUnmatchedToken}
          onResultsCount={setSuggestionCount}
        />

        <div className="search-controls">
          <div className="action-chips" role="group" aria-label={t('interview.directionAria')}>
            <button
              type="button"
              className={direction === 'buy' ? 'chip selected' : 'chip'}
              aria-pressed={direction === 'buy'}
              onClick={() => toggleDirection('buy')}
            >
              {t('direction.buyAction')}
            </button>
            <button
              type="button"
              className={direction === 'sell' ? 'chip selected' : 'chip'}
              aria-pressed={direction === 'sell'}
              onClick={() => toggleDirection('sell')}
            >
              {t('direction.sellAction')}
            </button>
          </div>

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
            className="search-category"
            aria-haspopup="dialog"
            onClick={() => setFacetsOpen(true)}
          >
            <LayersIcon size={14} />
            <span>
              {t('search.filter')}
              {facetCount > 0 ? ` (${facetCount})` : ''}
            </span>
          </button>

          <button type="button" className="btn primary search-submit" onClick={submitSearch}>
            {t('search.submit')}
          </button>
        </div>

        {resultCount != null && (
          <p className="search-result-summary">
            {t(pluralKey(resultCount, 'search.resultCount'), { count: resultCount })}
          </p>
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
    </section>
  )
}
