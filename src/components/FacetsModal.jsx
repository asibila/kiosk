// "Filter" modal: the facet sections (ALL + category ancestors + selected
// category) with their option chips and generic range facets (price, year).
// Answers and ranges are held by the search screen and stay local to it.
import { useEffect, useState } from 'react'
import { XIcon } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'
import { formatRange } from '../facetTypes.js'

function RangeFacetField({ facet, value, lang, onChange }) {
  const { t } = useI18n()
  const [min, setMin] = useState(value?.min != null ? String(value.min) : '')
  const [max, setMax] = useState(value?.max != null ? String(value.max) : '')

  // Keep the inputs in sync when the chip is added, changed or removed.
  useEffect(() => {
    setMin(value?.min != null ? String(value.min) : '')
    setMax(value?.max != null ? String(value.max) : '')
  }, [value])

  function submit(event) {
    event.preventDefault()
    if (min.trim() === '' && max.trim() === '') {
      if (value) onChange(facet.facet, null)
      return
    }

    const minValue = min.trim() === '' ? null : Number(min)
    const maxValue = max.trim() === '' ? null : Number(max)
    const parsedMin = Number.isFinite(minValue) ? minValue : null
    const parsedMax = Number.isFinite(maxValue) ? maxValue : null
    if (parsedMin == null && parsedMax == null) return

    onChange(facet.facet, {
      kind: 'range',
      facet: facet.facet,
      facetLabel: facet.label,
      min: parsedMin != null && parsedMax != null && parsedMin > parsedMax ? parsedMax : parsedMin,
      max: parsedMin != null && parsedMax != null && parsedMin > parsedMax ? parsedMin : parsedMax,
      ...(facet.unit ? { unit: facet.unit } : {}),
    })
  }

  const canApply = min.trim() !== '' || max.trim() !== ''

  return (
    <div className="facets-question facets-range">
      <span className="facet-q">{facet.label}</span>
      <form className="facets-range-form" onSubmit={submit}>
        <label>
          <span>{t('facet.rangeMin')}</span>
          <input
            type="number"
            inputMode="decimal"
            value={min}
            onChange={(event) => setMin(event.target.value)}
          />
        </label>
        <span className="facets-range-dash" aria-hidden="true">
          –
        </span>
        <label>
          <span>{t('facet.rangeMax')}</span>
          <input
            type="number"
            inputMode="decimal"
            value={max}
            onChange={(event) => setMax(event.target.value)}
          />
        </label>
        <button type="submit" className="btn secondary facets-range-apply" disabled={!canApply && !value}>
          {value ? t('facet.rangeUpdate') : t('facet.rangeApply')}
        </button>
        {value && (
          <button
            type="button"
            className="btn secondary facets-range-clear"
            onClick={() => onChange(facet.facet, null)}
          >
            {t('facet.rangeClear')}
          </button>
        )}
      </form>
      {value && (
        <span className="facets-range-active">
          {facet.label}: {formatRange(value, lang, t)}
        </span>
      )}
    </div>
  )
}

export default function FacetsModal({
  groups = [],
  answers = {},
  rangeChips = [],
  onToggle,
  onRangeChange,
  onClose,
}) {
  const { language, t } = useI18n()

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Required questions come first, then the numeric ranges, then the optional
  // questions. This keeps the shared first four in a fixed order even when a
  // category adds more generic facets: orientation, condition, price, year.
  function renderQuestion(question) {
    return (
      <div key={question.id} className="facets-question">
        <span className="facet-q">{question.text}</span>
        <div className="chips" role="group" aria-label={question.text}>
          {question.options.map((option) => (
            <button
              key={option.id}
              type="button"
              className={answers[question.id] === option.id ? 'chip selected' : 'chip'}
              aria-pressed={answers[question.id] === option.id}
              onClick={() => onToggle(question.id, option.id)}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card wide" role="dialog" aria-modal="true" aria-label={t('facets.aria')}>
        <header className="modal-head">
          <h2>{t('facets.title')}</h2>
          <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={onClose}>
            <XIcon />
          </button>
        </header>

        {groups.length === 0 ? (
          <p className="facets-empty">{t('facets.empty')}</p>
        ) : (
          <div className="facets-list scrollable">
            {groups.map((group) => {
              const questions = group.questions ?? []
              const requiredQuestions = questions.filter((question) => question.required)
              const optionalQuestions = questions.filter((question) => !question.required)

              return (
                <section key={group.key} className="facets-group">
                  <h3 className="facets-group-title">{group.title}</h3>

                  {requiredQuestions.map(renderQuestion)}

                  {(group.ranges ?? []).map((facet) => (
                    <RangeFacetField
                      key={facet.facet}
                      facet={facet}
                      value={rangeChips.find((chip) => chip.facet === facet.facet)}
                      lang={language}
                      onChange={onRangeChange}
                    />
                  ))}

                  {optionalQuestions.map(renderQuestion)}
                </section>
              )
            })}
          </div>
        )}

        <footer className="modal-footer">
          <button type="button" className="btn primary" onClick={onClose}>
            {t('facets.done')}
          </button>
        </footer>
      </div>
    </div>
  )
}
