// Interview session view: progress bar, question cards with wrapping chips,
// and an action bar (buy/sell chips, search, publish) at the bottom.
import { CheckIcon, SessionGlyph } from '../icons.jsx'

export default function SessionView({ session, answers, onAnswer, actions }) {
  // Sort by priority ascending (Array#sort is stable).
  const questions = [...session.questions].sort((a, b) => a.priority - b.priority)
  const answeredCount = questions.filter((q) => answers[q.id] != null).length
  const pct = questions.length ? (answeredCount / questions.length) * 100 : 0

  return (
    <section className="session-view" aria-label={`${session.title} interview`}>
      <header className="session-head">
        <div className="session-title-row">
          <span className="drawer-row-icon">
            <SessionGlyph kind={session.icon} />
          </span>
          <h2 className="session-title">{session.title}</h2>
        </div>
        <div className="progress-row">
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Questions answered"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={answeredCount}
          >
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="progress-text">
            {answeredCount} / {questions.length} answered
          </span>
        </div>
      </header>

      <div className="session-scroll scrollable">
        {questions.length === 0 ? (
          <p className="session-empty">
            This category has no interview questions yet. Facet schemas added to it in the backend will
            appear here.
          </p>
        ) : (
          questions.map((q) => {
            const chosen = answers[q.id]
            const isAnswered = chosen != null
            return (
              <article key={q.id} className={isAnswered ? 'q-card answered' : 'q-card'}>
                <header className="q-head">
                  <h3 className="q-text">{q.text}</h3>
                  {isAnswered && (
                    <span className="check-badge" title="Answered">
                      <CheckIcon size={13} />
                    </span>
                  )}
                </header>
                <p className="q-hint">{q.hint}</p>
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
              </article>
            )
          })
        )}
      </div>

      {/* Action bar (buy/sell chips + search/publish) when provided by the parent. */}
      {actions ? (
        <footer className="session-footer">{actions}</footer>
      ) : (
        <footer className="session-footer" aria-hidden="true" />
      )}
    </section>
  )
}
