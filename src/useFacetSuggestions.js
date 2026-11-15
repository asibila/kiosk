// Debounced suggestion loader for the facet chip input.
// - waits 250 ms after the last keystroke
// - aborts the previous request when a new one starts
// - discards responses that are not the newest request
import { useEffect, useRef, useState } from 'react'
import { API_BASE } from './api.js'

/**
 * @param {object} options
 * @param {string} options.q
 * @param {string} options.lang
 * @param {number|string|undefined|null} [options.categoryId]
 * @param {'buy'|'sell'|null} [options.orientation]
 * @param {import('./facetTypes.js').Chip[]} options.chips
 * @param {number} [options.debounceMs]
 * @returns {{ suggestions: import('./facetTypes.js').Suggestion[], loading: boolean, error: string|null }}
 */
export function useFacetSuggestions({
  q,
  lang,
  categoryId,
  orientation = null,
  chips,
  debounceMs = 250,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const requestIdRef = useRef(0)
  const abortRef = useRef(null)
  const serializedChips = JSON.stringify(chips ?? [])

  useEffect(() => {
    const text = q.trim()
    requestIdRef.current += 1
    const requestId = requestIdRef.current
    abortRef.current?.abort()

    if (!text) {
      setSuggestions([])
      setLoading(false)
      setError(null)
      return undefined
    }

    const controller = new AbortController()
    abortRef.current = controller
    setSuggestions([])
    setLoading(true)
    setError(null)

    const timer = window.setTimeout(async () => {
      const params = new URLSearchParams({ q: text, lang })
      if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
        params.set('category', String(categoryId))
      }
      if (orientation) params.set('orientation', orientation)
      params.set('chips', serializedChips)

      try {
        const response = await fetch(`${API_BASE}/suggest?${params.toString()}`, {
          signal: controller.signal,
          headers: { accept: 'application/json' },
        })
        if (!response.ok) {
          throw new Error(`Suggestion request failed with ${response.status}`)
        }
        const body = await response.json()
        if (requestId !== requestIdRef.current || controller.signal.aborted) return

        const rows = Array.isArray(body?.suggestions) ? body.suggestions : []
        setSuggestions(
          rows.filter(
            (row) =>
              row &&
              typeof row.facet === 'string' &&
              typeof row.facetLabel === 'string' &&
              (typeof row.valueId === 'string' || typeof row.valueId === 'number') &&
              typeof row.label === 'string' &&
              typeof row.count === 'number',
          ),
        )
        setLoading(false)
      } catch (err) {
        if (requestId !== requestIdRef.current || controller.signal.aborted) return
        if (err instanceof DOMException && err.name === 'AbortError') return
        setSuggestions([])
        setError(err instanceof Error ? err.message : 'Suggestion request failed')
        setLoading(false)
      }
    }, debounceMs)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [q, lang, categoryId, orientation, serializedChips, debounceMs])

  return { suggestions, loading, error }
}
