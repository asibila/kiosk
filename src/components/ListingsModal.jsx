// Listings modal: shows a list of listings (optionally filtered), with close.
import { XIcon, ThumbGlyph } from '../icons.jsx'

export default function ListingsModal({ title, listings, onClose }) {
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
            {listings.map((listing) => (
              <li key={listing.id}>
                <div className="browse-item">
                  <span className="thumb">
                    <ThumbGlyph kind={listing.thumb || 'tag'} />
                  </span>
                  <div className="browse-item-main">
                    <span className="browse-item-title">{listing.title}</span>
                    <p className="browse-item-desc">{listing.desc}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
