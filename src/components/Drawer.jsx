// Overlay drawer listing the signed-in user's listings (flat, one level).
// Listings come from GET /listings filtered by the logged-in user's id.
// The selected listing expands to show its chat threads (via listing-chat-threads);
// clicking one opens that conversation on the main screen.
import { Fragment } from 'react'
import { ChatIcon, GearIcon, MessageIcon, PlusIcon, TagIcon, TrashIcon } from '../icons.jsx'

export default function Drawer({
  open,
  listings,
  chats,
  selectedListingId,
  selectedChatId,
  onListingClick,
  onChatClick,
  onDeleteListing,
  onCreateNew,
  onOpenMessages,
  onOpenSettings,
  unreadCount = 0,
  signedIn = true,
  onSignIn,
}) {
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

      {signedIn ? (
        <>
          <div className="drawer-list scrollable">
        {listings.length === 0 && <p className="drawer-empty">No listings yet</p>}
        {listings.map((listing) => {
          const isSelected = selectedListingId === listing.id
          const listingChats = isSelected
            ? chats.filter((chat) => String(chat.listingId) === String(listing.id))
            : []
          return (
            <Fragment key={listing.id}>
              <div
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

              {isSelected && listingChats.length > 0 && (
                <div className="drawer-chats" aria-label={`Conversations for ${listing.title}`}>
                  {listingChats.map((chat) => {
                    const isChatSelected = selectedChatId === chat.id
                    const lastMessage = chat.messages[chat.messages.length - 1]
                    return (
                      <div
                        key={chat.id}
                        className={
                          isChatSelected
                            ? 'drawer-row chat-row listing-chat-row selected'
                            : 'drawer-row chat-row listing-chat-row'
                        }
                        role="button"
                        tabIndex={0}
                        onClick={() => onChatClick(chat.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onChatClick(chat.id)
                          }
                        }}
                      >
                        <span className="drawer-row-icon">
                          <ChatIcon size={15} />
                        </span>
                        <span className="drawer-row-title">
                          <span className="listing-row-name">Chat #{chat.threadId}</span>
                          <span className="listing-row-desc">
                            {lastMessage ? lastMessage.text : 'No messages yet'}
                          </span>
                        </span>
                        {chat.unread > 0 && (
                          <span className="badge" aria-label={`${chat.unread} unread`}>
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </Fragment>
          )
        })}
          </div>

          <div className="drawer-actions">
            <button type="button" className="drawer-action" onClick={onCreateNew}>
              <span className="drawer-row-icon" aria-hidden="true">
                <PlusIcon size={18} />
              </span>
              <span className="drawer-row-title">New listing</span>
            </button>

            <button type="button" className="drawer-action" onClick={onOpenMessages}>
              <span className="drawer-row-icon" aria-hidden="true">
                <MessageIcon size={18} />
              </span>
              <span className="drawer-row-title">Messages</span>
              {unreadCount > 0 && (
                <span className="badge" aria-label={`${unreadCount} unread`}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <button type="button" className="drawer-action" onClick={onOpenSettings}>
              <span className="drawer-row-icon" aria-hidden="true">
                <GearIcon size={18} />
              </span>
              <span className="drawer-row-title">Settings</span>
            </button>
          </div>
        </>
      ) : (
        <div className="drawer-guest">
          <p className="drawer-guest-text">Sign in to see your listings and messages.</p>
          <button type="button" className="btn primary drawer-signin" onClick={onSignIn}>
            Sign in
          </button>
        </div>
      )}
    </aside>
  )
}
