// Overlay drawer listing the signed-in user's listings (flat, one level).
// Listings come from GET /listings filtered by the logged-in user's id.
import { TagIcon, TrashIcon } from '../icons.jsx'

export default function Drawer({ open, listings, selectedListingId, onListingClick, onDeleteListing }) {
  return (
    <aside
      className={open ? 'drawer open' : 'drawer'}
      aria-label="My listings"
      aria-hidden={open ? undefined : true}
      inert={open ? undefined : true}
    >
      <div className="drawer-head">
        <span className="drawer-title">My listings</span>
      </div>

      <div className="drawer-list scrollable">
        {listings.length === 0 && <p className="drawer-empty">No listings yet</p>}
        {listings.map((listing) => {
          const isSelected = selectedListingId === listing.id
          return (
            <div
              key={listing.id}
              className={isSelected ? 'drawer-row listing-row selected' : 'drawer-row listing-row'}
              role="button"
              tabIndex={0}
              onClick={() => onListingClick(listing)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onListingClick(listing)
                }
              }}
            >
              <span className="drawer-row-icon">
                <TagIcon size={18} />
              </span>
              <span className="drawer-row-title">
                <span className="listing-row-name">{listing.title}</span>
                {listing.desc && <span className="listing-row-desc">{listing.desc}</span>}
              </span>
              <button
                type="button"
                className="icon-btn listing-delete"
                aria-label={`Delete ${listing.title}`}
                title="Delete listing"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteListing(listing)
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <TrashIcon size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
