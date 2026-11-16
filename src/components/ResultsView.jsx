// /results: bookmarkable, GET-style search results. The query lives in the URL
// (category, direction, value/range chips); labels are resolved from the
// catalog on each render so shared links work in either language.
import { useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { mediaUrl } from '../api.js'
import { formatRange } from '../facetTypes.js'
import { pluralKey, useI18n } from '../i18n.jsx'
import { EnvelopeIcon, SearchIcon, ThumbGlyph, XIcon } from '../icons.jsx'
import CompletenessScore from './CompletenessScore.jsx'
import {
  buildOptionIndex,
  filterListings,
  parseSearchQuery,
  resolveChips,
} from '../searchQuery.js'

function chipKey(chip) {
  return chip.kind === 'value'
    ? `value:${chip.valueId}`
    : `range:${chip.facet}:${chip.min ?? ''}:${chip.max ?? ''}`
}

export default function ResultsView({
  listings = [],
  categories = [],
  selections = [],
  currentUserId = null,
  onContact = null,
  contactingId = null,
}) {
  const { language, t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()

  const query = useMemo(() => parseSearchQuery(location.search), [location.search])
  const optionIndex = useMemo(() => buildOptionIndex(categories), [categories])
  const rangeFacets = useMemo(
    () => [
      { facet: 'price', label: t('facet.price') },
      { facet: 'year', label: t('facet.year') },
    ],
    [t],
  )

  // Resolve URL ids to catalog labels; a removed option simply drops out.
  const chips = useMemo(
    () =>
      resolveChips(
        query.chips,
        optionIndex,
        Object.fromEntries(rangeFacets.map((facet) => [facet.facet, facet.label])),
      ),
    [optionIndex, query.chips, rangeFacets],
  )

  const category = categories.find(
    (row) => String(row.categoryId) === String(query.categoryId),
  )
  const categoryId = category ? query.categoryId : ''

  const results = useMemo(
    () =>
      filterListings({
        listings,
        selections,
        categories,
        categoryId,
        direction: query.direction,
        chips,
      }).filter(
        (listing) =>
          listing.isActive !== false ||
          (currentUserId != null &&
            Number(listing.userId) === Number(currentUserId)),
      ),
    [
      categories,
      categoryId,
      chips,
      currentUserId,
      listings,
      query.direction,
      selections,
    ],
  )

  const directionLabel =
    query.direction === 'buy'
      ? t('direction.buyAction')
      : query.direction === 'sell'
        ? t('direction.sellAction')
        : null

  function chipLabel(chip) {
    if (chip.kind === 'value') return `${chip.facetLabel}: ${chip.label}`
    return `${chip.facetLabel}: ${formatRange(chip, language, t)}`
  }

  function removeChip(chip) {
    const nextChips = chips.filter((c) => chipKey(c) !== chipKey(chip))
    const params = new URLSearchParams(location.search)
    params.delete('facet')
    params.delete('range')
    for (const c of nextChips) {
      if (c.kind === 'value') {
        params.append('facet', `${c.facet}:${c.valueId}`)
      } else {
        params.append(
          'range',
          `${c.facet}:${c.min ?? ''}-${c.max ?? ''}`,
        )
      }
    }
    navigate({ pathname: '/results', search: params.toString() ? `?${params.toString()}` : '' }, { replace: true })
  }

  return (
    <section className="results-page" aria-label={t('results.aria')}>
      <div className="results-inner">
        <header className="results-head">
          <div className="results-heading">
            <Link
              className="results-back"
              to={{ pathname: '/search', search: location.search }}
            >
              {t('results.edit')}
            </Link>
            <h1 className="results-title">{t('results.title')}</h1>
          </div>
          <p className="results-count">
            {t(pluralKey(results.length, 'search.resultCount'), { count: results.length })}
          </p>
        </header>

        <div className="results-summary" aria-label={t('results.filters')}>
          <span className="chip">{category?.title ?? t('search.allCategories')}</span>
          {directionLabel && <span className="chip selected">{directionLabel}</span>}
          {chips.map((chip) => (
            <button
              type="button"
              className="chip"
              key={chipKey(chip)}
              title={t('results.removeFilter', { label: chipLabel(chip) })}
              onClick={() => removeChip(chip)}
            >
              {chipLabel(chip)}
              <XIcon size={12} style={{ marginLeft: 4 }} />
            </button>
          ))}
        </div>

        {results.length === 0 ? (
          <div className="results-empty">
            <span className="placeholder-icon">
              <SearchIcon size={36} />
            </span>
            <p>{t('listings.empty')}</p>
            <Link className="btn primary" to={{ pathname: '/search', search: location.search }}>
              {t('results.edit')}
            </Link>
          </div>
        ) : (
          <ul className="results-grid">
            {results.map((listing) => {
              const owned =
                currentUserId != null &&
                Number(listing.userId) === Number(currentUserId)
              const listingCategory =
                categories.find(
                  (row) => String(row.categoryId) === String(listing.categoryId),
                )?.title ?? ''

              return (
                <li
                  key={listing.id}
                  className={
                    listing.isActive === false
                      ? 'result-card inactive'
                      : 'result-card'
                  }
                >
                  <Link
                    className="result-card-link"
                    to={`/listing/${listing.id}`}
                    state={{ from: `${location.pathname}${location.search}` }}
                    aria-label={t('results.open', { title: listing.title })}
                  >
                    <span className="sr-only">{listing.title}</span>
                  </Link>

                  <div className="result-thumb">
                    {listing.imageUrl ? (
                      <img
                        src={mediaUrl(listing.imageUrl)}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <ThumbGlyph kind={listing.thumb || 'tag'} size={42} />
                    )}
                    <span
                      className={
                        listing.orientation === 'buy'
                          ? 'result-badge wanted'
                          : 'result-badge sale'
                      }
                    >
                      {t(
                        listing.orientation === 'buy'
                          ? 'direction.buy'
                          : 'direction.sell',
                      )}
                    </span>
                  </div>

                  <div className="result-body">
                    <div className="result-title-row">
                      <h2 className="result-title">{listing.title}</h2>
                      <CompletenessScore
                        answered={listing.facetsCount}
                        total={listing.facetsCountMax}
                      />
                    </div>
                    {listing.isActive === false && (
                      <span className="listing-status">{t('listing.draft')}</span>
                    )}
                    <p className="result-desc">{listing.desc}</p>
                    <div className="result-meta">
                      <span className="result-category">{listingCategory}</span>
                      {onContact ? (
                        <button
                          type="button"
                          className="icon-btn listing-contact"
                          aria-label={
                            owned
                              ? t('listings.your', { title: listing.title })
                              : t('listings.start', { title: listing.title })
                          }
                          title={
                            owned ? t('listings.yourTitle') : t('listings.startTitle')
                          }
                          disabled={owned || contactingId === listing.id}
                          onClick={() => onContact(listing)}
                        >
                          <EnvelopeIcon />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
