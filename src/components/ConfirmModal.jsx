// Confirmation dialog for destructive actions (for example deleting a listing).
import { AlertIcon, XIcon } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'

export default function ConfirmModal({
  title,
  message,
  detail,
  confirmLabel,
  busyLabel,
  busy = false,
  onConfirm,
  onClose,
}) {
  const { t } = useI18n()
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose()
      }}
    >
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={onClose} disabled={busy}>
            <XIcon />
          </button>
        </header>

        <div className="modal-body">
          <p className="confirm-message">
            <AlertIcon size={18} />
            <span>{message}</span>
          </p>
          {detail && <p className="confirm-detail">{detail}</p>}
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn danger" onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}
