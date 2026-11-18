// Breadcrumb trail shown directly below the topbar. The parent decides which
// trail applies to the current screen; an empty list renders nothing.
import { Link } from 'react-router'
import { ChevronRightIcon } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'

export default function Breadcrumbs({ items = [] }) {
  const { t } = useI18n()
  if (items.length === 0) return null

  return (
    <nav className="breadcrumbs" aria-label={t('breadcrumb.aria')}>
      <ol>
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`}>
              {last || !item.to ? (
                <span aria-current={last ? 'page' : undefined}>{item.label}</span>
              ) : (
                <Link to={item.to} onClick={item.onClick}>
                  {item.label}
                </Link>
              )}
              {!last && <ChevronRightIcon size={12} />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
