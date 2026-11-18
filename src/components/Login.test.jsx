import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import Login from './Login.jsx'

vi.mock('../api.js', () => ({
  api: { login: vi.fn(async () => ({ id: 1, name: 'Ana' })) },
  googleSignInUrl: (from) => `/api/auth/google?from=${encodeURIComponent(from)}`,
}))

const { api } = await import('../api.js')

function renderLogin(entry = '/login') {
  return render(
    <LanguageProvider initialStrings={TEST_STRINGS}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/search" element={<p>marketplace</p>} />
          <Route path="/listing/1" element={<p>listing page</p>} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear()
    api.login.mockClear()
  })

  it('offers Google sign-in and keeps the requested page', () => {
    renderLogin({ pathname: '/login', state: { from: '/listing/1' } })

    expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      '/api/auth/google?from=%2Flisting%2F1',
    )
  })

  it('signs in with a password and returns to the requested page', async () => {
    renderLogin({ pathname: '/login', state: { from: '/listing/1' } })

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'ana@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'super-secret' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByText('listing page')).toBeInTheDocument()
    expect(api.login).toHaveBeenCalledWith('ana@example.com', 'super-secret')
  })

  it('shows the Google error returned by the callback', () => {
    renderLogin('/login?error=email_in_use&from=%2Flisting%2F1')

    expect(screen.getByRole('alert')).toHaveTextContent(
      'An account with this email already exists. Sign in with your password instead.',
    )
  })

  it('keeps the callback target when starting Google sign-in after an error', () => {
    renderLogin('/login?error=denied&from=%2Flisting%2F1')

    expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      '/api/auth/google?from=%2Flisting%2F1',
    )
  })
})
