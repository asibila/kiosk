import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import Drawer from './Drawer.jsx'

const user = { id: 1, name: 'Ana', email: 'ana@example.com', role: 'USER' }

function renderDrawer(props = {}) {
  return render(
    <MemoryRouter>
      <LanguageProvider initialLanguage="en" initialStrings={TEST_STRINGS}>
        <Drawer
          open
          onOpenSearch={vi.fn()}
          onOpenMyItems={vi.fn()}
          onOpenMessages={vi.fn()}
          onOpenSettings={vi.fn()}
          onOpenProfile={vi.fn()}
          onOpenSignups={vi.fn()}
          onSignOut={vi.fn()}
          user={user}
          {...props}
        />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('Drawer', () => {
  it('badges My items with the unread conversations on the user’s listings', () => {
    renderDrawer({ myItemsUnreadCount: 3 })

    const myItems = screen.getByRole('button', { name: /My items/ })
    expect(within(myItems).getByText('3')).toBeInTheDocument()
  })

  it('keeps My items plain when there are no seller-side unread chats', () => {
    renderDrawer({ unreadCount: 2 })

    const myItems = screen.getByRole('button', { name: /My items/ })
    expect(myItems.querySelector('.badge')).toBeNull()

    const messages = screen.getByRole('button', { name: /Messages/ })
    expect(within(messages).getByText('2')).toBeInTheDocument()
  })

  it('caps both badges at 99+', () => {
    renderDrawer({ unreadCount: 120, myItemsUnreadCount: 150 })

    const myItems = screen.getByRole('button', { name: /My items/ })
    expect(within(myItems).getByText('99+')).toBeInTheDocument()

    const messages = screen.getByRole('button', { name: /Messages/ })
    expect(within(messages).getByText('99+')).toBeInTheDocument()
  })
})
