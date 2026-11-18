// Privacy notice: what the marketplace stores, which cookies it sets and how a
// visitor can have their data removed. Linked from the signup form.
import { Link } from 'react-router'
import { useI18n } from '../i18n.jsx'

export default function Privacy() {
  const { t } = useI18n()
  const sections = ['data', 'cookies', 'retention', 'rights', 'contact']

  return (
    <section className="legal-page" aria-label={t('privacy.aria')}>
      <div className="legal-inner">
        <Link className="results-back" to="/search">
          {t('legal.back')}
        </Link>
        <h1>{t('privacy.title')}</h1>
        <p className="legal-intro">{t('privacy.intro')}</p>

        {sections.map((section) => (
          <article key={section}>
            <h2>{t(`privacy.${section}.title`)}</h2>
            <p>{t(`privacy.${section}.body`)}</p>
          </article>
        ))}

        <p className="legal-foot">{t('legal.updated')}</p>
      </div>
    </section>
  )
}
