// Wizard edit screen: upload, preview, remove and prioritise listing images.
// Existing listings upload immediately; a brand-new listing keeps the picks
// locally (object URLs) and uploads them when Publish creates the listing.
import { ImageIcon, StarIcon, TrashIcon } from '../icons.jsx'

export default function EditListingView({
  session,
  images,
  onAddImages,
  onRemoveImage,
  onSetPrimary,
  uploading = false,
  actions,
}) {
  function handleFiles(event) {
    onAddImages(event.target.files)
    // Reset so picking the same file again still fires a change event.
    event.target.value = ''
  }

  return (
    <section className="wizard-view" aria-label="Edit listing">
      <header className="wizard-head">
        <span className="wizard-step">Step 2 of 3 · Edit</span>
        <h2 className="wizard-title">{session.title}</h2>
      </header>

      <div className="wizard-scroll scrollable">
        <div className="field-label-row">
          <span className="field-label" id="listing-images-label">
            Images
          </span>
          <span className="field-hint">
            {images.length === 0
              ? 'No images yet'
              : `${images.length} image${images.length === 1 ? '' : 's'}`}
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
                <span className="thumb-primary-badge">Primary</span>
              ) : (
                <button
                  type="button"
                  className="thumb-primary"
                  aria-label="Make primary image"
                  title="Make primary image"
                  onClick={() => onSetPrimary(image.id)}
                >
                  <StarIcon size={12} />
                </button>
              )}

              <button
                type="button"
                className="thumb-remove"
                aria-label={`Remove ${image.name}`}
                title="Remove image"
                onClick={() => onRemoveImage(image.id)}
              >
                <TrashIcon size={12} />
              </button>
            </figure>
          ))}

          <label className="thumb-add" htmlFor="listing-images">
            <ImageIcon size={20} />
            <span>{uploading ? 'Uploading…' : 'Add images'}</span>
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

        <p className="field-hint">
          The primary image is the thumbnail shown in search results.
        </p>
      </div>

      {actions ? (
        <footer className="wizard-footer">{actions}</footer>
      ) : (
        <footer className="wizard-footer" aria-hidden="true" />
      )}
    </section>
  )
}
