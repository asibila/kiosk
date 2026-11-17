// Top bar: hamburger (left), centered "Kiosk" title, add-listing + language
// dropdown + profile/theme (right). Create-new-listing, Messages and Settings
// live at the bottom of the drawer.
import { Link } from 'react-router'
import { MenuIcon, PlusIcon, UserIcon, MoonIcon, SunIcon } from '../icons.jsx'
import { LANGUAGES, useI18n } from '../i18n.jsx'

export default function TopBar({
  onMenu,
  onOpenModal,
  onAddListing,
  theme = 'light',
  onToggleTheme,
  languages = LANGUAGES,
}) {
  const dark = theme === 'dark'
  const { language, setLanguage, t } = useI18n()

  return (
    <header className="topbar">
      <div className="topbar-side left">
        <button
          type="button"
          className="icon-btn"
          aria-label={t('topbar.menu')}
          onClick={onMenu}
        >
          <MenuIcon />
        </button>
      </div>

      <h1 className="topbar-title">
        <Link className="topbar-title-link" to="/search" title={t('topbar.home')}>
          Kiosk
        </Link>
      </h1>

      <nav className="topbar-side right" aria-label={t('topbar.actions')}>
        <button
          type="button"
          className="icon-btn"
          aria-label={t('topbar.addListing')}
          title={t('topbar.addListing')}
          onClick={onAddListing}
        >
          <PlusIcon size={20} />
        </button>
        <select
          className="lang-select"
          aria-label={t('topbar.language')}
          title={t('topbar.language')}
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
        >
          {languages.map((option) => (
            <option key={option.code} value={option.code}>
              {option.code.toUpperCase()}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="icon-btn"
          aria-label={t('topbar.profile')}
          onClick={() => onOpenModal('profile')}
        >
          <UserIcon />
        </button>
        <button
          type="button"
          className="icon-btn theme-toggle"
          aria-label={dark ? t('topbar.themeLight') : t('topbar.themeDark')}
          aria-pressed={dark}
          title={dark ? t('topbar.themeLight') : t('topbar.themeDark')}
          onClick={onToggleTheme}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </nav>
    </header>
  )
}
