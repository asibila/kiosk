// One listing's conversations, one row per user who initiated contact.
// Opened from the message icon on a My items row.
import { useState } from 'react'
import { ChevronLeftIcon, MessageIcon, XIcon } from '../icons.jsx'
import { useI18n } from '../i18n.jsx'
import ChatView from './ChatView.jsx'

export default function ListingChatsModal({
  listing,
  chats = [],
  onSend,
  onChatRead,
  onActiveChatChange,
  liveStatus,
  onClose,
}) {
  const { t } = useI18n()
  const [activeChatId, setActiveChatId] = useState(null)
  const listingChats = chats.filter(
    (chat) => String(chat.listingId) === String(listing.listingId ?? listing.id),
  )
  const activeChat = listingChats.find((chat) => chat.id === activeChatId) || null

  function openChat(chatId) {
    setActiveChatId(chatId)
    onChatRead?.(chatId)
    onActiveChatChange?.(chatId)
  }

  function backToList() {
    setActiveChatId(null)
    onActiveChatChange?.(null)
  }

  function close() {
    onActiveChatChange?.(null)
    onClose()
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        className="modal-card messages"
        role="dialog"
        aria-modal="true"
        aria-label={t('messages.listingTitle', { title: listing.title })}
      >
        <header className={activeChat ? 'modal-head messages-head messages-head-thread' : 'modal-head messages-head'}>
          {activeChat ? (
            <div className="messages-head-left">
              <button type="button" className="icon-btn" aria-label={t('messages.back')} onClick={backToList}>
                <ChevronLeftIcon size={22} />
              </button>
              <h2>{t('messages.listingTitle', { title: listing.title })}</h2>
            </div>
          ) : (
            <>
              <span aria-hidden="true" />
              <h2>{t('messages.listingTitle', { title: listing.title })}</h2>
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
            {listingChats.length === 0 ? (
              <p className="messages-empty">{t('messages.emptyListing')}</p>
            ) : (
              <ul className="messages-list scrollable" aria-label={t('messages.listingThreads')}>
                {listingChats.map((chat) => {
                  const lastMessage = chat.messages[chat.messages.length - 1]
                  const unreadCount = chat.unread || 0
                  return (
                    <li key={chat.id}>
                      <button
                        type="button"
                        className={
                          unreadCount > 0
                            ? 'messages-row listing-row has-unread'
                            : 'messages-row listing-row'
                        }
                        onClick={() => openChat(chat.id)}
                      >
                        <span className="drawer-row-icon" aria-hidden="true">
                          <MessageIcon size={18} />
                        </span>
                        <span className="drawer-row-title">
                          <span>{chat.partnerName || t('chat.otherUser')}</span>
                          <span className="listing-row-desc">
                            {lastMessage ? lastMessage.text : t('drawer.noMessages')}
                          </span>
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
