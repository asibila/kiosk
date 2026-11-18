// Top bar: hamburger (left), centered "Kiosk" title, language + theme (right).
// Navigation and the account actions live in the drawer.
import { Link } from 'react-router'
import { MenuIcon, MoonIcon, SunIcon } from '../icons.jsx'
import { LANGUAGES, useI18n } from '../i18n.jsx'

export default function TopBar({
  onMenu,
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
          aria-label={t('topbar.openMenu')}
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
