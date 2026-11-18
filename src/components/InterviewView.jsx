// Interview view: progress bar, question cards with wrapping chips, numeric
// questions for price/year, and an action bar (search, publish) at the bottom.
import { useEffect, useState } from 'react'
import { CheckIcon, InterviewGlyph } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'

function NumberQuestion({ question, value, onAnswer }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(value != null ? String(value) : '')

  useEffect(() => {
    setDraft(value != null ? String(value) : '')
  }, [value])

  function submit(event) {
    event.preventDefault()
    const trimmed = draft.trim()
    if (trimmed === '') {
      onAnswer(question.id, null)
      return
    }
    const number = Number(trimmed)
    if (Number.isFinite(number)) onAnswer(question.id, number)
  }

  return (
    <form className="q-number-form" aria-label={question.text} onSubmit={submit}>
      <input
        className="q-number-input"
        type="number"
        inputMode={question.step === 0.01 ? 'decimal' : 'numeric'}
        min={question.min ?? 0}
        step={question.step ?? 1}
        value={draft}
        aria-label={question.text}
        onChange={(event) => setDraft(event.target.value)}
      />
      {question.unit && <span className="q-number-unit">{question.unit}</span>}
      <button type="submit" className="btn secondary q-number-save">
        {t('interview.saveAnswer')}
      </button>
      {value != null && (
        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            setDraft('')
            onAnswer(question.id, null)
          }}
        >
          {t('facet.rangeClear')}
        </button>
      )}
    </form>
  )
}

export default function InterviewView({ interview, answers, onAnswer, actions }) {
  const { t } = useI18n()
  // Sort by priority ascending (Array#sort is stable).
  const questions = [...interview.questions].sort((a, b) => a.priority - b.priority)
  const answeredCount = questions.filter((q) => answers[q.id] != null).length
  const pct = questions.length ? (answeredCount / questions.length) * 100 : 0

  return (
    <section
      className="interview-view"
      aria-label={t('interview.aria', { title: interview.title })}
    >
      <header className="interview-head">
        <div className="interview-title-row">
          <span className="drawer-row-icon">
            <InterviewGlyph kind={interview.icon} svg={interview.iconSvg} />
          </span>
          <h2 className="interview-title">{interview.title}</h2>
        </div>
        <div className="progress-row">
          <div
            className="progress-track"
            role="progressbar"
            aria-label={t('interview.questionsAnswered')}
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={answeredCount}
          >
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="progress-text">
            {t('interview.answered', { answered: answeredCount, total: questions.length })}
          </span>
        </div>
      </header>

      <div className="interview-scroll scrollable">
        {questions.length === 0 ? (
          <p className="interview-empty">{t('interview.empty')}</p>
        ) : (
          questions.map((q) => {
            const chosen = answers[q.id]
            const isAnswered = chosen != null
            return (
              <article key={q.id} className={isAnswered ? 'q-card answered' : 'q-card'}>
                <header className="q-head">
                  <h3 className="q-text">{q.text}</h3>
                  {q.required && (
                    <span className="q-required" title={t('interview.required')}>
                      {t('interview.required')}
                    </span>
                  )}
                  {isAnswered && (
                    <span className="check-badge" title={t('interview.answeredTitle')}>
                      <CheckIcon size={13} />
                    </span>
                  )}
                </header>
                <p className="q-hint">{q.hint}</p>
                {q.type === 'numeric' ? (
                  <NumberQuestion question={q} value={chosen} onAnswer={onAnswer} />
                ) : (
                  <div className="chips">
                    {q.options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={chosen === option.id ? 'chip selected' : 'chip'}
                        aria-pressed={chosen === option.id}
                        onClick={() => onAnswer(q.id, option.id)}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>

      {/* Action bar (search/publish) when provided by the parent. */}
      {actions ? (
        <footer className="interview-footer">{actions}</footer>
      ) : (
        <footer className="interview-footer" aria-hidden="true" />
      )}
    </section>
  )
}
