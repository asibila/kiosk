import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import ConnectGoogleRow from './ConnectGoogleRow.jsx'

vi.mock('../api.js', () => ({
  fetchAuthProviders: vi.fn(),
  googleLinkUrl: (from) => `/api/auth/google?link=1&from=${encodeURIComponent(from)}`,
}))

const { fetchAuthProviders } = await import('../api.js')

function renderRow() {
  return render(
    <LanguageProvider initialStrings={TEST_STRINGS}>
      <ConnectGoogleRow from="/app" />
    </LanguageProvider>,
  )
}

describe('ConnectGoogleRow', () => {
  beforeEach(() => {
    localStorage.clear()
    fetchAuthProviders.mockReset()
  })

  it('offers to connect Google when the account has no link', async () => {
    fetchAuthProviders.mockResolvedValue({ google: false })
    renderRow()

    const link = await screen.findByRole('link', { name: 'Connect Google' })
    expect(link).toHaveAttribute('href', '/api/auth/google?link=1&from=%2Fapp')
    expect(screen.getByText(/Connect Google to sign in/)).toBeInTheDocument()
  })

  it('shows the connected badge instead of the button', async () => {
    fetchAuthProviders.mockResolvedValue({ google: true })
    renderRow()

    expect(await screen.findByText('Connected')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Connect Google' })).not.toBeInTheDocument()
  })

  it('falls back to the button when the endpoint fails', async () => {
    fetchAuthProviders.mockRejectedValue(new Error('offline'))
    renderRow()

    expect(
      await screen.findByRole('link', { name: 'Connect Google' }),
    ).toBeInTheDocument()
  })
})
