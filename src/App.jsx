// ─────────────────────────────────────────────────────────────
// STATE + APP SHELL — owns all interaction state and rules.
// Data comes from the NestJS CRUD API (see ../backend/API_ROUTES.md).
// ─────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { api, fetchKioskData } from './api.js'
import { buildViewModel, formatTime } from './viewModel.js'
import { AlertIcon, LayersIcon, XIcon } from './icons.jsx'
import TopBar from './components/TopBar.jsx'
import Drawer from './components/Drawer.jsx'
import SessionView from './components/SessionView.jsx'
import ChatView from './components/ChatView.jsx'
import BrowseModal from './components/BrowseModal.jsx'
import MessagesModal from './components/MessagesModal.jsx'
import SimpleModal from './components/SimpleModal.jsx'
import Home from './components/Home.jsx'
import Login from './components/Login.jsx'

const MODAL_TITLES = { settings: 'Settings', profile: 'Profile' }
const SETTINGS_BODY =
  'Appearance, notifications and privacy controls live here. Nothing is wired up yet — this panel is a placeholder.'

const THEME_KEY = 'kiosk-theme'
const LOGGED_IN_USER_ID_KEY = 'kiosk-user-id'

const EMPTY_BROWSE_DATA = { root: { path: ['Home'], items: [] } }

