// Overlay drawer. It currently holds the account action list; the seller's
// listings live on the /app "My items" page. Fixed navigation entries (Search,
// My items) are added next to these actions.
import { Link } from 'react-router'
import {
  GearIcon,
  LayersIcon,
  LogOutIcon,
  MessageIcon,
  SearchIcon,
  UserIcon,
} from '../icons.jsx'
import { useI18n } from '../i18n.jsx'

export default function Drawer({
  open,
  onOpenSearch,
  onOpenMyItems,
  onOpenMessages,
  onOpenSettings,
  onOpenProfile,
  onOpenSignups,
  onSignOut,
  unreadCount = 0,
  myItemsUnreadCount = 0,
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

      <nav className="drawer-nav">
        <button type="button" className="drawer-action" onClick={onOpenSearch}>
          <span className="drawer-row-icon" aria-hidden="true">
            <SearchIcon size={18} />
          </span>
          <span className="drawer-row-title">{t('drawer.search')}</span>
        </button>
        {signedIn && (
          <button type="button" className="drawer-action" onClick={onOpenMyItems}>
            <span className="drawer-row-icon" aria-hidden="true">
              <LayersIcon size={18} />
            </span>
            <span className="drawer-row-title">{t('drawer.myItems')}</span>
            {myItemsUnreadCount > 0 && (
              <span
                className="badge"
                aria-label={t('drawer.unread', { count: myItemsUnreadCount })}
              >
                {myItemsUnreadCount > 99 ? '99+' : myItemsUnreadCount}
              </span>
            )}
          </button>
        )}
        {signedIn && (
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
        )}
        {signedIn && (
          <button type="button" className="drawer-action" onClick={onOpenSettings}>
            <span className="drawer-row-icon" aria-hidden="true">
              <GearIcon size={18} />
            </span>
            <span className="drawer-row-title">{t('drawer.settings')}</span>
          </button>
        )}
        {signedIn && (
          <button type="button" className="drawer-action" onClick={onOpenProfile}>
            <span className="drawer-row-icon" aria-hidden="true">
              <UserIcon size={18} />
            </span>
            <span className="drawer-row-title">{t('drawer.profile')}</span>
          </button>
        )}
      </nav>

      {signedIn ? (
        <div className="drawer-actions">
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
