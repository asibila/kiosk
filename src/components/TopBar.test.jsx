import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import TopBar from './TopBar.jsx'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hr', name: 'Hrvatski' },
]

function renderTopBar(props = {}) {
  return render(
    <MemoryRouter>
      <LanguageProvider initialLanguage="en" initialStrings={TEST_STRINGS}>
        <TopBar languages={languages} {...props} />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('TopBar', () => {
  it('switches the language from a dropdown', () => {
    renderTopBar()

    const select = screen.getByRole('combobox', { name: 'Language' })
    expect(select).toHaveValue('en')
    expect(screen.getByRole('option', { name: 'EN' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'HR' })).toBeInTheDocument()

    fireEvent.change(select, { target: { value: 'hr' } })
    expect(select).toHaveValue('hr')
  })

  it('fires onAddListing from the "+" button left of the language dropdown', () => {
    const onAddListing = vi.fn()
    renderTopBar({ onAddListing })

    const addButton = screen.getByRole('button', { name: 'Add listing' })
    const select = screen.getByRole('combobox', { name: 'Language' })
    expect(
      addButton.compareDocumentPosition(select) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    fireEvent.click(addButton)
    expect(onAddListing).toHaveBeenCalledTimes(1)
  })
})
