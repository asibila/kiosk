// Overlay drawer listing sessions → child chats (exactly 2 levels deep).
// Expansion state lives in App so it is preserved across open/close cycles.
import { Fragment } from 'react'
import { SessionGlyph, ChatIcon, ChevronDownIcon } from '../icons.jsx'

export default function Drawer({
  open,
  sessions,
  chats,
  expanded,
  selectedSessionId,
  selectedChatId,
  onSessionRowClick,
  onCaretClick,
  onChatRowClick,
}) {
  return (
    <aside
      className={open ? 'drawer open' : 'drawer'}
      aria-label="Sessions and chats"
      aria-hidden={open ? undefined : true}
      inert={open ? undefined : true}
    >
      <div className="drawer-head">
        <span className="drawer-title">Sessions</span>
      </div>

      <div className="drawer-list scrollable">
        {sessions.map((session) => {
          const childChats = chats.filter((c) => c.sessionId === session.id)
          const unread = childChats.reduce((n, c) => n + c.unread, 0)
          const isExpanded = !!expanded[session.id]
          const isSelected = selectedSessionId === session.id

          return (
            <Fragment key={session.id}>
              {/* Session row */}
              <div
                className={isSelected ? 'drawer-row selected' : 'drawer-row'}
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                onClick={() => onSessionRowClick(session.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSessionRowClick(session.id)
                  }
                }}
              >
                <span className="drawer-row-icon">
                  <SessionGlyph kind={session.icon} />
                </span>
                <span className="drawer-row-title">{session.title}</span>
                {unread > 0 && (
                  <span className="badge" aria-label={`${unread} unread messages`}>
                    {unread}
                  </span>
                )}
                <button
                  type="button"
                  className="caret-btn"
                  aria-label={isExpanded ? `Collapse ${session.title} chats` : `Expand ${session.title} chats`}
                  onClick={(e) => {
                    e.stopPropagation()
                    onCaretClick(session.id)
                  }}
                >
                  <ChevronDownIcon size={18} className={isExpanded ? 'caret open' : 'caret'} />
                </button>
              </div>

              {/* Child chats (depth 2) — flat siblings so each row stays
                  one wrapper level deep in the accessibility tree */}
              {isExpanded &&
                childChats.map((chat) => {
                  const chatSelected = selectedChatId === chat.id
                  return (
                    <div
                      key={chat.id}
                      className={chatSelected ? 'drawer-row chat-row selected' : 'drawer-row chat-row'}
                      role="button"
                      tabIndex={0}
                      onClick={() => onChatRowClick(chat.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          onChatRowClick(chat.id)
                        }
                      }}
                    >
                      <span className="drawer-row-icon">
                        <ChatIcon size={18} />
                      </span>
                      <span className="drawer-row-title">{chat.title}</span>
                      {chat.unread > 0 && <span className="badge">{chat.unread}</span>}
                    </div>
                  )
                })}
            </Fragment>
          )
        })}
      </div>
    </aside>
  )
}
