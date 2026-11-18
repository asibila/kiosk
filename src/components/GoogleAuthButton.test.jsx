import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import GoogleAuthButton from './GoogleAuthButton.jsx'

function renderButton(props = {}) {
  return render(
    <LanguageProvider initialStrings={TEST_STRINGS}>
      <GoogleAuthButton {...props} />
    </LanguageProvider>,
  )
}

describe('GoogleAuthButton', () => {
  it('links to the API sign-in endpoint and returns to the requested page', () => {
    renderButton({ from: '/listing/1' })

    expect(
      screen.getByRole('link', { name: 'Continue with Google' }),
    ).toHaveAttribute('href', '/api/auth/google?from=%2Flisting%2F1')
    expect(screen.getByText(/accept the terms of service/i)).toBeInTheDocument()
  })

  it('defaults to the marketplace after sign-in', () => {
    renderButton()

    expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      '/api/auth/google?from=%2Fsearch',
    )
  })

  it('explains an email that already has a password account', () => {
    renderButton({ error: 'email_in_use' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'An account with this email already exists. Sign in with your password instead.',
    )
  })

  it('maps the other callback errors', () => {
    const { unmount } = renderButton({ error: 'denied' })
    expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in was cancelled.')
    unmount()

    renderButton({ error: 'unavailable' })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Google sign-in is not available right now.',
    )
  })

  it('shows nothing extra without an error', () => {
    renderButton()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
