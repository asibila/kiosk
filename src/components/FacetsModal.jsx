// "Filter" modal: the interview questions (facet schemas) with their option
// chips, used to refine the /search results. Answers stay local to the screen.
import { useEffect } from 'react'
import { XIcon } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'

export default function FacetsModal({ sessions, answers, onToggle, onClose }) {
  const { t } = useI18n()
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const groups = sessions.filter((session) => (session.questions ?? []).length > 0)

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
            {groups.map((session) => (
              <section key={session.id} className="facets-group">
                <h3 className="facets-group-title">{session.title}</h3>
                {session.questions.map((question) => (
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
                ))}
              </section>
            ))}
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
