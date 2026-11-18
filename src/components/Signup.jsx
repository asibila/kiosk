// Signup screen: name + email + password + terms. The API creates the account
// and returns the session cookie in the same request, so the visitor lands
// signed in (same behaviour as the login screen).
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { api } from '../api.js'
import { useI18n } from '../i18n.jsx'
import GoogleAuthButton from './GoogleAuthButton.jsx'

export default function Signup({ onLoggedIn }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()

  const requested = location.state?.from
  const backTo =
    typeof requested === 'string' && requested.startsWith('/') ? requested : '/search'

  async function onSubmit(event) {
    event.preventDefault()
    setError('')

    if (password !== confirm) {
      setError(t('signup.passwordMismatch'))
      return
    }
    if (!acceptTerms) {
      setError(t('signup.termsRequired'))
      return
    }

    setBusy(true)
    try {
      const user = await api.register(name.trim(), email.trim(), password)
      onLoggedIn?.(user)
      navigate(backTo)
    } catch (err) {
      setError(err.message || t('signup.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="home-screen" aria-label={t('signup.aria')}>
      <h1>{t('signup.title')}</h1>
      <form className="home-form" onSubmit={onSubmit}>
        <label htmlFor="signup-name">{t('signup.name')}</label>
        <input
          id="signup-name"
          className="chat-input"
          type="text"
          autoComplete="name"
          placeholder={t('signup.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
        />

        <label htmlFor="signup-email">{t('signup.email')}</label>
        <input
          id="signup-email"
          className="chat-input"
          type="email"
          autoComplete="email"
          placeholder={t('signup.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          required
        />

        <label htmlFor="signup-password">{t('signup.password')}</label>
        <input
          id="signup-password"
          className="chat-input"
          type="password"
          autoComplete="new-password"
          placeholder={t('signup.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        <label htmlFor="signup-confirm">{t('signup.passwordConfirm')}</label>
        <input
          id="signup-confirm"
          className="chat-input"
          type="password"
          autoComplete="new-password"
          placeholder={t('signup.passwordConfirm')}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          required
        />

        <label className="signup-terms">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
          />
          <span>
            {t('signup.termsPrefix')}{' '}
            <Link to="/terms" target="_blank" rel="noreferrer">
              {t('signup.termsLink')}
            </Link>{' '}
            {t('signup.termsAnd')}{' '}
            <Link to="/privacy" target="_blank" rel="noreferrer">
              {t('signup.privacyLink')}
            </Link>
          </span>
        </label>

        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? t('signup.creating') : t('signup.submit')}
        </button>

        <p className="home-alt">
          {t('signup.haveAccount')}{' '}
          <Link to="/login" state={location.state}>
            {t('signup.signIn')}
          </Link>
        </p>
      </form>

      <GoogleAuthButton from={backTo} />
    </section>
  )
}
