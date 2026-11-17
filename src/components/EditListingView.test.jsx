import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import EditListingView from './EditListingView.jsx'

const session = { title: 'Bikes' }

function renderView(props = {}) {
  return render(
    <LanguageProvider initialStrings={TEST_STRINGS}>
      <EditListingView
        session={session}
        language="en"
        title="Bikes #33"
        titlePlaceholder="Bikes #33"
        onSaveTitle={vi.fn()}
        onOpenTranslate={vi.fn()}
        images={[]}
        onAddImages={vi.fn()}
        onRemoveImage={vi.fn()}
        onSetPrimary={vi.fn()}
        {...props}
      />
    </LanguageProvider>,
  )
}

describe('EditListingView', () => {
  it('prefills the title and saves it on blur', () => {
    const onSaveTitle = vi.fn()
    renderView({ onSaveTitle })

    const input = screen.getByLabelText('Title (EN)')
    expect(input.value).toBe('Bikes #33')

    fireEvent.change(input, { target: { value: 'Trail bike' } })
    fireEvent.blur(input)

    expect(onSaveTitle).toHaveBeenCalledWith('Trail bike')
  })

  it('opens the translate dialog', () => {
    const onOpenTranslate = vi.fn()
    renderView({ onOpenTranslate })

    fireEvent.click(screen.getByRole('button', { name: 'Translate' }))
    expect(onOpenTranslate).toHaveBeenCalled()
  })
})
