// Standalone search screen: title, autocomplete search box, direction chips,
// a category picker (the Browse modal) and an "All facets" modal on one row.
import { useEffect, useMemo, useState } from 'react'
import { ChevronDownIcon, LayersIcon, SearchIcon } from '../icons.jsx'
import FacetsModal from './FacetsModal.jsx'

export default function SearchView({
  listings,
  categories,
  selections = [],
  categoryId = '',
  onOpenBrowse,
}) {
  const [query, setQuery] = useState('')
  const [direction, setDirection] = useState(null) // 'buy' | 'sell' | null
  const [open, setOpen] = useState(false)
  const [facetAnswers, setFacetAnswers] = useState({}) // question id -> option id
  const [facetsOpen, setFacetsOpen] = useState(false)

  // A buy search shows listings on sale; a sell search shows wanted listings,
  // mirroring the interview screen's Search action.
  const wantedOrientation =
    direction === 'buy' ? 'sell' : direction === 'sell' ? 'buy' : null

  const categoryLabel =
    categories.find((category) => String(category.categoryId) === String(categoryId))?.title ??
    'All categories'

  // Facets belong to the selected category; with no category selected the modal
  // shows every category's interview questions.
  const facetSessions = useMemo(() => {
    const pool = categoryId
      ? categories.filter((category) => String(category.categoryId) === String(categoryId))
      : categories
    return pool.filter((session) => (session.questions ?? []).length > 0)
  }, [categories, categoryId])

  // A different category means a different question set: drop old answers.
  useEffect(() => {
    setFacetAnswers({})
  }, [categoryId])

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const activeOptions = Object.values(facetAnswers)
    return listings
      .filter((listing) => {
        if (categoryId && listing.categoryId !== categoryId) return false
        if (wantedOrientation && listing.orientation !== wantedOrientation) return false
        if (activeOptions.length > 0) {
          const owned = new Set(
            selections
              .filter((selection) => selection.listingId === Number(listing.id))
              .map((selection) => Number(selection.facetValueOptionId)),
          )
          if (!activeOptions.every((optionId) => owned.has(Number(optionId)))) return false
        }
        return listing.title.toLowerCase().includes(q)
      })
      .slice(0, 6)
  }, [categoryId, facetAnswers, listings, query, selections, wantedOrientation])

  function choose(listing) {
    setQuery(listing.title)
    setOpen(false)
  }

  function toggleDirection(value) {
    setDirection((prev) => (prev === value ? null : value))
  }

  function toggleFacet(questionId, optionId) {
    setFacetAnswers((prev) => {
      const next = { ...prev }
      if (next[questionId] === optionId) delete next[questionId]
      else next[questionId] = optionId
      return next
    })
  }

  const facetCount = Object.keys(facetAnswers).length

  return (
    <section className="search-page" aria-label="Search kiosk">
      <div className="search-block">
        <h2 className="search-title">Search kiosk</h2>

        <div className="search-box-wrap">
          <div className="search-box">
            <SearchIcon size={18} />
            <input
              type="text"
              className="search-input"
              placeholder="Search listings…"
              aria-label="Search listings"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={open && suggestions.length > 0}
              aria-controls="search-suggestions"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => setOpen(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && suggestions.length > 0) {
                  e.preventDefault()
                  choose(suggestions[0])
                }
                if (e.key === 'Escape') setOpen(false)
              }}
            />
          </div>

          {open && suggestions.length > 0 && (
            <ul className="search-suggestions" id="search-suggestions" role="listbox">
              {suggestions.map((listing) => (
                <li key={listing.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    // Keep focus in the input while picking with the mouse.
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(listing)}
                  >
                    <span className="search-suggestion-title">{listing.title}</span>
                    {listing.desc ? (
                      <span className="search-suggestion-desc">{listing.desc}</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="search-controls">
          <div className="action-chips" role="group" aria-label="Listing direction">
            <button
              type="button"
              className={direction === 'buy' ? 'chip selected' : 'chip'}
              aria-pressed={direction === 'buy'}
              onClick={() => toggleDirection('buy')}
            >
              Buy
            </button>
            <button
              type="button"
              className={direction === 'sell' ? 'chip selected' : 'chip'}
              aria-pressed={direction === 'sell'}
              onClick={() => toggleDirection('sell')}
            >
              Sell
            </button>
          </div>

          <button
            type="button"
            className="search-category"
            aria-haspopup="dialog"
            aria-label={`Category: ${categoryLabel}. Choose a category`}
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
            <span>Filter{facetCount > 0 ? ` (${facetCount})` : ''}</span>
          </button>
        </div>
      </div>

      {facetsOpen && (
        <FacetsModal
          sessions={facetSessions}
          answers={facetAnswers}
          onToggle={toggleFacet}
          onClose={() => setFacetsOpen(false)}
        />
      )}
    </section>
  )
}
