// Listing completeness score: facetsCount / facetsCountMax as a percentage.
// Shown inline with the title as "(95)" or "(100)"; whole percent only.
import { useI18n } from '../i18n.jsx'

const asCount = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

export default function CompletenessScore({ answered = 0, total = 0 }) {
  const { t } = useI18n()
  const max = asCount(total)
  if (max === 0) return null

  const count = Math.min(asCount(answered), max)
  const ratio = count / max
  // Round to the nearest integer, but never round a value below 1 up to 100:
  // only a full ratio is 100.
  const percent = ratio >= 1 ? 100 : Math.min(99, Math.round(ratio * 100))
  const label = t('completeness.aria', { answered: count, total: max })

  return (
    <span
      className={ratio >= 1 ? 'completeness-score complete' : 'completeness-score'}
      title={label}
      aria-label={label}
    >
      ({percent})
    </span>
  )
}
