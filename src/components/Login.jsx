// Login screen: email + password sign-in (full screen).
import { useState } from 'react'
import { useNavigate } from 'react-router'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

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
        let message = 'Invalid email or password.'
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
      navigate('/app', { state: { userId: data.userId } })
    } catch (err) {
      setError(err.message || 'Sign in failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="home-screen" aria-label="Log in">
      <h1>Kiosk</h1>
      <form className="home-form" onSubmit={onSubmit}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          className="chat-input"
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          className="chat-input"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error ? <p className="login-error">{error}</p> : null}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Log in'}
        </button>
      </form>
    </section>
  )
}
