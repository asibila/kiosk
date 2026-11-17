import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import CompletenessScore from './CompletenessScore.jsx'

function renderScore(props = {}) {
  return render(
    <LanguageProvider initialStrings={TEST_STRINGS}>
      <CompletenessScore answered={2} total={4} {...props} />
    </LanguageProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('CompletenessScore', () => {
  it('shows the percentage inline', () => {
    renderScore()

    expect(screen.getByText('(50)')).toBeInTheDocument()
    expect(
      screen.getByLabelText('2 of 4 interview questions answered'),
    ).toBeInTheDocument()
  })

  it('rounds to at most two decimal places and trims trailing zeros', () => {
    renderScore({ answered: 2, total: 3 })
    expect(screen.getByText('(66.67)')).toBeInTheDocument()
  })

  it('shows 100 only when every question is answered', () => {
    const { container } = renderScore({ answered: 4, total: 4 })

    expect(screen.getByText('(100)')).toBeInTheDocument()
    expect(container.querySelector('.completeness-score.complete')).not.toBeNull()
  })

  it('does not round a nearly complete score up to 100', () => {
    renderScore({ answered: 9999, total: 10000 })

    expect(screen.getByText('(99.99)')).toBeInTheDocument()
  })

  it('shows zero when nothing is answered', () => {
    renderScore({ answered: 0, total: 3 })
    expect(screen.getByText('(0)')).toBeInTheDocument()
  })

  it('does not render when the category has no questions', () => {
    const { container } = renderScore({ answered: 0, total: 0 })

    expect(container).toBeEmptyDOMElement()
  })

  it('clamps the answered count to the total', () => {
    renderScore({ answered: 9, total: 4 })

    expect(screen.getByText('(100)')).toBeInTheDocument()
  })
})