function getInitialTheme() {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage can be unavailable (private mode, blocked storage).
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getLoggedInUserId() {
  try {
    const stored = localStorage.getItem(LOGGED_IN_USER_ID_KEY)
    const id = stored ? Number(stored) : NaN
    return Number.isFinite(id) && id > 0 ? id : null
  } catch {
    return null
  }
}

function KioskApp() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [expanded, setExpanded] = useState({}) // sessionId -> boolean (preserved across drawer open/close)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [modal, setModal] = useState(null) // 'browse' | 'messages' | 'settings' | 'profile' | null
  const [theme, setTheme] = useState(getInitialTheme)

  // Backend data.
  const [dataStatus, setDataStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [user, setUser] = useState(null)
  const [sessions, setSessions] = useState([])
  const [chats, setChats] = useState([])
  const [browseData, setBrowseData] = useState(EMPTY_BROWSE_DATA)
  const [answers, setAnswers] = useState({}) // facet schema id -> facet value option id
  const [selections, setSelections] = useState([]) // raw facet-value-selections rows
  const [optionSchema, setOptionSchema] = useState({}) // option id -> schema id
  const [categoryListing, setCategoryListing] = useState({}) // category id -> first listing id
  const [savingQuestionId, setSavingQuestionId] = useState(null)
  const [notice, setNotice] = useState('')

  // The user who signed in at the kiosk; drives inbox/chats, sent-vs-received
  // messages, and the actor id used for writes.
  const loggedInUserId = getLoggedInUserId()

  // Load every resource the UI needs, then map it onto the session/chat model.
  useEffect(() => {
    let cancelled = false
    setDataStatus('loading')
    setLoadError('')

    fetchKioskData()
      .then((raw) => {
        if (cancelled) return
        const view = buildViewModel(raw, { userId: loggedInUserId })
        setUser(view.user)
        setSessions(view.sessions)
        setChats(view.chats)
        setBrowseData(view.browseData)
        setAnswers(view.answers)
        setSelections(view.selections)
        setOptionSchema(view.optionSchema)
        setCategoryListing(view.categoryListing)
        setDataStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setLoadError(err.message)
        setDataStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [reloadToken, loggedInUserId])

  // Keep the document in sync with the chosen theme and remember it for next time.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Ignore storage failures; the theme still applies for this session.
    }
  }, [theme])

  // Notices are transient; clear them after a few seconds.
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 6000)
    return () => clearTimeout(timer)
  }, [notice])

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

  // Replace the answer and persist it as a facet-value-selection on the
  // category's first listing. Existing selections are patched in place.
  async function answerQuestion(session, questionId, optionId) {
    if (answers[questionId] === optionId || savingQuestionId === questionId) return

    const previous = answers[questionId]
    const listingId = categoryListing[session.id] ?? null
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))

    if (!listingId) {
      setNotice('This category has no listing yet, so the answer is only kept in this browser.')
      return
    }

    const existing = selections.find(
      (selection) =>
        selection.listingId === listingId &&
        optionSchema[selection.facetValueOptionId] === Number(questionId),
    )

    setSavingQuestionId(questionId)
    try {
      if (existing) {
        const updated = await api.update(
          'facet-value-selections',
          existing.id,
          { facetValueOptionId: Number(optionId) },
          user?.id,
        )
        setSelections((prev) => prev.map((selection) => (selection.id === updated.id ? updated : selection)))
      } else {
        const created = await api.create(
          'facet-value-selections',
          { facetValueOptionId: Number(optionId), listingId },
          user?.id,
        )
        setSelections((prev) => [...prev, created])
      }
    } catch (err) {
      // Roll the chip back so the UI matches what the backend actually stored.
      setAnswers((prev) => {
        const next = { ...prev }
        if (previous == null) delete next[questionId]
        else next[questionId] = previous
        return next
      })
      setNotice(`Answer not saved: ${err.message}`)
    } finally {
      setSavingQuestionId(null)
    }
  }

  // Append the message locally right away, then persist it when it has text.
  async function sendMessage(chatId, message) {
    const chat = chats.find((c) => c.id === chatId)
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, message] } : c)),
    )

    if (!chat || !message.text) return

    try {
      const saved = await api.create(
        'chat-messages',
        { text: message.text, threadId: chat.threadId },
        user?.id,
      )
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === message.id
                    ? { ...m, id: `message-${saved.id}`, time: formatTime(saved.createdAt) }
                    : m,
                ),
              }
            : c,
        ),
      )
    } catch (err) {
      setNotice(`Message not saved to the backend: ${err.message}`)
    }
  }

  function openModal(name) {
    setModal(name)
    setDrawerOpen(false)
  }

  const selectedSession = sessions.find((s) => s.id === selectedSessionId) || null
  const selectedChat = chats.find((c) => c.id === selectedChatId) || null

  const profileBody =
    dataStatus === 'loading' ? (
      <p>Loading profile…</p>
    ) : user ? (
      <div className="profile-details">
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Role</dt>
            <dd>{user.role}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{user.isActive ? 'Active' : 'Inactive'}</dd>
          </div>
          <div>
            <dt>User ID</dt>
            <dd>{user.id}</dd>
          </div>
        </dl>
        <p className="profile-note">Loaded from the backend users table.</p>
      </div>
    ) : (
      <p>The backend has no users yet.</p>
    )

  return (
    <div className="app">
      <TopBar onMenu={toggleDrawer} onOpenModal={openModal} theme={theme} onToggleTheme={toggleTheme} />

      {notice && (
        <div className="app-notice" role="status">
          <AlertIcon size={18} />
          <span>{notice}</span>
          <button
            type="button"
            className="icon-btn notice-close"
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      <div className="app-body">
        <Drawer
          open={drawerOpen}
          sessions={sessions}
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
          {dataStatus === 'loading' ? (
            <LoadingPlaceholder />
          ) : dataStatus === 'error' ? (
            <ErrorPlaceholder message={loadError} onRetry={() => setReloadToken((n) => n + 1)} />
          ) : selectedChat ? (
            <ChatView chat={selectedChat} onSend={sendMessage} />
          ) : selectedSession ? (
            <SessionView
              session={selectedSession}
              answers={answers}
              onAnswer={(questionId, optionId) => answerQuestion(selectedSession, questionId, optionId)}
            />
          ) : (
            <EmptyPlaceholder hasSessions={sessions.length > 0} />
          )}
        </main>
      </div>

      {modal === 'browse' && <BrowseModal data={browseData} onClose={() => setModal(null)} />}
      {modal === 'messages' && (
        <MessagesModal sessions={sessions} chats={chats} onSend={sendMessage} onClose={() => setModal(null)} />
      )}
      {modal && modal !== 'browse' && modal !== 'messages' && (
        <SimpleModal
          title={MODAL_TITLES[modal]}
          body={modal === 'profile' ? profileBody : SETTINGS_BODY}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function LoadingPlaceholder() {
  return (
    <div className="placeholder" aria-busy="true">
      <span className="placeholder-icon">
        <LayersIcon size={56} />
      </span>
      <h2>Loading sessions…</h2>
      <p>Fetching categories, listings and conversations from the backend.</p>
    </div>
  )
}

function ErrorPlaceholder({ message, onRetry }) {
  return (
    <div className="placeholder">
      <span className="placeholder-icon error">
        <AlertIcon size={56} />
      </span>
      <h2>Cannot load data</h2>
      <p>{message}</p>
      <p>Make sure the backend is running on http://localhost:3000.</p>
      <button type="button" className="btn primary" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

function EmptyPlaceholder({ hasSessions }) {
  return (
    <div className="placeholder">
      <span className="placeholder-icon">
        <LayersIcon size={56} />
      </span>
      <h2>{hasSessions ? 'No session selected' : 'No sessions yet'}</h2>
      <p>
        {hasSessions
          ? 'Open the menu and pick a session or chat to get started.'
          : 'The backend has no categories, so there is nothing to interview yet.'}
      </p>
    </div>
  )
}

export default function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<KioskApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}
