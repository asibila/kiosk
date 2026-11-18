// Terms of service: short, plain-language terms for using the marketplace.
// Linked from the signup form before the account is created.
import { Link } from 'react-router'
import { useI18n } from '../i18n.jsx'

export default function Terms() {
  const { t } = useI18n()
  const sections = ['account', 'content', 'conduct', 'liability', 'changes']

  return (
    <section className="legal-page" aria-label={t('terms.aria')}>
      <div className="legal-inner">
        <Link className="results-back" to="/search">
          {t('legal.back')}
        </Link>
        <h1>{t('terms.title')}</h1>
        <p className="legal-intro">{t('terms.intro')}</p>

        {sections.map((section) => (
          <article key={section}>
            <h2>{t(`terms.${section}.title`)}</h2>
            <p>{t(`terms.${section}.body`)}</p>
          </article>
        ))}

        <p className="legal-foot">{t('legal.updated')}</p>
      </div>
    </section>
  )
}
