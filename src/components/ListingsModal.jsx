// Listings modal: shows a list of listings (optionally filtered), with close.
// Each row has an envelope action that starts an inbox conversation; the action
// is disabled for the signed-in user's own listings.
import { EnvelopeIcon, XIcon, ThumbGlyph } from '../icons.jsx'
import { mediaUrl } from '../api.js'

export default function ListingsModal({
  title,
  listings,
  onClose,
  onContact,
  contactingId = null,
  currentUserId = null,
}) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card wide" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <XIcon />
          </button>
        </header>

        {listings.length === 0 ? (
          <p className="messages-empty">No listings match the current filters.</p>
        ) : (
          <ul className="browse-list scrollable">
            {listings.map((listing) => {
              const owned =
                currentUserId != null && Number(listing.userId) === Number(currentUserId)

              return (
                <li key={listing.id}>
                  <div className="browse-item">
                    <span className="thumb">
                      {listing.imageUrl ? (
                        <img src={mediaUrl(listing.imageUrl)} alt="" loading="lazy" />
                      ) : (
                        <ThumbGlyph kind={listing.thumb || 'tag'} />
                      )}
                    </span>
                    <div className="browse-item-main">
                      <span className="browse-item-title">{listing.title}</span>
                      <p className="browse-item-desc">{listing.desc}</p>
                    </div>
                    {onContact ? (
                      <button
                        type="button"
                        className="icon-btn listing-contact"
                        aria-label={
                          owned
                            ? `Your listing: ${listing.title}`
                            : `Start conversation about ${listing.title}`
                        }
                        title={owned ? 'This is your listing' : 'Start conversation'}
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
