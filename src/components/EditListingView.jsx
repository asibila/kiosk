// Wizard edit screen: upload, preview, remove and prioritise listing images.
// Existing listings upload immediately; a brand-new listing keeps the picks
// locally (object URLs) and uploads them when Publish creates the listing.
import { useEffect, useState } from 'react'
import { ImageIcon, StarIcon, TrashIcon } from '../icons.jsx'
import { pluralKey, useI18n } from '../i18n.jsx'

export default function EditListingView({
  session,
  language,
  title = '',
  titlePlaceholder = '',
  savingTitle = false,
  onSaveTitle,
  onOpenTranslate,
  images,
  onAddImages,
  onRemoveImage,
  onSetPrimary,
  uploading = false,
  actions,
}) {
  const { t } = useI18n()
  const [titleValue, setTitleValue] = useState(title)

  // Follow the language switch and freshly saved titles.
  useEffect(() => {
    setTitleValue(title)
  }, [title, language])

  function commitTitle() {
    const trimmed = titleValue.trim()
    if (trimmed === '') {
      setTitleValue(title)
      return
    }
    if (trimmed !== title) onSaveTitle(trimmed)
  }

  function handleFiles(event) {
    onAddImages(event.target.files)
    // Reset so picking the same file again still fires a change event.
    event.target.value = ''
  }

  return (
    <section className="wizard-view" aria-label={t('wizard.editAria')}>
      <header className="wizard-head">
        <span className="wizard-step">{t('wizard.step2')}</span>
        <h2 className="wizard-title">{session.title}</h2>
      </header>

      <div className="wizard-scroll scrollable">
        <div className="title-field">
          <label className="field-label" htmlFor="listing-title">
            {t('wizard.title', { language: language.toUpperCase() })}
          </label>
          <div className="title-row">
            <input
              id="listing-title"
              className="chat-input"
              value={titleValue}
              placeholder={titlePlaceholder}
              maxLength={225}
              onChange={(event) => setTitleValue(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
                if (event.key === 'Escape') {
                  setTitleValue(title)
                  event.currentTarget.blur()
                }
              }}
            />
            <button
              type="button"
              className="btn secondary"
              onClick={onOpenTranslate}
              disabled={savingTitle}
            >
              {t('wizard.translate')}
            </button>
          </div>
          <p className="field-hint">
            {savingTitle ? t('wizard.titleSaving') : t('wizard.titleHint')}
          </p>
        </div>

        <div className="field-label-row">
          <span className="field-label" id="listing-images-label">
            {t('wizard.images')}
          </span>
          <span className="field-hint">
            {images.length === 0
              ? t('wizard.noImages')
              : t(pluralKey(images.length, 'wizard.imageCount'), { count: images.length })}
          </span>
        </div>

        <div className="thumb-grid" aria-labelledby="listing-images-label">
          {images.map((image) => (
            <figure
              className={image.isPrimary ? 'thumb-card is-primary' : 'thumb-card'}
              key={image.id}
            >
              <img src={image.url} alt={image.name} />

              {image.isPrimary ? (
                <span className="thumb-primary-badge">{t('wizard.primary')}</span>
              ) : (
                <button
                  type="button"
                  className="thumb-primary"
                  aria-label={t('wizard.makePrimary')}
                  title={t('wizard.makePrimary')}
                  onClick={() => onSetPrimary(image.id)}
                >
                  <StarIcon size={12} />
                </button>
              )}

              <button
                type="button"
                className="thumb-remove"
                aria-label={t('wizard.removeAria', { name: image.name })}
                title={t('wizard.removeImage')}
                onClick={() => onRemoveImage(image.id)}
              >
                <TrashIcon size={12} />
              </button>
            </figure>
          ))}

          <label className="thumb-add" htmlFor="listing-images">
            <ImageIcon size={20} />
            <span>{uploading ? t('wizard.uploading') : t('wizard.addImages')}</span>
            <input
              id="listing-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              disabled={uploading}
            />
          </label>
        </div>

        <p className="field-hint">{t('wizard.primaryHint')}</p>
      </div>

      {actions ? (
        <footer className="wizard-footer">{actions}</footer>
      ) : (
        <footer className="wizard-footer" aria-hidden="true" />
      )}
    </section>
  )
}
