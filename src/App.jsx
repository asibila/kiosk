// ─────────────────────────────────────────────────────────────
// STATE + APP SHELL — owns all interaction state and rules
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { SESSIONS, CHATS_SEED, BROWSE_DATA } from './data.js'
import { LayersIcon } from './icons.jsx'
import TopBar from './components/TopBar.jsx'
import Drawer from './components/Drawer.jsx'
import SessionView from './components/SessionView.jsx'
import ChatView from './components/ChatView.jsx'
import BrowseModal from './components/BrowseModal.jsx'
import SimpleModal from './components/SimpleModal.jsx'

const MODAL_TITLES = { messages: 'Messages', settings: 'Settings', profile: 'Profile' }
const MODAL_BODIES = {
  messages: 'Your inbox is quiet for now. Updates from your sessions and chats will land here as they arrive.',
  settings: 'Appearance, notifications and privacy controls live here. Nothing is wired up yet — this panel is a placeholder.',
  profile: 'Signed in as demo user. Manage your account details, delivery addresses and payment methods from this panel.',
}

const THEME_KEY = 'kiosk-theme'

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage can be unavailable (private mode, blocked storage).
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expanded, setExpanded] = useState({}) // sessionId -> boolean (preserved across drawer open/close)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [chats, setChats] = useState(CHATS_SEED) // unread counts + in-memory messages
  const [answers, setAnswers] = useState({}) // questionId -> chosen option index
  const [modal, setModal] = useState(null) // 'browse' | 'messages' | 'settings' | 'profile' | null
  const [theme, setTheme] = useState(getInitialTheme)

  // Keep the document in sync with the chosen theme and remember it for next time.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Ignore storage failures; the theme still applies for this session.
    }
  }, [theme])

  // ESC closes the topmost layer: modal first, then the drawer.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (modal) {
        setModal(null)
        return
      }
      if (drawerOpen) setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, drawerOpen])

  function toggleDrawer() {
    setDrawerOpen((o) => !o)
  }

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  // (d) Caret: expand/collapse without touching selection; drawer stays open.
  function toggleSessionExpanded(sessionId) {
    setExpanded((prev) => ({ ...prev, [sessionId]: !prev[sessionId] }))
  }

  // (e) Session row click.
  function selectSession(sessionId) {
    const alreadySelected = selectedSessionId === sessionId && selectedChatId === null
    if (alreadySelected && expanded[sessionId]) {
      // Exception: toggle this session collapsed; stay selected, drawer stays open.
      setExpanded((prev) => ({ ...prev, [sessionId]: false }))
      return
    }
    setSelectedChatId(null)
    setSelectedSessionId(sessionId)
    setExpanded((prev) => {
      const next = {}
      for (const id of Object.keys(prev)) next[id] = false // collapse every other session
      next[sessionId] = true // auto-expand the clicked one
      return next
    })
    setDrawerOpen(false)
  }

  // (f) Chat row click.
  function selectChat(chatId) {
    const chat = chats.find((c) => c.id === chatId)
    if (!chat) return
    setSelectedSessionId(chat.sessionId) // parent session is highlighted too
    setSelectedChatId(chatId)
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c))) // reset unread
    setDrawerOpen(false)
  }

  // Replace the answer; clicking the same chip again is a no-op.
  function answerQuestion(questionId, optionIndex) {
    setAnswers((prev) => {
      if (prev[questionId] === optionIndex) return prev
      return { ...prev, [questionId]: optionIndex }
    })
  }

  // Append a message (text or attachment placeholder) to a chat, in memory.
  function sendMessage(chatId, message) {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, message] } : c)))
  }

  function openModal(name) {
    setModal(name)
    setDrawerOpen(false)
  }

  const selectedSession = SESSIONS.find((s) => s.id === selectedSessionId) || null
  const selectedChat = chats.find((c) => c.id === selectedChatId) || null

  return (
    <div className="app">
      <TopBar onMenu={toggleDrawer} onOpenModal={openModal} theme={theme} onToggleTheme={toggleTheme} />

      <div className="app-body">
        <Drawer
          open={drawerOpen}
          sessions={SESSIONS}
          chats={chats}
          expanded={expanded}
          selectedSessionId={selectedSessionId}
          selectedChatId={selectedChatId}
          onSessionRowClick={selectSession}
          onCaretClick={toggleSessionExpanded}
          onChatRowClick={selectChat}
        />

        {/* Clicking the main content (outside the drawer) closes it. */}
        <main className="main" onMouseDown={drawerOpen ? () => setDrawerOpen(false) : undefined}>
          {selectedChat ? (
            <ChatView chat={selectedChat} onSend={sendMessage} />
          ) : selectedSession ? (
            <SessionView session={selectedSession} answers={answers} onAnswer={answerQuestion} />
          ) : (
            <EmptyPlaceholder />
          )}
        </main>
      </div>

      {modal === 'browse' && <BrowseModal data={BROWSE_DATA} onClose={() => setModal(null)} />}
      {modal && modal !== 'browse' && (
        <SimpleModal title={MODAL_TITLES[modal]} body={MODAL_BODIES[modal]} onClose={() => setModal(null)} />
      )}
    </div>
  )
}

function EmptyPlaceholder() {
  return (
    <div className="placeholder">
      <span className="placeholder-icon">
        <LayersIcon size={56} />
      </span>
      <h2>No session selected</h2>
      <p>Open the menu and pick a session or chat to get started.</p>
    </div>
  )
}
