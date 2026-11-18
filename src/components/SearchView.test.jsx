import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '../i18n.jsx'
import { TEST_STRINGS } from '../test/strings.js'
import SearchView from './SearchView.jsx'

vi.mock('../useFacetSuggestions.js', () => ({
  useFacetSuggestions: () => ({ suggestions: [], loading: false, error: null }),
}))

const regions = [
  { id: 0, code: 'ALL', name: 'All regions' },
  { id: 4, code: 'HR', name: 'Croatia' },
  { id: 11, code: 'DE', name: 'Germany' },
]

function renderSearch(props = {}) {
  return render(
    <MemoryRouter initialEntries={['/search']}>
      <LanguageProvider initialLanguage="en" initialStrings={TEST_STRINGS}>
        <SearchView
          listings={[]}
          categories={[]}
          regions={regions}
          regionId={0}
          onRegionChange={() => {}}
          {...props}
        />
      </LanguageProvider>
    </MemoryRouter>,
  )
}

describe('SearchView region', () => {
  it('titles the page with the detected region', () => {
    renderSearch({ regionId: 11 })

    expect(
      screen.getByRole('button', { name: 'Search Germany' }),
    ).toBeInTheDocument()
  })

  it('says "Search all regions" for the global region', () => {
    renderSearch({ regionId: 0 })

    expect(
      screen.getByRole('button', { name: 'Search all regions' }),
    ).toBeInTheDocument()
  })

  it('opens a picker with All regions first and applies a choice', () => {
    const onRegionChange = vi.fn()
    renderSearch({ regionId: 4, onRegionChange })

    fireEvent.click(screen.getByRole('button', { name: 'Search Croatia' }))

    const dialog = screen.getByRole('dialog', { name: 'Choose region' })
    const options = within(within(dialog).getByRole('list')).getAllByRole('button')
    expect(options[0]).toHaveTextContent('All regions')
    expect(options.map((option) => option.textContent)).toEqual([
      'All regions',
      'Croatia',
      'Germany',
    ])

    fireEvent.click(within(dialog).getByRole('button', { name: 'Germany' }))

    expect(onRegionChange).toHaveBeenCalledWith(11)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sorts countries by their localized name, after All regions', () => {
    renderSearch({
      regionId: 0,
      regions: [
        { id: 0, code: 'ALL', name: 'All regions' },
        { id: 11, code: 'DE', name: 'Germany' },
        { id: 4, code: 'HR', name: 'Croatia' },
        { id: 12, code: 'AT', name: 'Austria' },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Search all regions' }))

    const dialog = screen.getByRole('dialog', { name: 'Choose region' })
    const options = within(within(dialog).getByRole('list')).getAllByRole('button')
    expect(options.map((option) => option.textContent)).toEqual([
      'All regions',
      'Austria',
      'Croatia',
      'Germany',
    ])
  })

  it('localizes the region names and title', () => {
    render(
      <MemoryRouter initialEntries={['/search']}>
        <LanguageProvider initialLanguage="hr" initialStrings={TEST_STRINGS}>
          <SearchView
            listings={[]}
            categories={[]}
            regions={[
              { id: 0, code: 'ALL', name: 'Sve regije' },
              { id: 11, code: 'DE', name: 'Njemačka' },
            ]}
            regionId={11}
          />
        </LanguageProvider>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('button', { name: 'Pretraga: Njemačka' }),
    ).toBeInTheDocument()
  })
})
