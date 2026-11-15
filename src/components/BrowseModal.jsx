// Category browser modal: breadcrumbs + category list, footer with OK/Cancel.
import { useMemo, useState } from 'react'
import { ChevronRightIcon, XIcon, ThumbGlyph } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'

export default function BrowseModal({ data, onClose, onPick, startId = 'root' }) {
  const { t } = useI18n()
  const [currentId, setCurrentId] = useState(data[startId] ? startId : 'root')

  const node = data[currentId]
  const categories = node.items.filter((i) => i.type === 'category') // categories only

  // Map "Home/Bikes" → category id, for breadcrumb navigation.
  const pathToId = useMemo(() => {
    const map = {}
    for (const [id, n] of Object.entries(data)) map[n.path.join('/')] = id
    return map
  }, [data])

  function navigate(id) {
    setCurrentId(id)
  }

  function crumbClick(index) {
    const prefix = node.path.slice(0, index + 1).join('/')
    const id = pathToId[prefix]
    if (id) navigate(id)
  }

  function pick() {
    onPick(currentId)
  }

  const renderItem = (item) => (
    <li key={item.id}>
      <div
        className="browse-item"
        role="button"
        tabIndex={0}
        aria-current="page"
        onClick={() => navigate(item.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            navigate(item.id)
          }
        }}
      >
        <span className="thumb">
          <ThumbGlyph kind={item.thumb} />
        </span>
        <div className="browse-item-main">
          <span className="browse-item-title">{item.title}</span>
          <p className="browse-item-desc">{item.desc}</p>
        </div>
        <button
          type="button"
          className="nav-btn"
          aria-label={t('browse.open', { title: item.title })}
          onClick={(e) => {
            e.stopPropagation()
            navigate(item.id)
          }}
        >
          <ChevronRightIcon size={16} />
        </button>
      </div>
    </li>
  )

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card wide" role="dialog" aria-modal="true" aria-label={t('browse.aria')}>
        <header className="modal-head">
          <h2>{t('browse.title')}</h2>
          <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={onClose}>
            <XIcon />
          </button>
        </header>

        <nav className="breadcrumb-bar" aria-label={t('browse.breadcrumb')}>
          {node.path.map((segment, i) => {
            const isCurrent = i === node.path.length - 1
            return (
              <span className="crumb-wrap" key={`${segment}-${i}`}>
                {i > 0 && (
                  <span className="crumb-sep" aria-hidden="true">
                    /
                  </span>
                )}
                <button
                  type="button"
                  className={isCurrent ? 'crumb current' : 'crumb'}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={() => crumbClick(i)}
                >
                  {segment}
                </button>
              </span>
            )
          })}
        </nav>

        <ul className="browse-list scrollable">
          {categories.map(renderItem)}
        </ul>

        <footer className="modal-footer">
          <button type="button" className="btn secondary" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn primary" onClick={pick}>
            {t('common.ok')}
          </button>
        </footer>
      </div>
    </div>
  )
}
