// /listing/:id: a bookmarkable listing detail page. It reads from the same
// already-loaded catalog data as the results page; a full reload of the URL
// loads the data and resolves the id again.
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { fetchListingStats, mediaUrl, trackListingView } from '../api.js'
import { localeFor } from '../facetTypes.js'
import { pluralKey, useI18n } from '../i18n.jsx'
import { ChevronLeftIcon, EnvelopeIcon, ThumbGlyph } from '../icons.jsx'
import { buildOptionIndex } from '../searchQuery.js'
import CompletenessScore from './CompletenessScore.jsx'

export default function ListingPage({
  listing = null,
  categories = [],
  selections = [],
  images = [],
  users = [],
  currentUserId = null,
  isLoggedIn = false,
  onContact = null,
  contactingId = null,
}) {
  const { language, t } = useI18n()
  const location = useLocation()
  const [selectedImageId, setSelectedImageId] = useState(null)

  const gallery = useMemo(() => {
    if (!listing) return []
    return images
      .filter((image) => Number(image.listingId) === Number(listing.id))
      .slice()
      .sort(
        (a, b) =>
          Number(b.primaryImage) - Number(a.primaryImage) || Number(a.id) - Number(b.id),
      )
  }, [images, listing])

  const optionIndex = useMemo(() => buildOptionIndex(categories), [categories])

  const facets = useMemo(() => {
    if (!listing) return []
    const rows = []
    for (const selection of selections) {
      if (Number(selection.listingId) !== Number(listing.id)) continue
      const match = optionIndex.get(String(selection.facetValueOptionId))
      if (!match) continue
      rows.push({
        key: String(selection.facetValueOptionId),
        label: match.question.text,
        value: match.option.text,
        priority: match.question.priority ?? 0,
      })
    }

    if (listing.price != null) {
      rows.push({
        key: 'price',
        label: t('facet.price'),
        value: `${listing.price} €`,
        priority: 1000,
      })
    }
    if (listing.year != null) {
      rows.push({
        key: 'year',
        label: t('facet.year'),
        value: String(listing.year),
        priority: 1001,
      })
    }

    return rows.sort((a, b) => a.priority - b.priority)
  }, [listing, optionIndex, selections, t])

  // A results page passes its exact URL so "back" restores the query; a direct
  // bookmark falls back to the search form.
  const from = location.state?.from
  const backTo =
    typeof from === 'string' && from.startsWith('/results') ? from : '/search'
  const backLabel =
    backTo === '/search' ? t('listing.back') : t('listing.backResults')

  const owned =
    listing != null &&
    isLoggedIn &&
    currentUserId != null &&
    Number(listing.userId) === Number(currentUserId)

  // Views are counted once per listing; the API dedupes per visitor and day and
  // ignores the owner. Effects never run during the server render, so the SSR
  // markup stays identical for everyone.
  const fromResults = typeof from === 'string' && from.startsWith('/results')
  useEffect(() => {
    if (!listing || owned) return
    trackListingView(listing.id, {
      source: fromResults ? 'search' : 'direct',
      language,
    })
  }, [listing?.id, owned, language, fromResults])

  // Owners see this listing's views and contacts; guests never fetch them.
  const [stats, setStats] = useState(null)
  useEffect(() => {
    if (!listing || !owned) {
      setStats(null)
      return undefined
    }

    let cancelled = false
    fetchListingStats(listing.id)
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })

    return () => {
      cancelled = true
    }
  }, [listing?.id, owned])

  // Drafts are private: only their owner can open the bookmarkable page.
  if (!listing || (listing.isActive === false && !owned)) {
    return (
      <section className="listing-page" aria-label={t('listing.aria')}>
        <div className="listing-inner">
          <div className="results-empty">
            <p>{t('listing.notFound')}</p>
            <Link className="btn primary" to="/search">
              {t('listing.back')}
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const category = categories.find(
    (row) => String(row.categoryId) === String(listing.categoryId),
  )
  const seller = users.find((row) => Number(row.id) === Number(listing.userId))
  const orientation =
    listing.orientation === 'buy' ? t('direction.buy') : t('direction.sell')

  const selectedImage =
    gallery.find((image) => image.id === selectedImageId) ?? gallery[0] ?? null
  const listed =
    listing.createdAt && !Number.isNaN(Date.parse(listing.createdAt))
      ? new Intl.DateTimeFormat(localeFor(language), { dateStyle: 'medium' }).format(
          new Date(listing.createdAt),
        )
      : null

  return (
    <section className="listing-page" aria-label={t('listing.aria')}>
      <div className="listing-inner">
        <Link className="results-back" to={backTo}>
          <ChevronLeftIcon size={14} />
          {backLabel}
        </Link>

        <div className="listing-layout">
          <div className="listing-media">
            {selectedImage ? (
              <img
                className="listing-hero"
                src={mediaUrl(selectedImage.url)}
                alt={listing.title}
              />
            ) : (
              <div className="listing-hero listing-hero-empty">
                <ThumbGlyph kind={listing.thumb || 'tag'} size={64} />
                <span>{t('listing.noImages')}</span>
              </div>
            )}

            {gallery.length > 1 && (
              <div className="listing-thumbs">
                {gallery.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    className={
                      selectedImage?.id === image.id
                        ? 'listing-thumb selected'
                        : 'listing-thumb'
                    }
                    aria-label={t('listing.photo', { number: index + 1 })}
                    aria-pressed={selectedImage?.id === image.id}
                    onClick={() => setSelectedImageId(image.id)}
                  >
                    <img src={mediaUrl(image.url)} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="listing-info">
            <div className="listing-badges">
              <span className="chip selected">{orientation}</span>
              {category && <span className="chip">{category.title}</span>}
              {listing.isActive === false && (
                <span className="listing-status">{t('listing.draft')}</span>
              )}
            </div>

            <div className="listing-title-row">
              <h1
                className={
                  listing.isActive === false ? 'listing-title inactive' : 'listing-title'
                }
              >
                {listing.title}
              </h1>
              <CompletenessScore
                answered={listing.facetsCount}
                total={listing.facetsCountMax}
              />
            </div>
            <p className="listing-desc">{listing.desc}</p>

            {owned && stats && (
              <p className="listing-owner-stats" aria-label={t('listing.statsAria')}>
                {t(pluralKey(stats.totals.views, 'listing.views'), {
                  count: stats.totals.views,
                })}
                {' · '}
                {t(pluralKey(stats.totals.contacts, 'listing.contacts'), {
                  count: stats.totals.contacts,
                })}
              </p>
            )}

            <div className="listing-actions">
              {owned ? (
                <p className="listing-own">{t('listing.yourNote')}</p>
              ) : !isLoggedIn ? (
                <Link
                  className="btn primary"
                  to="/login"
                  state={{ from: `${location.pathname}${location.search}` }}
                >
                  {t('listing.signInToContact')}
                </Link>
              ) : onContact ? (
                <button
                  type="button"
                  className="btn primary"
                  disabled={contactingId === listing.id}
                  onClick={() => onContact(listing)}
                >
                  <EnvelopeIcon size={16} />
                  {contactingId === listing.id
                    ? t('listing.contacting')
                    : t('listing.contact')}
                </button>
              ) : null}
            </div>

            <dl className="listing-facts">
              {category && (
                <div>
                  <dt>{t('listing.category')}</dt>
                  <dd>{category.title}</dd>
                </div>
              )}
              <div>
                <dt>{t('listing.direction')}</dt>
                <dd>{orientation}</dd>
              </div>
              {seller && (
                <div>
                  <dt>{t('listing.seller')}</dt>
                  <dd>{owned ? t('listing.you') : seller.name}</dd>
                </div>
              )}
              {listed && (
                <div>
                  <dt>{t('listing.listed')}</dt>
                  <dd>{listed}</dd>
                </div>
              )}
            </dl>

            {facets.length > 0 && (
              <section className="listing-section" aria-label={t('listing.details')}>
                <h2>{t('listing.details')}</h2>
                <dl className="listing-facets">
                  {facets.map((facet) => (
                    <div key={facet.key}>
                      <dt>{facet.label}</dt>
                      <dd>{facet.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
