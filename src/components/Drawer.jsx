// Overlay drawer listing the signed-in user's listings (flat, one level).
// Listings come from GET /listings filtered by the logged-in user's id.
// The selected listing expands to show its chat threads (via listing-chat-threads);
// clicking one opens that conversation on the main screen.
import { Fragment } from 'react'
import { ChatIcon, GearIcon, LogOutIcon, MessageIcon, PlusIcon, TagIcon, TrashIcon } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'

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
  onSignOut,
  unreadCount = 0,
  signedIn = true,
  onSignIn,
}) {
  const { t } = useI18n()
  return (
    <aside
      className={open ? 'drawer open' : 'drawer'}
      aria-label={t('drawer.aria')}
      aria-hidden={open ? undefined : true}
      inert={open ? undefined : true}
    >
      <div className="drawer-head">
        <span className="drawer-title">{t('drawer.title')}</span>
      </div>

      {signedIn ? (
        <>
          <div className="drawer-list scrollable">
        {listings.length === 0 && <p className="drawer-empty">{t('drawer.empty')}</p>}
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
                  aria-label={t('drawer.deleteAria', { title: listing.title })}
                  title={t('drawer.delete')}
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
                <div className="drawer-chats" aria-label={t('drawer.conversations', { title: listing.title })}>
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
                          <span className="listing-row-name">{t('drawer.chat', { id: chat.threadId })}</span>
                          <span className="listing-row-desc">
                            {lastMessage ? lastMessage.text : t('drawer.noMessages')}
                          </span>
                        </span>
                        {chat.unread > 0 && (
                          <span className="badge" aria-label={t('drawer.unread', { count: chat.unread })}>
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
              <span className="drawer-row-title">{t('drawer.newListing')}</span>
            </button>

            <button type="button" className="drawer-action" onClick={onOpenMessages}>
              <span className="drawer-row-icon" aria-hidden="true">
                <MessageIcon size={18} />
              </span>
              <span className="drawer-row-title">{t('drawer.messages')}</span>
              {unreadCount > 0 && (
                <span className="badge" aria-label={t('drawer.unread', { count: unreadCount })}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <button type="button" className="drawer-action" onClick={onOpenSettings}>
              <span className="drawer-row-icon" aria-hidden="true">
                <GearIcon size={18} />
              </span>
              <span className="drawer-row-title">{t('drawer.settings')}</span>
            </button>

            <button
              type="button"
              className="drawer-action drawer-signout"
              onClick={onSignOut}
            >
              <span className="drawer-row-icon" aria-hidden="true">
                <LogOutIcon size={18} />
              </span>
              <span className="drawer-row-title">{t('drawer.signOut')}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="drawer-guest">
          <p className="drawer-guest-text">{t('drawer.guest')}</p>
          <button type="button" className="btn primary drawer-signin" onClick={onSignIn}>
            {t('drawer.signIn')}
          </button>
        </div>
      )}
    </aside>
  )
}
