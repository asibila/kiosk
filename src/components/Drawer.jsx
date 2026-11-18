// Overlay drawer listing the signed-in user's listings (flat, one level).
// Listings come from GET /listings filtered by the logged-in user's id.
// The selected listing expands to show its chat threads (via listing-chat-threads);
// clicking one opens that conversation on the main screen.
import { Fragment } from 'react'
import { Link } from 'react-router'
import { ChatIcon, GearIcon, LogOutIcon, MessageIcon, PlusIcon, TagIcon, TrashIcon, UserIcon } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'
import CompletenessScore from './CompletenessScore.jsx'

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
  onOpenSignups,
  onSignOut,
  unreadCount = 0,
  signedIn = true,
  onSignIn,
  user = null,
}) {
  const { t } = useI18n()
  const isAdmin = user?.role === 'ADMIN'
  const userInitials = user?.name
    ? String(user.name)
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : <UserIcon size={16} />
  return (
    <aside
      className={open ? 'drawer open' : 'drawer'}
      aria-label={t('drawer.aria')}
      aria-hidden={open ? undefined : true}
      inert={open ? undefined : true}
    >
      <div className="drawer-head">
        {signedIn && user ? (
          <div className="drawer-user">
            <span className="drawer-user-avatar" aria-hidden="true">
              {userInitials}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="drawer-user-name">{user.name}</div>
              <div className="drawer-user-role">{user.email}</div>
            </div>
          </div>
        ) : (
          <span className="drawer-title">{t('drawer.title')}</span>
        )}
      </div>

      {signedIn ? (
        <>
          <div className="drawer-list scrollable">
        {listings.length === 0 && <p className="drawer-empty">{t('drawer.empty')}</p>}
        {listings.map((listing) => {
          const isSelected = selectedListingId === listing.id
          const inactive = listing.isActive === false
          const listingChats = isSelected
            ? chats.filter((chat) => String(chat.listingId) === String(listing.id))
            : []
          return (
            <Fragment key={listing.id}>
              <div
                className={[
                  'drawer-row',
                  'listing-row',
                  isSelected ? 'selected' : '',
                  inactive ? 'inactive' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
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
                  <span className="listing-row-heading">
                    <span className="listing-row-name">{listing.title}</span>
                    <CompletenessScore
                      answered={listing.facetsCount}
                      total={listing.facetsCountMax}
                    />
                  </span>
                  {inactive && (
                    <span className="listing-status">{t('listing.draft')}</span>
                  )}
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

            {isAdmin && (
              <button type="button" className="drawer-action" onClick={onOpenSignups}>
                <span className="drawer-row-icon" aria-hidden="true">
                  <UserIcon size={18} />
                </span>
                <span className="drawer-row-title">{t('admin.signups')}</span>
              </button>
            )}

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
          <Link className="drawer-guest-link" to="/signup">
            {t('login.createAccount')}
          </Link>
        </div>
      )}
    </aside>
  )
}
