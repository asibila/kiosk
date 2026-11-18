import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import SignupsModal from './SignupsModal.jsx'

vi.mock('../api.js', () => ({
  api: { list: vi.fn() },
  mediaUrl: (path) => path ?? '',
}))

const { api } = await import('../api.js')

function renderModal() {
  return render(
    <LanguageProvider initialStrings={TEST_STRINGS}>
      <SignupsModal onClose={() => {}} />
    </LanguageProvider>,
  )
}

describe('SignupsModal', () => {
  beforeEach(() => {
    localStorage.clear()
    api.list.mockReset()
  })

  it('lists the newest accounts first with names, emails and dates', async () => {
    api.list.mockResolvedValue([
      {
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        role: 'USER',
        createdAt: '2026-11-10T09:00:00.000Z',
      },
      {
        id: 2,
        name: 'Boris',
        email: 'boris@example.com',
        role: 'ADMIN',
        createdAt: '2026-11-18T09:00:00.000Z',
      },
    ])

    renderModal()

    expect(await screen.findByText('Boris')).toBeInTheDocument()
    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Boris')
    expect(rows[1]).toHaveTextContent('Ana')
    expect(rows[0]).toHaveTextContent('boris@example.com')
    expect(rows[0]).toHaveTextContent('Admin')
    expect(api.list).toHaveBeenCalledWith('users')
  })

  it('shows an empty state', async () => {
    api.list.mockResolvedValue([])
    renderModal()

    expect(await screen.findByText('No accounts yet.')).toBeInTheDocument()
  })

  it('surfaces the API error', async () => {
    api.list.mockRejectedValue(new Error('403 Forbidden'))
    renderModal()

    expect(await screen.findByText('403 Forbidden')).toBeInTheDocument()
  })
})
