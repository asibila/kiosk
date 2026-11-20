import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FacetChipInput from './FacetChipInput.jsx'
import { useFacetSuggestions } from '../useFacetSuggestions.js'

vi.mock('../useFacetSuggestions.js', () => ({
  useFacetSuggestions: vi.fn(),
}))

const t = (key, vars = {}) => {
  const strings = {
    'facet.placeholder': 'Search by model, fuel, year…',
    'facet.suggestions': 'Suggestions',
    'facet.loading': 'Loading suggestions…',
    'facet.error': 'Couldn’t load suggestions',
    'facet.noMatch': 'No matching filter for “{text}”',
    'facet.remove': 'Remove {facetLabel} {label}',
    'facet.addRange': 'Add {label}',
    'facet.rangeMin': 'Min',
    'facet.rangeMax': 'Max',
    'facet.rangeApply': 'Add',
    'facet.rangeFrom': 'from {value}',
    'facet.rangeUpTo': 'up to {value}',
    'facet.rangeAny': 'any',
    'facet.resultCount.one': '{count} suggestion',
    'facet.resultCount.many': '{count} suggestions',
    'common.cancel': 'Cancel',
    'search.submit': 'Search',
  }
  return (strings[key] ?? key).replace(/\{(\w+)\}/g, (_, name) =>
    String(vars[name] ?? ''),
  )
}

const samsungSuggestion = {
  facet: 'brand',
  facetLabel: 'Brand',
  valueId: '4',
  label: 'Samsung',
  count: 12,
}

const samsungChip = {
  kind: 'value',
  facet: 'brand',
  facetLabel: 'Brand',
  valueId: '4',
  label: 'Samsung',
}

const fuelChip = {
  kind: 'value',
  facet: 'fuel',
  facetLabel: 'Fuel',
  valueId: '13',
  label: 'Diesel',
}

function Harness({ initialChips = [], onChange, ...props }) {
  const [chips, setChips] = useState(initialChips)
  return (
    <FacetChipInput
      chips={chips}
      onChange={(next) => {
        setChips(next)
        onChange?.(next)
      }}
      t={t}
      {...props}
    />
  )
}

function type(value) {
  const input = screen.getByTestId('facet-chip-input')
  fireEvent.change(input, { target: { value } })
  return input
}

beforeEach(() => {
  useFacetSuggestions.mockReturnValue({
    suggestions: [],
    loading: false,
    error: null,
  })
})

describe('FacetChipInput', () => {
  it('shows the matching item count in parentheses next to the label', async () => {
    useFacetSuggestions.mockReturnValue({
      suggestions: [samsungSuggestion],
      loading: false,
      error: null,
    })
    render(<Harness />)

    type('sam')

    const option = await screen.findByRole('option', { name: 'Samsung (12)' })
    expect(within(option).getByText('(12)')).toBeInTheDocument()
  })

  it('selects a suggestion, adds a chip, clears text and focuses the input', async () => {
    useFacetSuggestions.mockReturnValue({
      suggestions: [samsungSuggestion],
      loading: false,
      error: null,
    })
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    const input = type('sam')
    fireEvent.click(await screen.findByRole('option', { name: /Samsung/ }))

    expect(onChange).toHaveBeenCalledWith([samsungChip])
    expect(screen.getByText('BRAND: Samsung')).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('never adds a duplicate value chip', async () => {
    useFacetSuggestions.mockReturnValue({
      suggestions: [samsungSuggestion],
      loading: false,
      error: null,
    })
    const onChange = vi.fn()
    render(<Harness initialChips={[samsungChip]} onChange={onChange} />)

    type('sam')
    fireEvent.click(await screen.findByRole('option', { name: /Samsung/ }))

    expect(screen.getAllByText('BRAND: Samsung')).toHaveLength(1)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes the last chip on Backspace when the text is empty', () => {
    const onChange = vi.fn()
    render(<Harness initialChips={[samsungChip, fuelChip]} onChange={onChange} />)

    fireEvent.keyDown(screen.getByTestId('facet-chip-input'), { key: 'Backspace' })

    expect(onChange).toHaveBeenCalledWith([samsungChip])
    expect(screen.queryByText('FUEL: Diesel')).not.toBeInTheDocument()
  })

  it('moves the highlight with arrow keys and selects it with Enter', async () => {
    useFacetSuggestions.mockReturnValue({
      suggestions: [samsungSuggestion],
      loading: false,
      error: null,
    })
    render(<Harness />)

    const input = type('sam')
    const option = await screen.findByRole('option', { name: /Samsung/ })
    fireEvent.keyDown(input, { key: 'ArrowDown' })

    expect(input).toHaveAttribute('aria-activedescendant', option.id)
    expect(option).toHaveAttribute('aria-selected', 'true')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('BRAND: Samsung')).toBeInTheDocument()
    expect(input).toHaveValue('')
  })

  it('closes the dropdown on Escape but keeps chips and text', async () => {
    useFacetSuggestions.mockReturnValue({
      suggestions: [samsungSuggestion],
      loading: false,
      error: null,
    })
    render(<Harness initialChips={[samsungChip]} />)

    const input = type('sam')
    await screen.findByRole('option', { name: /Samsung/ })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(input).toHaveValue('sam')
    expect(screen.getByText('BRAND: Samsung')).toBeInTheDocument()
  })

  it('removes a chip through its ✕ button and fires onChange', () => {
    const onChange = vi.fn()
    render(<Harness initialChips={[samsungChip]} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Remove Brand Samsung' }))

    expect(onChange).toHaveBeenCalledWith([])
    expect(screen.queryByText('BRAND: Samsung')).not.toBeInTheDocument()
    expect(screen.getByTestId('facet-chip-input')).toHaveFocus()
  })

  it('shows the no-match row for an unmatched token', async () => {
    useFacetSuggestions.mockReturnValue({
      suggestions: [],
      loading: false,
      error: null,
    })
    const onUnmatchedToken = vi.fn()
    render(<Harness onUnmatchedToken={onUnmatchedToken} />)

    type('golf dizel')

    expect(
      await screen.findByText('No matching filter for “golf dizel”'),
    ).toBeInTheDocument()
    expect(onUnmatchedToken).toHaveBeenCalledWith('golf dizel')
  })

  it('renders the search button inside the compose box and submits', () => {
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    const button = screen.getByRole('button', { name: 'Search' })
    expect(button.closest('.facet-field')).not.toBeNull()

    fireEvent.click(button)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('scrolls the fixed-height box with arrow keys when no query is typed', () => {
    render(<Harness initialChips={[samsungChip, fuelChip]} />)

    const field = screen.getByTestId('facet-field')
    Object.defineProperty(field, 'clientHeight', { value: 34, configurable: true })
    Object.defineProperty(field, 'scrollHeight', { value: 150, configurable: true })
    const scrollBy = vi.fn()
    field.scrollBy = scrollBy

    const input = screen.getByTestId('facet-chip-input')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(scrollBy).toHaveBeenLastCalledWith({ top: 40, behavior: 'smooth' })

    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(scrollBy).toHaveBeenLastCalledWith({ top: -40, behavior: 'smooth' })
  })
})
