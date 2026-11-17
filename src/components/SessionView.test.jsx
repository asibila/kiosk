import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import SessionView from './SessionView.jsx'

const session = {
  title: 'Mobile phones',
  icon: 'laptop',
  questions: [
    {
      id: '1',
      facet: 'condition',
      text: 'Condition',
      hint: 'Choose one of the options.',
      priority: 1,
      options: [
        { id: '8', text: 'New' },
        { id: '9', text: 'Used' },
      ],
    },
    {
      id: 'price',
      facet: 'price',
      kind: 'number',
      text: 'Price',
      hint: 'Enter the asking price.',
      unit: '€',
      min: 0,
      step: 0.01,
      priority: 2,
      options: [],
    },
    {
      id: 'year',
      facet: 'year',
      kind: 'number',
      text: 'Year',
      hint: 'Enter the model year.',
      min: 0,
      step: 1,
      priority: 3,
      options: [],
    },
  ],
}

function renderSession(props = {}) {
  return render(
    <LanguageProvider initialStrings={TEST_STRINGS}>
      <SessionView
        session={session}
        answers={{}}
        onAnswer={vi.fn()}
        actions={null}
        {...props}
      />
    </LanguageProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('SessionView numeric questions', () => {
  it('renders price and year inputs alongside option chips', () => {
    renderSession()

    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Price' })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Year' })).toBeInTheDocument()
  })

  it('submits a numeric answer', () => {
    const onAnswer = vi.fn()
    renderSession({ onAnswer })

    const priceForm = screen.getByRole('form', { name: 'Price' })
    fireEvent.change(within(priceForm).getByRole('spinbutton'), {
      target: { value: '199.99' },
    })
    fireEvent.click(within(priceForm).getByRole('button', { name: 'Save' }))

    expect(onAnswer).toHaveBeenCalledWith('price', 199.99)
  })

  it('shows an existing numeric answer and can clear it', () => {
    const onAnswer = vi.fn()
    renderSession({ onAnswer, answers: { price: 199.99 } })

    const priceForm = screen.getByRole('form', { name: 'Price' })
    expect(within(priceForm).getByRole('spinbutton')).toHaveValue(199.99)

    fireEvent.click(within(priceForm).getByRole('button', { name: 'Clear' }))
    expect(onAnswer).toHaveBeenCalledWith('price', null)
  })
})
