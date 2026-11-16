// Login screen: email + password sign-in (full screen).
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useI18n } from '../i18n.jsx'
import { API_BASE } from '../api.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useI18n()

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        let message = t('login.invalid')
        try {
          const body = await res.json()
          if (body?.message) message = Array.isArray(body.message) ? body.message[0] : body.message
        } catch {
          // Non-JSON error body; keep the default message.
        }
        throw new Error(message)
      }

      const data = await res.json()
      try {
        localStorage.setItem('kiosk-user-id', String(data.userId))
      } catch {
        // Ignore storage failures; the id still drives this session via navigation state.
      }
      // Return to the page that asked for sign-in (for example a listing detail
      // page), but never follow an external URL.
      const requested = location.state?.from
      const target =
        typeof requested === 'string' && requested.startsWith('/') ? requested : '/search'
      navigate(target, { state: { userId: data.userId } })
    } catch (err) {
      setError(err.message || t('login.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="home-screen" aria-label={t('login.aria')}>
      <h1>{t('login.title')}</h1>
      <form className="home-form" onSubmit={onSubmit}>
        <label htmlFor="login-email">{t('login.email')}</label>
        <input
          id="login-email"
          className="chat-input"
          type="email"
          autoComplete="email"
          placeholder={t('login.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="login-password">{t('login.password')}</label>
        <input
          id="login-password"
          className="chat-input"
          type="password"
          autoComplete="current-password"
          placeholder={t('login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="login-error">{error}</p> : null}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? t('login.signingIn') : t('login.signin')}
        </button>
      </form>
    </section>
  )
}
