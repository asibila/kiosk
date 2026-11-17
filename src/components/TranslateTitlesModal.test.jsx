import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import TranslateTitlesModal from './TranslateTitlesModal.jsx'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'hr', name: 'Hrvatski' },
]

function renderModal(props = {}) {
  return render(
    <LanguageProvider initialStrings={TEST_STRINGS}>
      <TranslateTitlesModal
        languages={languages}
        titles={{ en: 'Bikes #33' }}
        fallbackTitle="Bikes #33"
        onSave={vi.fn()}
        onClose={vi.fn()}
        {...props}
      />
    </LanguageProvider>,
  )
}

describe('TranslateTitlesModal', () => {
  it('saves changed translations per language', async () => {
    const onSave = vi.fn().mockResolvedValue(null)
    const onClose = vi.fn()
    renderModal({ onSave, onClose })

    const [english, croatian] = screen.getAllByRole('textbox')
    expect(english.value).toBe('Bikes #33')
    expect(croatian.value).toBe('')

    fireEvent.change(croatian, { target: { value: 'Bicikli #33' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save translations' }))

    expect(onSave).toHaveBeenCalledWith('hr', 'Bicikli #33')
    expect(onSave).not.toHaveBeenCalledWith('en', expect.anything())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('disables saving when nothing changed', () => {
    renderModal()

    expect(
      screen.getByRole('button', { name: 'Save translations' }),
    ).toBeDisabled()
  })
})
