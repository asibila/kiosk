import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFacetSuggestions } from './useFacetSuggestions.js'

const suggestion = (valueId, label) => ({
  facet: 'brand',
  facetLabel: 'Brand',
  valueId,
  label,
  count: 1,
})

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useFacetSuggestions', () => {
  it('debounces typing and sends q, lang, category, orientation and chips', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ suggestions: [suggestion('1', 'Golf')] }),
    })
    const chips = [{ kind: 'value', facet: 'condition', valueId: '2' }]
    const { result, rerender } = renderHook((props) => useFacetSuggestions(props), {
      initialProps: {
        q: '',
        lang: 'en',
        categoryId: 2,
        orientation: 'sell',
        chips,
        debounceMs: 20,
      },
    })

    rerender({
      q: 'gol',
      lang: 'en',
      categoryId: 2,
      orientation: 'sell',
      chips,
      debounceMs: 20,
    })

    expect(fetch).not.toHaveBeenCalled()
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))

    const url = new URL(fetch.mock.calls[0][0], 'http://localhost')
    expect(url.pathname).toBe('/api/suggest')
    expect(url.searchParams.get('q')).toBe('gol')
    expect(url.searchParams.get('lang')).toBe('en')
    expect(url.searchParams.get('category')).toBe('2')
    expect(url.searchParams.get('orientation')).toBe('sell')
    expect(JSON.parse(url.searchParams.get('chips'))).toEqual(chips)

    await waitFor(() => expect(result.current.suggestions).toHaveLength(1))
  })

  it('does not fetch for an empty token', async () => {
    renderHook(() =>
      useFacetSuggestions({
        q: '   ',
        lang: 'en',
        chips: [],
        debounceMs: 0,
      }),
    )

    await act(async () => {
      await Promise.resolve()
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('discards a stale response when a newer request resolves first', async () => {
    const resolvers = {}
    fetch.mockImplementation(
      (url) =>
        new Promise((resolve) => {
          const query = new URL(url, 'http://localhost').searchParams.get('q')
          resolvers[query] = () =>
            resolve({
              ok: true,
              json: async () => ({ suggestions: [suggestion(query, query)] }),
            })
        }),
    )

    const { result, rerender } = renderHook((props) => useFacetSuggestions(props), {
      initialProps: { q: 'a', lang: 'en', chips: [], debounceMs: 0 },
    })
    await waitFor(() => expect(typeof resolvers.a).toBe('function'))

    rerender({ q: 'b', lang: 'en', chips: [], debounceMs: 0 })
    await waitFor(() => expect(typeof resolvers.b).toBe('function'))

    await act(async () => {
      resolvers.b()
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.suggestions[0]?.label).toBe('b'))

    // The older request resolves after the newer one; its result must be ignored.
    await act(async () => {
      resolvers.a()
      await Promise.resolve()
    })
    expect(result.current.suggestions[0]?.label).toBe('b')
  })
})
