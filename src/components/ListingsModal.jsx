// Listings modal: shows a list of listings (optionally filtered), with close.
// Each row has an envelope action that starts an inbox conversation; the action
// is disabled for the signed-in user's own listings.
import { EnvelopeIcon, XIcon, ThumbGlyph } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'
import { mediaUrl } from '../api.js'
import CompletenessScore from './CompletenessScore.jsx'

export default function ListingsModal({
  title,
  listings,
  onClose,
  onContact,
  contactingId = null,
  currentUserId = null,
}) {
  const { t } = useI18n()
  const visibleListings = listings.filter(
    (listing) =>
      listing.isActive !== false ||
      (currentUserId != null && Number(listing.userId) === Number(currentUserId)),
  )
  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card wide" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={onClose}>
            <XIcon />
          </button>
        </header>

        {visibleListings.length === 0 ? (
          <p className="messages-empty">{t('listings.empty')}</p>
        ) : (
          <ul className="browse-list scrollable">
            {visibleListings.map((listing) => {
              const owned =
                currentUserId != null && Number(listing.userId) === Number(currentUserId)

              return (
                <li key={listing.id}>
                  <div
                    className={
                      listing.isActive === false
                        ? 'browse-item inactive'
                        : 'browse-item'
                    }
                  >
                    <span className="thumb">
                      {listing.imageUrl ? (
                        <img src={mediaUrl(listing.imageUrl)} alt="" loading="lazy" />
                      ) : (
                        <ThumbGlyph kind={listing.thumb || 'tag'} />
                      )}
                    </span>
                    <div className="browse-item-main">
                      <div className="browse-item-title-row">
                        <span className="browse-item-title">{listing.title}</span>
                        <CompletenessScore
                          answered={listing.facetsCount}
                          total={listing.facetsCountMax}
                        />
                      </div>
                      {listing.isActive === false && (
                        <span className="listing-status">{t('listing.draft')}</span>
                      )}
                      <p className="browse-item-desc">{listing.desc}</p>
                    </div>
                    {onContact ? (
                      <button
                        type="button"
                        className="icon-btn listing-contact"
                        aria-label={
                          owned
                            ? t('listings.your', { title: listing.title })
                            : t('listings.start', { title: listing.title })
                        }
                        title={owned ? t('listings.yourTitle') : t('listings.startTitle')}
                        disabled={owned || contactingId === listing.id}
                        onClick={() => onContact(listing)}
                      >
                        <EnvelopeIcon />
                      </button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
