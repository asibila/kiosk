// Simple centered modal card used for Settings / Profile / report dialogs.
import { XIcon } from '../icons.jsx'

export default function SimpleModal({ title, body, footer, onClose }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <XIcon />
          </button>
        </header>
        <div className="modal-body scrollable">{body}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  )
}
