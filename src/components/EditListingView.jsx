// Wizard edit screen: description compose area and image uploads.
// Images stay in the browser (object URLs); the backend has no image resource.
import { ImageIcon, TrashIcon } from '../icons.jsx'

export default function EditListingView({
  session,
  description,
  onDescriptionChange,
  images,
  onAddImages,
  onRemoveImage,
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
        <label className="field-label" htmlFor="listing-description">
          Description
        </label>
        <textarea
          id="listing-description"
          className="compose-area"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe your item — condition, extras, price…"
        />

        <div className="field-label-row">
          <span className="field-label" id="listing-images-label">
            Images
          </span>
          <span className="field-hint">
            {images.length === 0 ? 'None uploaded yet' : `${images.length} uploaded`}
          </span>
        </div>
        <div className="thumb-grid" aria-labelledby="listing-images-label">
          {images.map((image) => (
            <figure className="thumb-card" key={image.id}>
              <img src={image.url} alt={image.name} />
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
            <span>Add images</span>
            <input
              id="listing-images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
            />
          </label>
        </div>
      </div>

      {actions ? (
        <footer className="wizard-footer">{actions}</footer>
      ) : (
        <footer className="wizard-footer" aria-hidden="true" />
      )}
    </section>
  )
}
