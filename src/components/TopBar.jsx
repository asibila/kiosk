// Top bar: hamburger (left), centered "Kiosk" title, action icons (right).
import { MenuIcon, PlusIcon, SearchIcon, MessageIcon, GearIcon, UserIcon, MoonIcon, SunIcon } from '../icons.jsx'

export default function TopBar({ onMenu, onOpenModal, onCreateNew, theme = 'light', onToggleTheme }) {
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
        <button type="button" className="icon-btn" aria-label="Browse marketplace" onClick={() => onOpenModal('browse')}>
          <SearchIcon />
        </button>
        <button type="button" className="icon-btn" aria-label="Open messages" onClick={() => onOpenModal('messages')}>
          <MessageIcon />
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
