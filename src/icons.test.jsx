import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  CategoryIcon,
  InterviewGlyph,
  ThumbGlyph,
} from './icons.jsx'

const STORED =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16v16H4z" /></svg>'

describe('CategoryIcon', () => {
  it('renders the inline SVG stored on the category', () => {
    const { container } = render(<CategoryIcon svg={STORED} size={32} />)

    const wrapper = container.querySelector('.category-icon')
    expect(wrapper).toHaveStyle({ width: '32px', height: '32px' })
    expect(wrapper).toHaveAttribute('aria-hidden', 'true')
    expect(wrapper.querySelector('svg')).toHaveAttribute(
      'viewBox',
      '0 0 24 24',
    )
    expect(wrapper.querySelector('path')).toHaveAttribute('d', 'M4 4h16v16H4z')
  })

  it('refuses unsafe markup and draws the fallback glyph', () => {
    const { container } = render(
      <CategoryIcon svg={'<svg viewBox="0 0 24 24" onload="alert(1)" />'} />,
    )

    expect(container.querySelector('.category-icon')).toBeNull()
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.innerHTML).not.toContain('onload')
  })

  it('ignores empty or non-string values', () => {
    const { container } = render(<CategoryIcon svg="   " />)

    expect(container.querySelector('.category-icon')).toBeNull()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('ThumbGlyph and InterviewGlyph', () => {
  it('prefers the stored SVG over the kind', () => {
    const { container } = render(<ThumbGlyph kind="laptop" svg={STORED} />)

    expect(container.querySelector('.category-icon path')).toHaveAttribute(
      'd',
      'M4 4h16v16H4z',
    )
  })

  it('keeps the kind glyph when there is no SVG', () => {
    const { container } = render(<ThumbGlyph kind="bike" />)

    expect(container.querySelector('.category-icon')).toBeNull()
    expect(container.querySelectorAll('circle')).toHaveLength(3)
  })

  it('lets interviews fall back to their original glyph', () => {
    const { container } = render(<InterviewGlyph kind="sneaker" />)

    expect(container.querySelector('.category-icon')).toBeNull()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
