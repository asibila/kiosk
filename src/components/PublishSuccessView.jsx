// Post-publish screen (shown on /app after Publish): the listing that was just
// published, seller statistics derived from existing data, and the next steps
// that make the ad more attractive.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { fetchListingStats, mediaUrl } from '../api.js'
import { localeFor } from '../facetTypes.js'
import { CheckIcon, ThumbGlyph } from '../icons.jsx'
import { pluralKey, useI18n } from '../i18n.jsx'
import CompletenessScore from './CompletenessScore.jsx'

/** `1234.5` → `1.234,50 €` in the active locale. */
function formatPrice(value, language) {
  const number = Number(value)
  if (!Number.isFinite(number)) return ''
  const text = new Intl.NumberFormat(localeFor(language), {
    maximumFractionDigits: 2,
  }).format(number)
  return `${text} €`
}

/**
 * One bar per day, scaled to the busiest day of the series. Purely decorative:
 * the panel note carries the numbers for assistive technology.
 */
function DayBars({ days, max }) {
  return (
    <div className="chart-bars" aria-hidden="true">
      {days.map((day) => (
        <span
          key={day.key}
          className={day.count > 0 ? 'chart-bar' : 'chart-bar empty'}
          style={{
            height: `${Math.max(4, Math.round((day.count / Math.max(1, max)) * 100))}%`,
          }}
        />
      ))}
    </div>
  )
}

