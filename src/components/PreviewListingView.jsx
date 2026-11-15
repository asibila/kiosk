// Wizard preview screen: answered facets, description and uploaded images.
export default function PreviewListingView({ session, answers, description, images, actions }) {
  const answered = session.questions.filter((q) => answers[q.id] != null)

  return (
    <section className="wizard-view" aria-label="Preview listing">
      <header className="wizard-head">
        <span className="wizard-step">Step 3 of 3 · Preview</span>
        <h2 className="wizard-title">{session.title}</h2>
      </header>

      <div className="wizard-scroll scrollable">
        <h3 className="preview-heading">Facets</h3>
        {answered.length === 0 ? (
          <p className="preview-empty">No questions answered.</p>
        ) : (
          <ul className="facet-list">
            {answered.map((question) => {
              const option = question.options.find((o) => o.id === answers[question.id])
              return (
                <li key={question.id} className="facet-row">
                  <span className="facet-q">{question.text}</span>
                  <span className="chip selected">{option?.text ?? '—'}</span>
                </li>
              )
            })}
          </ul>
        )}

        <h3 className="preview-heading">Description</h3>
        {description.trim() ? (
          <p className="preview-desc">{description}</p>
        ) : (
          <p className="preview-empty">No description added.</p>
        )}

        <h3 className="preview-heading">Images</h3>
        {images.length === 0 ? (
          <p className="preview-empty">No images uploaded.</p>
        ) : (
          <div className="thumb-grid">
            {images.map((image) => (
              <figure className="thumb-card" key={image.id}>
                <img src={image.url} alt={image.name} />
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
