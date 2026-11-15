// Structured search input for the kiosk marketplace.
//
// The field holds committed chips (facet values or numeric ranges) plus the
// token currently being typed. Suggestions come from GET /api/suggest and are
// scoped to the current language, category, direction and chips. Only facet
// values are ever committed; the component never stores free text.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { SearchIcon, TagIcon, XIcon } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'
import {
  chipKey,
  formatRange,
  isRangeChip,
  isValueChip,
  localeFor,
} from '../facetTypes.js'
import { useFacetSuggestions } from '../useFacetSuggestions.js'

/**
 * @param {object} props
 * @param {import('../facetTypes.js').Chip[]} [props.chips]
 * @param {(chips: import('../facetTypes.js').Chip[]) => void} [props.onChange]
 * @param {string} [props.lang]
 * @param {number|string|null} [props.categoryId]
 * @param {'buy'|'sell'|null} [props.orientation]
 * @param {(text: string) => void} [props.onCommitText]
 * @param {(text: string) => void} [props.onUnmatchedToken]
 * @param {(count: number|null) => void} [props.onResultsCount]
 * @param {(key: string, vars?: Record<string, unknown>) => string} [props.t]
 * @param {string} [props.placeholder]
 */
export default function FacetChipInput({
  chips = [],
  onChange,
  lang = 'en',
  categoryId,
  orientation = null,
  onCommitText,
  onUnmatchedToken,
  onResultsCount,
  t: tProp,
  placeholder,
}) {
  const i18n = useI18n()
  const t = tProp ?? i18n.t

  const [currentText, setCurrentText] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(null)
  const [selectedChipIndex, setSelectedChipIndex] = useState(null)

  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const unmatchedRef = useRef(null)
  const listboxId = useId()

  const { suggestions, loading, error } = useFacetSuggestions({
    q: currentText,
    lang,
    categoryId,
    orientation,
    chips,
  })

  const visibleSuggestions = suggestions.slice(0, 10)
  const hasText = currentText.trim().length > 0
  const showDropdown = isOpen && hasText

  const groups = useMemo(() => {
    const byFacet = new Map()
    visibleSuggestions.forEach((suggestion, index) => {
      const group = byFacet.get(suggestion.facet) ?? {
        facet: suggestion.facet,
        facetLabel: suggestion.facetLabel,
        items: [],
      }
      group.items.push({ suggestion, index })
      byFacet.set(suggestion.facet, group)
    })
    return [...byFacet.values()]
  }, [visibleSuggestions])

  // A new result set starts without a pre-highlighted row.
  useEffect(() => {
    setHighlightedIndex(null)
  }, [suggestions])

  // Keep the selected chip valid when the parent removes chips.
  useEffect(() => {
    if (selectedChipIndex != null && selectedChipIndex >= chips.length) {
      setSelectedChipIndex(null)
    }
  }, [chips.length, selectedChipIndex])

  // Close on any click outside the component.
  useEffect(() => {
    if (!isOpen) return undefined
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [isOpen])

  // Announce result count changes through the parent, or locally when the
  // component is used standalone.
  useEffect(() => {
    if (!onResultsCount) return
    onResultsCount(showDropdown && !loading && !error ? visibleSuggestions.length : null)
  }, [onResultsCount, showDropdown, loading, error, visibleSuggestions.length])

  // Report an unmatched token once per settled query.
  useEffect(() => {
    const token = currentText.trim()
    if (!showDropdown || loading || error || !token || visibleSuggestions.length > 0) {
      return
    }
    if (unmatchedRef.current === token) return
    unmatchedRef.current = token
    onUnmatchedToken?.(token)
  }, [
    showDropdown,
    loading,
    error,
    visibleSuggestions.length,
    currentText,
    onUnmatchedToken,
  ])

  function focusInput() {
    inputRef.current?.focus()
  }

  /** Add a chip (or focus the existing one) and clear the typed token. */
  function commitChip(chip) {
    if (isValueChip(chip)) {
      const existingIndex = chips.findIndex(
        (candidate) => isValueChip(candidate) && candidate.valueId === chip.valueId,
      )
      if (existingIndex >= 0) {
        setSelectedChipIndex(existingIndex)
        setCurrentText('')
        setIsOpen(false)
        focusInput()
        return
      }
      // A facet holds one value per listing: replace the previous value.
      const next = chips.filter(
        (candidate) => !(isValueChip(candidate) && candidate.facet === chip.facet),
      )
      onChange?.([...next, chip])
    } else {
      const next = chips.filter(
        (candidate) => !(isRangeChip(candidate) && candidate.facet === chip.facet),
      )
      onChange?.([...next, chip])
    }

    setCurrentText('')
    setHighlightedIndex(null)
    setSelectedChipIndex(null)
    setIsOpen(false)
    focusInput()
  }

  function selectSuggestion(suggestion) {
    commitChip({
      kind: 'value',
      facet: suggestion.facet,
      facetLabel: suggestion.facetLabel,
      valueId: suggestion.valueId,
      label: suggestion.label,
    })
  }

  function removeChip(index) {
    onChange?.(chips.filter((_, i) => i !== index))
    setSelectedChipIndex(null)
    focusInput()
  }

  function selectChip(index) {
    setSelectedChipIndex(index)
    setIsOpen(false)
    focusInput()
  }

  function handleKeyDown(event) {
    if (selectedChipIndex != null && (event.key === 'Backspace' || event.key === 'Delete')) {
      event.preventDefault()
      removeChip(selectedChipIndex)
      return
    }

    if (event.key === 'ArrowDown') {
      if (visibleSuggestions.length === 0) return
      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((previous) =>
        previous == null ? 0 : (previous + 1) % visibleSuggestions.length,
      )
      return
    }

    if (event.key === 'ArrowUp') {
      if (visibleSuggestions.length === 0) return
      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((previous) =>
        previous == null
          ? visibleSuggestions.length - 1
          : (previous - 1 + visibleSuggestions.length) % visibleSuggestions.length,
      )
      return
    }

    if (event.key === 'Enter') {
      if (highlightedIndex != null && visibleSuggestions[highlightedIndex]) {
        event.preventDefault()
        selectSuggestion(visibleSuggestions[highlightedIndex])
        return
      }
      const text = currentText.trim()
      if (text) {
        event.preventDefault()
        onCommitText?.(text)
        setIsOpen(false)
        setHighlightedIndex(null)
      }
      return
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
      setHighlightedIndex(null)
      return
    }

    if (event.key === 'Tab') {
      if (showDropdown && visibleSuggestions.length > 0) {
        event.preventDefault()
        selectSuggestion(visibleSuggestions[0])
      }
      return
    }

    if (event.key === 'Backspace' && currentText === '' && chips.length > 0) {
      event.preventDefault()
      removeChip(chips.length - 1)
    }
  }

  function handleInputChange(event) {
    const value = event.target.value
    setCurrentText(value)
    setSelectedChipIndex(null)
    setHighlightedIndex(null)
    setIsOpen(value.trim().length > 0)
  }

  function handleBlur(event) {
    if (rootRef.current && event.relatedTarget && !rootRef.current.contains(event.relatedTarget)) {
      setIsOpen(false)
    }
  }

  const liveMessage = loading
    ? t('facet.loading')
    : !error && showDropdown
      ? t(`facet.resultCount.${visibleSuggestions.length === 1 ? 'one' : 'many'}`, {
          count: visibleSuggestions.length,
        })
      : ''

  return (
    <div className="facet-chip-input" ref={rootRef}>
      <div className="facet-input-shell">
        <div className="facet-field-wrap">
          <div
            className="facet-field"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                event.preventDefault()
                focusInput()
              }
            }}
          >
            <SearchIcon size={18} />

            <div
              className="facet-flow"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  event.preventDefault()
                  focusInput()
                }
              }}
            >
              {chips.map((chip, index) => {
                const label = isValueChip(chip)
                  ? `${chip.facetLabel}: ${chip.label}`
                  : `${chip.facetLabel}: ${formatRange(chip, lang, t)}`
                const removalLabel = isValueChip(chip)
                  ? chip.label
                  : formatRange(chip, lang, t)
                return (
                  <span
                    key={chipKey(chip)}
                    className={
                      selectedChipIndex === index ? 'facet-chip selected' : 'facet-chip'
                    }
                    role="button"
                    tabIndex={-1}
                    title={label}
                    onClick={() => selectChip(index)}
                  >
                    <span className="facet-chip-text">{label}</span>
                    <button
                      type="button"
                      className="facet-chip-remove"
                      aria-label={t('facet.remove', {
                        facetLabel: chip.facetLabel,
                        label: removalLabel,
                      })}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={(event) => {
                        event.stopPropagation()
                        removeChip(index)
                      }}
                    >
                      <XIcon size={12} />
                    </button>
                  </span>
                )
              })}

              <input
                ref={inputRef}
                type="text"
                className="facet-input"
                value={currentText}
                placeholder={chips.length === 0 ? placeholder ?? t('facet.placeholder') : undefined}
                aria-label={t('facet.inputLabel')}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showDropdown}
                aria-controls={listboxId}
                aria-activedescendant={
                  showDropdown && highlightedIndex != null
                    ? `${listboxId}-option-${highlightedIndex}`
                    : undefined
                }
                style={{
                  width: currentText
                    ? `${Math.max(currentText.length + 1, 4)}ch`
                    : chips.length > 0
                      ? '2ch'
                      : '100%',
                }}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                data-testid="facet-chip-input"
              />
            </div>
          </div>

          {showDropdown && (
            <div
              className="facet-dropdown"
              id={listboxId}
              role="listbox"
              aria-label={t('facet.suggestions')}
            >
              {loading ? (
                <div className="facet-loading" aria-hidden="true">
                  <span className="facet-skeleton" />
                  <span className="facet-skeleton" />
                  <span className="facet-skeleton" />
                </div>
              ) : error ? (
                <p className="facet-message facet-error">{t('facet.error')}</p>
              ) : visibleSuggestions.length === 0 ? (
                <p className="facet-message">
                  {t('facet.noMatch', { text: currentText.trim() })}
                </p>
              ) : (
                groups.map((group) => (
                  <div className="facet-group" key={group.facet} role="presentation">
                    <div className="facet-group-head" role="presentation">
                      <TagIcon size={13} />
                      <span>{group.facetLabel}</span>
                    </div>
                    {group.items.map(({ suggestion, index }) => (
                      <button
                        key={`${suggestion.facet}:${suggestion.valueId}`}
                        type="button"
                        id={`${listboxId}-option-${index}`}
                        className={
                          highlightedIndex === index
                            ? 'facet-option highlighted'
                            : 'facet-option'
                        }
                        role="option"
                        aria-selected={highlightedIndex === index}
                        title={suggestion.label}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        onClick={() => selectSuggestion(suggestion)}
                      >
                        <span className="facet-option-label">
                          {highlightMatch(suggestion.label, currentText)}
                        </span>
                        <span className="facet-option-count">
                          {new Intl.NumberFormat(localeFor(lang)).format(suggestion.count)}
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {!onResultsCount && (
        <span className="sr-only" aria-live="polite">
          {liveMessage}
        </span>
      )}
    </div>
  )
}

/** Bold the matched part of a suggestion label. */
function highlightMatch(label, query) {
  const needle = query.trim()
  if (!needle) return label
  const index = label.toLocaleLowerCase().indexOf(needle.toLocaleLowerCase())
  if (index < 0) return label
  return (
    <>
      {label.slice(0, index)}
      <strong>{label.slice(index, index + needle.length)}</strong>
      {label.slice(index + needle.length)}
    </>
  )
}
