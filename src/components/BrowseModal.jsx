// Filesystem-like browse modal: breadcrumbs, category/listing list, Buy/Sell footer.
import { useMemo, useState } from 'react'
import { ChevronRightIcon, XIcon, ThumbGlyph } from '../icons.jsx'

export default function BrowseModal({ data, onClose }) {
  const [currentId, setCurrentId] = useState('root')
  const [selectedId, setSelectedId] = useState(null)

  const node = data[currentId]
  const categories = node.items.filter((i) => i.type === 'category') // categories first
  const listings = node.items.filter((i) => i.type === 'listing') // listings after

  // Map "Home/Bikes" → category id, for breadcrumb navigation.
  const pathToId = useMemo(() => {
    const map = {}
    for (const [id, n] of Object.entries(data)) map[n.path.join('/')] = id
    return map
  }, [data])

  function navigate(id) {
    setCurrentId(id)
    setSelectedId(null)
  }

  function crumbClick(index) {
    const prefix = node.path.slice(0, index + 1).join('/')
    const id = pathToId[prefix]
    if (id) navigate(id)
  }

  // Single-select: clicking toggles; only one item selected at a time.
  function toggleSelect(id) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  function act(action) {
    if (!selectedId) {
      window.alert(`Please select an item before choosing "${action}".`)
      return
    }
    window.alert(`${action} complete — item id: ${selectedId}`)
  }

  const renderItem = (item) => (
    <li key={item.id}>
      <div
        className={selectedId === item.id ? 'browse-item selected' : 'browse-item'}
        role="button"
        tabIndex={0}
        aria-pressed={selectedId === item.id}
        onClick={() => toggleSelect(item.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            toggleSelect(item.id)
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
        {item.type === 'category' && (
          <button
            type="button"
            className="nav-btn"
            aria-label={`Open ${item.title}`}
            onClick={(e) => {
              e.stopPropagation()
              navigate(item.id)
            }}
          >
            <ChevronRightIcon size={16} />
          </button>
        )}
      </div>
    </li>
  )

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card wide" role="dialog" aria-modal="true" aria-label="Browse marketplace">
        <header className="modal-head">
          <h2>Browse</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <XIcon />
          </button>
        </header>

        <nav className="breadcrumb-bar" aria-label="Breadcrumb">
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
          {listings.map(renderItem)}
        </ul>

        <footer className="modal-footer">
          <button type="button" className="btn secondary" onClick={() => act('Buy')}>
            Buy
          </button>
          <button type="button" className="btn primary" onClick={() => act('Sell')}>
            Sell
          </button>
        </footer>
      </div>
    </div>
  )
}
