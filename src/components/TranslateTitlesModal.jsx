// Modal for entering a listing title in every language configured in the
// Language table. Missing translations are allowed and fall back at render
// time, so only non-empty, changed values are saved.
import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../i18n.jsx'
import { XIcon } from '../icons.jsx'

export default function TranslateTitlesModal({
  languages = [],
  titles = {},
  fallbackTitle = '',
  onSave,
  onClose,
  saving = false,
}) {
  const { t } = useI18n()
  const [values, setValues] = useState({})

  useEffect(() => {
    const initial = {}
    for (const language of languages) {
      initial[language.code] = titles[language.code] ?? ''
    }
    setValues(initial)
  }, [languages, titles])

  const changed = useMemo(
    () =>
      languages
        .map((language) => ({
          language: language.code,
          title: (values[language.code] ?? '').trim(),
        }))
        .filter(
          ({ language, title }) => title !== '' && title !== (titles[language] ?? ''),
        ),
    [languages, titles, values],
  )

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  async function submit(event) {
    event.preventDefault()
    for (const row of changed) {
      await onSave(row.language, row.title)
    }
    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose()
      }}
    >
      <form
        className="modal-card wide"
        role="dialog"
        aria-modal="true"
        aria-label={t('translate.title')}
        onSubmit={submit}
      >
        <header className="modal-head">
          <h2>{t('translate.title')}</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label={t('common.close')}
            onClick={onClose}
            disabled={saving}
          >
            <XIcon />
          </button>
        </header>

        <div className="modal-body scrollable translate-list">
          <p className="field-hint">{t('translate.hint')}</p>
          {languages.map((language) => (
            <label key={language.code} className="translate-row">
              <span className="translate-language">
                {language.name}
                <span className="translate-code">{language.code.toUpperCase()}</span>
              </span>
              <input
                className="chat-input"
                value={values[language.code] ?? ''}
                placeholder={fallbackTitle}
                maxLength={225}
                onChange={(event) =>
                  setValues((prev) => ({
                    ...prev,
                    [language.code]: event.target.value,
                  }))
                }
              />
            </label>
          ))}
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="btn secondary"
            onClick={onClose}
            disabled={saving}
          >
            {t('common.cancel')}
          </button>
          <button type="submit" className="btn primary" disabled={saving || changed.length === 0}>
            {saving ? t('translate.saving') : t('translate.save')}
          </button>
        </footer>
      </form>
    </div>
  )
}
