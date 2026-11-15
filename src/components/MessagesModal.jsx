// Messages modal: session inbox → chat screen (slides in), with back navigation.
import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, SessionGlyph, XIcon } from '../icons.jsx'
import ChatView from './ChatView.jsx'

export default function MessagesModal({ sessions, chats, onSend, onClose }) {
  const [activeChatId, setActiveChatId] = useState(null)
  const activeChat = chats.find((c) => c.id === activeChatId) || null

  // Only sessions that actually have a conversation appear in the inbox.
  const inboxSessions = sessions.filter((session) => chats.some((chat) => chat.sessionId === session.id))

  // A session row opens its first conversation.
  function openSession(sessionId) {
    const sessionChats = chats.filter((c) => c.sessionId === sessionId)
    if (!sessionChats.length) return
    setActiveChatId(sessionChats[0].id)
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card messages" role="dialog" aria-modal="true" aria-label="Messages">
        <header className="modal-head messages-head">
          {activeChat ? (
            <button
              type="button"
              className="icon-btn"
              aria-label="Back to messages"
              onClick={() => setActiveChatId(null)}
            >
              <ChevronLeftIcon />
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <h2>Messages</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <XIcon />
          </button>
        </header>

        {activeChat ? (
          <div className="messages-panel slide-in-right" key={`chat-${activeChat.id}`}>
            <ChatView chat={activeChat} onSend={onSend} />
          </div>
        ) : (
          <div className="messages-panel slide-in-left" key="list">
            {inboxSessions.length === 0 ? (
              <p className="messages-empty">No conversations yet.</p>
            ) : (
              <ul className="messages-list scrollable" aria-label="Conversations">
                {inboxSessions.map((session) => {
                  const unread = chats
                    .filter((c) => c.sessionId === session.id)
                    .reduce((n, c) => n + c.unread, 0)

                  return (
                    <li key={session.id}>
                      <button type="button" className="messages-row" onClick={() => openSession(session.id)}>
                        <span className="drawer-row-icon">
                          <SessionGlyph kind={session.icon} />
                        </span>
                        <span className="drawer-row-title">{session.title}</span>
                        {unread > 0 && (
                          <span className="badge" aria-label={`${unread} unread messages`}>
                            {unread}
                          </span>
                        )}
                        <span className="messages-row-chevron" aria-hidden="true">
                          <ChevronRightIcon size={18} />
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
