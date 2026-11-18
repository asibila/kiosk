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

  it('keeps only the menu, language and theme controls', () => {
    renderTopBar()

    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Switch to dark mode' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Add listing' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Open profile' }),
    ).not.toBeInTheDocument()
  })
})
