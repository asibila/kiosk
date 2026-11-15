// WhatsApp-like chat view: bubbles, paperclip popover picker, text input + send.
import { useEffect, useRef, useState } from 'react'
import {
  UserIcon,
  PaperclipIcon,
  SendIcon,
  ImageIcon,
  YoutubeIcon,
  PinIcon,
} from '../icons.jsx'
import { newId, nowTime } from '../utils.js'

const LIVE_LABEL = {
  live: 'Live',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
}

const ATTACH_OPTIONS = [
  { kind: 'image', label: 'Image', Icon: ImageIcon },
  { kind: 'youtube', label: 'YouTube video', Icon: YoutubeIcon },
  { kind: 'gps', label: 'GPS location', Icon: PinIcon },
]

const ATTACH_ICON = { image: ImageIcon, youtube: YoutubeIcon, gps: PinIcon }

export default function ChatView({ chat, onSend, liveStatus = 'connecting' }) {
  const [draft, setDraft] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerAreaRef = useRef(null) // DOM ref: paperclip + popover wrapper
  const scrollRef = useRef(null) // DOM ref: message scroller

  // Close the popover on outside click or ESC.
  useEffect(() => {
    if (!pickerOpen) return
    const onPointerDown = (e) => {
      if (pickerAreaRef.current && !pickerAreaRef.current.contains(e.target)) {
        setPickerOpen(false)
      }
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pickerOpen])

  // Keep the newest message in view (on send and on chat switch).
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.id, chat.messages.length])

  function sendText() {
    const text = draft.trim()
    if (!text) return
    onSend(chat.id, { id: newId('msg'), from: 'sent', text, time: nowTime() })
    setDraft('')
  }

  function attach(option) {
    onSend(chat.id, {
      id: newId('msg'),
      from: 'sent',
      attachment: { kind: option.kind, label: option.label },
      time: nowTime(),
    })
    setPickerOpen(false)
  }

  return (
    <section className="chat-view" aria-label={`Chat: ${chat.title}`}>
      <header className="chat-head">
        <span className="avatar" aria-hidden="true">
          <UserIcon size={20} />
        </span>
        <div>
          <div className="chat-head-text">Chatting with {chat.partnerName || 'the other user'}</div>
          <div className="chat-head-sub">
            {chat.title}
            <span className={`chat-live ${liveStatus}`} role="status">
              <span className="chat-live-dot" aria-hidden="true" />
              {LIVE_LABEL[liveStatus] || liveStatus}
            </span>
          </div>
        </div>
      </header>

      <div className="chat-scroll scrollable" role="log" aria-label="Messages" ref={scrollRef}>
        {chat.messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <footer className="chat-input-row">
        <div className="attach-wrap" role="group" aria-label="Attach" ref={pickerAreaRef}>
          <button
            type="button"
            className="icon-btn"
            aria-label="Attach file"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((o) => !o)}
          >
            <PaperclipIcon />
          </button>
          {pickerOpen && (
            <div className="picker" role="menu" aria-label="Attachment type">
              {ATTACH_OPTIONS.map(({ kind, label, Icon }) => (
                <button key={kind} type="button" className="picker-item" role="menuitem" onClick={() => attach({ kind, label })}>
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          className="chat-input"
          type="text"
          placeholder="Type a message…"
          maxLength={225}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              sendText()
            }
          }}
          aria-label="Message text"
        />

        <button type="button" className="send-btn" aria-label="Send message" onClick={sendText} disabled={!draft.trim()}>
          <SendIcon size={18} />
        </button>
      </footer>
    </section>
  )
}

function MessageBubble({ message }) {
  const sent = message.from === 'sent'
  return (
    <div className={sent ? 'bubble-row sent' : 'bubble-row'}>
      <div className={sent ? 'bubble sent' : 'bubble received'}>
        {message.attachment ? <AttachmentBubble attachment={message.attachment} /> : <span>{message.text}</span>}
        <span className="bubble-time">{message.time}</span>
      </div>
    </div>
  )
}

function AttachmentBubble({ attachment }) {
  const Icon = ATTACH_ICON[attachment.kind] || ImageIcon
  return (
    <span className="attachment">
      <Icon size={16} />
      <span>{attachment.label} — placeholder</span>
    </span>
  )
}
