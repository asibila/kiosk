// Dashboard root: the seller's listings, one per line. Each row shows the
// picture, title, orientation/condition summary and actions to delete the ad,
// expand the remaining facets in place, or open its statistics.
import { useState } from 'react'
import {
  ChevronRightIcon,
  MessageIcon,
  PlusIcon,
  SearchIcon,
  ThumbGlyph,
  TrashIcon,
  XIcon,
} from '../icons.jsx'
import { useI18n } from '../i18n.jsx'
import CompletenessScore from './CompletenessScore.jsx'

export default function MyListingsList({
  items = [],
  onOpen,
  onDelete,
  onCreate,
  onMessages,
}) {
  const { t } = useI18n()
  const [expandedId, setExpandedId] = useState(null)
  const [query, setQuery] = useState('')

  const needle = query.trim().toLowerCase()
  const filtered = needle
    ? items.filter((item) => item.title.toLowerCase().includes(needle))
    : items

  return (
    <section className="my-listings-page" aria-label={t('breadcrumb.myItems')}>
      <div className="my-items-toolbar" role="search">
        <label className="my-items-search">
          <SearchIcon size={18} aria-hidden="true" />
          <span className="sr-only">{t('myListings.search')}</span>
          <input
            type="search"
            value={query}
            placeholder={t('myListings.searchPlaceholder')}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {query && (
          <button
            type="button"
            className="icon-btn"
            aria-label={t('myListings.clearSearch')}
            onClick={() => setQuery('')}
          >
            <XIcon size={16} />
          </button>
        )}
        <button
          type="button"
          className="btn primary my-items-add"
          onClick={onCreate}
        >
          <PlusIcon size={16} />
          {t('myListings.add')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="my-listings-empty">{t('myListings.noMatches')}</p>
      ) : (
        <ul className="my-listings">
          {filtered.map((item) => {
            const expanded = expandedId === item.id
            return (
              <li
                key={item.id}
                className={item.isActive ? 'my-listing-item' : 'my-listing-item inactive'}
              >
                <div className="my-listing-row">
                  <span className="my-listing-thumb">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" />
                    ) : (
                      <ThumbGlyph kind="tag" svg={item.iconSvg} size={26} />
                    )}
                  </span>

                  <span className="my-listing-main">
                    <span className="my-listing-title-row">
                      <span className="my-listing-title">{item.title}</span>
                      <CompletenessScore
                        answered={item.facetsCount}
                        total={item.facetsCountMax}
                      />
                      {!item.isActive && (
                        <span className="listing-status">{t('listing.draft')}</span>
                      )}
                    </span>
                    {item.summary && (
                      <span className="my-listing-summary">{item.summary}</span>
                    )}
                  </span>

                  <span className="my-listing-actions">
                    {item.details.length > 0 && (
                      <button
                        type="button"
                        className="icon-btn my-listing-more"
                        aria-expanded={expanded}
                        aria-label={t(
                          expanded ? 'myListings.hideDetails' : 'myListings.showDetails',
                          { title: item.title },
                        )}
                        title={t(
                          expanded ? 'myListings.hideDetails' : 'myListings.showDetails',
                          { title: item.title },
                        )}
                        onClick={() => setExpandedId(expanded ? null : item.id)}
                      >
                        <span aria-hidden="true">…</span>
                      </button>
                    )}
                    <button
                      type="button"
                      className="icon-btn my-listing-messages"
                      aria-label={t(
                        item.unreadCount > 0
                          ? 'myListings.messagesUnread'
                          : 'myListings.messages',
                        { title: item.title, count: item.unreadCount },
                      )}
                      title={t(
                        item.unreadCount > 0
                          ? 'myListings.messagesUnread'
                          : 'myListings.messages',
                        { title: item.title, count: item.unreadCount },
                      )}
                      onClick={() => onMessages(item.listing)}
                    >
                      <MessageIcon size={16} />
                      {item.unreadCount > 0 && (
                        <span className="badge my-listing-badge" aria-hidden="true">
                          {item.unreadCount > 99 ? '99+' : item.unreadCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      className="icon-btn my-listing-delete"
                      aria-label={t('myListings.delete', { title: item.title })}
                      title={t('myListings.delete', { title: item.title })}
                      onClick={() => onDelete(item.listing)}
                    >
                      <TrashIcon size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn my-listing-open"
                      aria-label={t('myListings.openStats', { title: item.title })}
                      onClick={() => onOpen(item.id)}
                    >
                      <ChevronRightIcon size={18} />
                    </button>
                  </span>
                </div>

                {expanded && (
                  <dl className="my-listing-facets">
                    {item.details.map((detail) => (
                      <div key={detail.label}>
                        <dt>{detail.label}</dt>
                        <dd>{detail.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
