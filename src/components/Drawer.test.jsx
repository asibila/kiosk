import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import Drawer from './Drawer.jsx'

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16v16H4z" /></svg>'

function listing(overrides = {}) {
  return {
    id: '10',
    listingId: 10,
    categoryId: 1,
    title: 'Trek bike',
    facetsCount: 1,
    facetsCountMax: 4,
    isActive: true,
    desc: '',
    answers: {},
    ...overrides,
  }
}

function renderDrawer(listings) {
  return render(
    <MemoryRouter>
      <LanguageProvider initialLanguage="en" initialStrings={TEST_STRINGS}>
        <Drawer
          open
          listings={listings}
          chats={[]}
          onListingClick={vi.fn()}
          onChatClick={vi.fn()}
          onDeleteListing={vi.fn()}
          onCreateNew={vi.fn()}
          onOpenMessages={vi.fn()}
          onOpenSettings={vi.fn()}
          onOpenSignups={vi.fn()}
          onSignOut={vi.fn()}
          user={{ id: 1, name: 'Ana', email: 'ana@example.com', role: 'USER' }}
        />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('Drawer listing rows', () => {
  it('draws the category icon stored on the listing', () => {
    const { container } = renderDrawer([listing({ iconSvg: ICON })])

    const icon = container.querySelector('.listing-row .category-icon')
    expect(icon).toBeInTheDocument()
    expect(icon.querySelector('path')).toHaveAttribute('d', 'M4 4h16v16H4z')
  })

  it('falls back to the generic tag glyph without an icon', () => {
    const { container } = renderDrawer([listing()])

    const row = container.querySelector('.listing-row')
    expect(row.querySelector('.category-icon')).toBeNull()
    expect(row.querySelector('.drawer-row-icon svg')).toBeInTheDocument()
  })

  it('keeps each row icon independent', () => {
    const { container } = renderDrawer([
      listing({ iconSvg: ICON }),
      listing({ id: '11', listingId: 11, title: 'Laptop' }),
    ])

    const rows = container.querySelectorAll('.listing-row')
    expect(rows[0].querySelector('.category-icon')).toBeInTheDocument()
    expect(rows[1].querySelector('.category-icon')).toBeNull()
  })
})
