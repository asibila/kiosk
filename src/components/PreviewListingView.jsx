// Wizard preview screen: answered facets and uploaded images.
import { useI18n } from '../i18n.jsx'

export default function PreviewListingView({ session, title, answers, images, actions }) {
  const { t } = useI18n()
  const answered = session.questions.filter((q) => answers[q.id] != null)

  return (
    <section className="wizard-view" aria-label={t('wizard.previewAria')}>
      <header className="wizard-head">
        <span className="wizard-step">{t('wizard.step3')}</span>
        <h2 className="wizard-title">{title || session.title}</h2>
      </header>

      <div className="wizard-scroll scrollable">
        <h3 className="preview-heading">{t('wizard.facets')}</h3>
        {answered.length === 0 ? (
          <p className="preview-empty">{t('wizard.noAnswers')}</p>
        ) : (
          <ul className="facet-list">
            {answered.map((question) => {
              const value = answers[question.id]
              const option = question.options?.find((o) => o.id === value)
              const text =
                question.type === 'numeric'
                  ? `${value}${question.unit ? ` ${question.unit}` : ''}`
                  : (option?.text ?? '—')
              return (
                <li key={question.id} className="facet-row">
                  <span className="facet-q">{question.text}</span>
                  <span className="chip selected">{text}</span>
                </li>
              )
            })}
          </ul>
        )}

        <h3 className="preview-heading">{t('wizard.images')}</h3>
        {images.length === 0 ? (
          <p className="preview-empty">{t('wizard.noUploads')}</p>
        ) : (
          <div className="thumb-grid">
            {images.map((image) => (
              <figure
                className={image.isPrimary ? 'thumb-card is-primary' : 'thumb-card'}
                key={image.id}
              >
                <img src={image.url} alt={image.name} />
                {image.isPrimary ? (
                  <span className="thumb-primary-badge">{t('wizard.primary')}</span>
                ) : null}
              </figure>
            ))}
          </div>
        )}
      </div>

      {actions ? (
        <footer className="wizard-footer">{actions}</footer>
      ) : (
        <footer className="wizard-footer" aria-hidden="true" />
      )}
    </section>
  )
}
