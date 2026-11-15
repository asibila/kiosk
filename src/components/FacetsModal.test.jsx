import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import FacetsModal from './FacetsModal.jsx'

const conditionQuestion = {
  id: '1',
  facet: 'condition',
  text: 'Condition',
  isGeneric: true,
  options: [
    { id: '8', text: 'New' },
    { id: '9', text: 'Used' },
  ],
}

const brandQuestion = {
  id: '2',
  facet: 'brand',
  text: 'Brand',
  isGeneric: false,
  options: [
    { id: '10', text: 'Apple' },
    { id: '11', text: 'Samsung' },
  ],
}

const screenQuestion = {
  id: '6',
  facet: 'screen_size',
  text: 'Screen size',
  isGeneric: false,
  options: [
    { id: '17', text: 'Under 6″' },
    { id: '18', text: '6–6.5″' },
  ],
}

const groups = [
  {
    key: 'all',
    title: 'All',
    ranges: [
      { facet: 'price', label: 'Price', unit: '€' },
      { facet: 'year', label: 'Year' },
    ],
    questions: [conditionQuestion],
  },
  { key: 'category-1', title: 'Electronics', questions: [brandQuestion] },
  { key: 'category-2', title: 'Mobile phones', questions: [screenQuestion] },
]

function renderModal(props = {}) {
  return render(
    <LanguageProvider>
      <FacetsModal
        groups={groups}
        answers={{}}
        rangeChips={[]}
        onToggle={vi.fn()}
        onRangeChange={vi.fn()}
        onClose={vi.fn()}
        {...props}
      />
    </LanguageProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('FacetsModal', () => {
  it('renders ALL first, then parent and selected category sections', () => {
    renderModal()

    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(titles).toEqual(['All', 'Electronics', 'Mobile phones'])
    expect(screen.getByRole('button', { name: 'New' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Samsung' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Under 6″' })).toBeInTheDocument()
  })

  it('adds a range chip from the ALL section', async () => {
    const onRangeChange = vi.fn()
    renderModal({ onRangeChange })

    const priceField = screen.getByText('Price').closest('.facets-question')
    const [min, max] = within(priceField).getAllByRole('spinbutton')
    fireEvent.change(min, { target: { value: '5000' } })
    fireEvent.change(max, { target: { value: '10000' } })
    fireEvent.click(within(priceField).getByRole('button', { name: 'Add' }))

    expect(onRangeChange).toHaveBeenCalledWith('price', {
      kind: 'range',
      facet: 'price',
      facetLabel: 'Price',
      min: 5000,
      max: 10000,
      unit: '€',
    })
  })

  it('toggles a value chip and shows the existing range', () => {
    const onToggle = vi.fn()
    renderModal({
      onToggle,
      rangeChips: [
        { kind: 'range', facet: 'year', facetLabel: 'Year', min: 2020, max: null },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Used' }))
    expect(onToggle).toHaveBeenCalledWith('1', '9')
    expect(screen.getByText('Year: from 2,020')).toBeInTheDocument()
  })
})
