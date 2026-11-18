import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import Signup from './Signup.jsx'

vi.mock('../api.js', () => ({
  api: { register: vi.fn(async () => ({ id: 9, name: 'Ana', email: 'ana@example.com' })) },
  googleSignInUrl: (from) => `/api/auth/google?from=${encodeURIComponent(from)}`,
}))

const { api } = await import('../api.js')

function renderSignup(initialEntries = ['/signup']) {
  return render(
    <LanguageProvider initialStrings={TEST_STRINGS}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/signup" element={<Signup />} />
          <Route path="/search" element={<p>marketplace</p>} />
          <Route path="/listing/1" element={<p>listing page</p>} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

function fill({ password = 'super-secret', confirm = password, terms = true } = {}) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ana@example.com' } })
  fireEvent.change(screen.getByLabelText('Password (at least 8 characters)'), {
    target: { value: password },
  })
  fireEvent.change(screen.getByLabelText('Repeat password'), {
    target: { value: confirm },
  })
  if (terms) {
    fireEvent.click(screen.getByRole('checkbox'))
  }
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('Signup', () => {
  beforeEach(() => {
    localStorage.clear()
    api.register.mockClear()
    api.register.mockResolvedValue({ id: 9, name: 'Ana', email: 'ana@example.com' })
  })

  it('renders the form with a terms checkbox', () => {
    renderSignup()

    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Repeat password')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'terms of service' })).toHaveAttribute(
      'href',
      '/terms',
    )
    expect(screen.getByRole('link', { name: 'privacy notice' })).toHaveAttribute(
      'href',
      '/privacy',
    )
  })

  it('requires the passwords to match', () => {
    renderSignup()
    fill({ confirm: 'different-secret' })
    submit()

    expect(screen.getByRole('alert')).toHaveTextContent('The passwords do not match.')
    expect(api.register).not.toHaveBeenCalled()
  })

  it('requires the terms to be accepted', () => {
    renderSignup()
    fill({ terms: false })
    submit()

    expect(screen.getByRole('alert')).toHaveTextContent('Please accept the terms')
    expect(api.register).not.toHaveBeenCalled()
  })

  it('creates the account and lands on the marketplace', async () => {
    renderSignup()
    fill()
    submit()

    expect(await screen.findByText('marketplace')).toBeInTheDocument()
    expect(api.register).toHaveBeenCalledWith('Ana', 'ana@example.com', 'super-secret')
  })

  it('returns to the page that asked for an account', async () => {
    renderSignup([
      { pathname: '/signup', state: { from: '/listing/1' } },
    ])
    fill()
    submit()

    expect(await screen.findByText('listing page')).toBeInTheDocument()
  })

  it('shows the API error for a duplicate email', async () => {
    api.register.mockRejectedValueOnce(
      new Error('A user with this email already exists'),
    )
    renderSignup()
    fill()
    submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A user with this email already exists',
    )
    expect(screen.queryByText('marketplace')).not.toBeInTheDocument()
  })
})
