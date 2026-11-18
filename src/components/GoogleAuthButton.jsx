// "Continue with Google" action shared by the login and signup screens.
// The button is a plain link: the API owns the OAuth flow and redirects back to
// the site, where the session cookie is already set.
import { googleSignInUrl } from '../api.js'
import { useI18n } from '../i18n.jsx'

/** `?error=` codes from `/auth/google/callback` → message keys. */
const ERROR_KEYS = {
  email_in_use: 'auth.error.emailInUse',
  account_inactive: 'auth.error.inactive',
  email_unverified: 'auth.error.unverified',
  denied: 'auth.error.denied',
  unavailable: 'auth.error.unavailable',
  failed: 'auth.error.failed',
}

export default function GoogleAuthButton({ from = '/search', error = null }) {
  const { t } = useI18n()
  const errorKey = error ? ERROR_KEYS[error] : null

  return (
    <div className="auth-social">
      <div className="auth-divider" aria-hidden="true">
        <span>{t('auth.or')}</span>
      </div>

      {errorKey && (
        <p className="login-error" role="alert">
          {t(errorKey)}
        </p>
      )}

      <a className="btn google" href={googleSignInUrl(from)}>
        <GoogleMark />
        {t('auth.google')}
      </a>

      <p className="auth-hint">{t('auth.termsHint')}</p>
    </div>
  )
}

/** Inline Google "G" mark (kept local: no external requests, works offline). */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.4 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v8.3h12.6c-.3 2.1-1.7 5.1-4.9 7.1l7.6 5.9c4.5-4.2 6.8-10.3 6.8-17.2z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.6a14.6 14.6 0 0 1 0-9.2l-7.9-6.2a24 24 0 0 0 0 21.6l7.9-6.2z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2 1.4-4.8 2.4-8.3 2.4-6.3 0-11.6-3.9-13.5-9.4l-7.9 6.2C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  )
}