export default function PublishSuccessView({
  listing,
  categoryTitle = '',
  imageUrl = null,
  stats = null,
  priceStats = null,
  checklist = [],
  onPublishAnother,
  onImproveQuestions,
  onEditListing,
}) {
  const { language, t } = useI18n()

  // Views come from the API (they are not in the catalog snapshot); the owner is
  // signed in on this screen, so the request carries the session.
  const [views, setViews] = useState(null)
  useEffect(() => {
    const listingId = listing?.listingId
    setViews(null)
    if (!listingId) return undefined

    let cancelled = false
    fetchListingStats(listingId)
      .then((data) => {
        if (!cancelled) setViews(data)
      })
      .catch(() => {
        if (!cancelled) setViews(null)
      })

    return () => {
      cancelled = true
    }
  }, [listing?.listingId])

  function checkLabel(item) {
    if (item.id === 'photos') {
      return t(item.done ? 'publish.check.photosDone' : 'publish.check.photos')
    }
    if (item.id === 'titles') {
      return t(item.done ? 'publish.check.titlesDone' : 'publish.check.titles')
    }
    if (item.id === 'questions') {
      return item.done
        ? t('publish.check.questionsDone')
        : t(pluralKey(item.count, 'publish.check.questions'), { count: item.count })
    }
    return ''
  }

  const activity = stats?.activity
  const priceMeta = priceStats
    ? [
        t('stats.priceMedian', { price: formatPrice(priceStats.median, language) }),
        t(pluralKey(priceStats.count, 'stats.priceCount'), { count: priceStats.count }),
      ].join(' · ')
    : ''

  return (
    <section className="publish-page" aria-label={t('publish.aria')}>
      <div className="publish-inner">
        <header className="publish-hero">
          <span className="publish-hero-icon" aria-hidden="true">
            <CheckIcon size={24} />
          </span>
          <div>
            <h2>{t('publish.title')}</h2>
            <p>{t('publish.subtitle')}</p>
          </div>
        </header>

        <article className="publish-card">
          <div className="publish-thumb">
            {imageUrl ? (
              <img src={mediaUrl(imageUrl)} alt="" />
            ) : (
              <ThumbGlyph kind="box" size={40} />
            )}
          </div>
          <div className="publish-card-main">
            <div className="result-title-row">
              <h3 className="publish-card-title">{listing.title}</h3>
              <CompletenessScore
                answered={listing.facetsCount}
                total={listing.facetsCountMax}
              />
            </div>
            <p className="publish-card-meta">
              {[
                categoryTitle,
                listing.price != null ? formatPrice(listing.price, language) : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          <div className="publish-card-actions">
            <Link className="btn primary" to={`/listing/${listing.listingId}`}>
              {t('publish.viewListing')}
            </Link>
            <button type="button" className="btn secondary" onClick={onPublishAnother}>
              {t('publish.publishAnother')}
            </button>
          </div>
        </article>

        {stats && (
          <section className="publish-stats" aria-label={t('stats.aria')}>
            {views && (
              <div
                className="stat-tile"
                title={t('stats.viewsWindow', { days: views.days.length })}
              >
                <span className="stat-value">{views.totals.viewsInWindow}</span>
                <span className="stat-label">{t('stats.viewsShort')}</span>
              </div>
            )}
            <div className="stat-tile">
              <span className="stat-value">{stats.active}</span>
              <span className="stat-label">{t('stats.activeAds')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{stats.contacts}</span>
              <span className="stat-label">{t('stats.contacts')}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{stats.unread}</span>
              <span className="stat-label">{t('stats.unread')}</span>
            </div>
          </section>
        )}

        <div className="publish-panels">
          {views && (
            <section className="publish-panel">
              <h3>{t('stats.viewsWindow', { days: views.days.length })}</h3>
              {views.totals.viewsInWindow > 0 ? (
                <>
                  <DayBars
                    days={views.days.map((day) => ({ key: day.date, count: day.views }))}
                    max={Math.max(1, ...views.days.map((day) => day.views))}
                  />
                  <p className="publish-panel-note">
                    {t('stats.viewsChartAria', {
                      count: views.totals.viewsInWindow,
                      days: views.days.length,
                    })}
                  </p>
                </>
              ) : (
                <p className="publish-panel-note">{t('stats.noViews')}</p>
              )}
            </section>
          )}

          {activity && (
            <section className="publish-panel">
              <h3>{t('stats.chartTitle', { days: activity.days.length })}</h3>
              {activity.total > 0 ? (
                <>
                  <DayBars days={activity.days} max={activity.max} />
                  <p className="publish-panel-note">
                    {t('stats.chartAria', {
                      count: activity.total,
                      days: activity.days.length,
                    })}
                  </p>
                </>
              ) : (
                <p className="publish-panel-note">{t('stats.noContacts')}</p>
              )}
            </section>
          )}

          {priceStats && (
            <section className="publish-panel">
              <h3>{t('stats.priceTitle', { category: categoryTitle })}</h3>
              <p className="stat-value">{formatPrice(listing.price, language)}</p>
              <div
                className="price-track"
                role="img"
                aria-label={t('stats.priceAria', {
                  price: formatPrice(listing.price, language),
                  min: formatPrice(priceStats.min, language),
                  max: formatPrice(priceStats.max, language),
                })}
              >
                <span
                  className="price-marker"
                  style={{ left: `${priceStats.position}%` }}
                />
              </div>
              <div className="price-ends" aria-hidden="true">
                <span>{formatPrice(priceStats.min, language)}</span>
                <span>{formatPrice(priceStats.max, language)}</span>
              </div>
              <p className="publish-panel-note">{priceMeta}</p>
            </section>
          )}

          <section className="publish-panel">
            <h3>{t('publish.checklistTitle')}</h3>
            <ul className="checklist">
              {checklist.map((item) => (
                <li
                  key={item.id}
                  className={item.done ? 'checklist-item done' : 'checklist-item'}
                >
                  <span className="checklist-mark" aria-hidden="true">
                    {item.done ? <CheckIcon size={12} /> : null}
                  </span>
                  <span className="checklist-label">{checkLabel(item)}</span>
                  {!item.done && (
                    <button
                      type="button"
                      className="btn secondary checklist-action"
                      onClick={
                        item.id === 'questions' ? onImproveQuestions : onEditListing
                      }
                    >
                      {t('publish.fix')}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <Link className="publish-back" to="/search">
          {t('publish.backToSearch')}
        </Link>
      </div>
    </section>
  )
}
