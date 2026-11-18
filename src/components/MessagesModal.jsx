// Messages modal: inbox items (one per chat thread) -> thread view, with back navigation.
import { useState } from 'react'
import { ChevronLeftIcon, TagIcon, XIcon } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'
import ChatView from './ChatView.jsx'

export default function MessagesModal({
  inbox,
  chats,
  initialChatId = null,
  onSend,
  onChatRead,
  onActiveChatChange,
  liveStatus,
  onClose,
}) {
  const { t } = useI18n()
  const [activeChatId, setActiveChatId] = useState(initialChatId)
  const activeChat = (chats ?? []).find((c) => c.id === activeChatId) || null
  const chatById = new Map((chats ?? []).map((chat) => [chat.id, chat]))
  const items = inbox ?? []

  function openChat(chatId) {
    setActiveChatId(chatId)
    onChatRead?.(chatId)
    onActiveChatChange?.(chatId)
  }

  function backToInbox() {
    setActiveChatId(null)
    onActiveChatChange?.(null)
  }

  function close() {
    onActiveChatChange?.(null)
    onClose()
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <div className="modal-card messages" role="dialog" aria-modal="true" aria-label={t('messages.aria')}>
        <header className={activeChat ? 'modal-head messages-head messages-head-thread' : 'modal-head messages-head'}>
          {activeChat ? (
            <div className="messages-head-left">
              <button type="button" className="icon-btn" aria-label={t('messages.back')} onClick={backToInbox}>
                <ChevronLeftIcon size={22} />
              </button>
              <h2>{t('messages.title')}</h2>
            </div>
          ) : (
            <>
              <span aria-hidden="true" />
              <h2>{t('messages.title')}</h2>
            </>
          )}
          <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={close}>
            <XIcon />
          </button>
        </header>

        {activeChat ? (
          <div className="messages-panel slide-in-right" key={`chat-${activeChat.id}`}>
            <ChatView chat={activeChat} onSend={onSend} liveStatus={liveStatus} />
          </div>
        ) : (
          <div className="messages-panel slide-in-left" key="list">
            {items.length === 0 ? (
              <p className="messages-empty">{t('messages.empty')}</p>
            ) : (
              <ul className="messages-list scrollable" aria-label={t('messages.inbox')}>
                {items.map((item) => {
                  const chat = chatById.get(item.chatId)
                  const unreadCount = chat ? chat.unread : item.hasUnread ? 1 : 0
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={
                          unreadCount > 0
                            ? 'messages-row listing-row has-unread'
                            : 'messages-row listing-row'
                        }
                        onClick={() => openChat(item.chatId)}
                      >
                        <span className="drawer-row-icon" aria-hidden="true">
                          <TagIcon size={18} />
                        </span>
                        <span className="drawer-row-title">
                          <span>{item.title}</span>
                          {item.desc ? <span className="listing-row-desc">{item.desc}</span> : null}
                        </span>
                        {unreadCount > 0 && (
                          <span
                            className="badge"
                            aria-label={t('drawer.unread', { count: unreadCount })}
                            aria-live="polite"
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
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
