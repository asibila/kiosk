// Top bar: hamburger (left), centered "Kiosk" title, profile + theme (right).
// Create-new-listing, Messages and Settings live at the bottom of the drawer.
import { MenuIcon, UserIcon, MoonIcon, SunIcon } from '../icons.jsx'

export default function TopBar({ onMenu, onOpenModal, theme = 'light', onToggleTheme }) {
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
