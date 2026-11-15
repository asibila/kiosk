// Top bar: hamburger (left), centered "Kiosk" title, action icons (right).
import { MenuIcon, PlusIcon, MessageIcon, GearIcon, UserIcon, MoonIcon, SunIcon } from '../icons.jsx'

export default function TopBar({
  onMenu,
  onOpenModal,
  onCreateNew,
  theme = 'light',
  onToggleTheme,
  unreadCount = 0,
}) {
  const dark = theme === 'dark'

  return (
    <header className="topbar">
      <div className="topbar-side left">
        <button type="button" className="icon-btn" aria-label="Toggle my listings drawer" onClick={onMenu}>
          <MenuIcon />
        </button>
      </div>

      <h1 className="topbar-title">Kiosk</h1>

      <nav className="topbar-side right" aria-label="Top bar actions">
        <button
          type="button"
          className="icon-btn"
          aria-label="Create new listing"
          title="Create new listing"
          onClick={onCreateNew}
        >
          <PlusIcon />
        </button>

        <button
          type="button"
          className="icon-btn message-btn"
          aria-label={unreadCount > 0 ? `Open messages (${unreadCount} unread)` : 'Open messages'}
          title="Messages"
          onClick={() => onOpenModal('messages')}
        >
          <MessageIcon />
          {unreadCount > 0 && (
            <span className="topbar-badge" aria-hidden="true">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <button type="button" className="icon-btn" aria-label="Open settings" onClick={() => onOpenModal('settings')}>
          <GearIcon />
        </button>
        <button type="button" className="icon-btn" aria-label="Open profile" onClick={() => onOpenModal('profile')}>
          <UserIcon />
        </button>
        <button
          type="button"
          className="icon-btn theme-toggle"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={dark}
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={onToggleTheme}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </nav>
    </header>
  )
}
