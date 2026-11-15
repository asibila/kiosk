// Top bar: hamburger (left), centered "Kiosk" title, language/profile/theme (right).
// Create-new-listing, Messages and Settings live at the bottom of the drawer.
import { Link } from 'react-router'
import { MenuIcon, UserIcon, MoonIcon, SunIcon } from '../icons.jsx'
import { LANGUAGES, useI18n } from '../i18n.jsx'

export default function TopBar({
  onMenu,
  onOpenModal,
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
        <div className="lang-switch" role="group" aria-label={t('topbar.language')}>
          {languages.map((option) => (
            <button
              key={option.code}
              type="button"
              className={option.code === language ? 'lang-btn active' : 'lang-btn'}
              aria-pressed={option.code === language}
              title={option.name}
              onClick={() => setLanguage(option.code)}
            >
              {option.code.toUpperCase()}
            </button>
          ))}
        </div>
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
