// ─────────────────────────────────────────────────────────────
// STATE + APP SHELL — owns all interaction state and rules.
// Data comes from the NestJS CRUD API (see ../backend/API_ROUTES.md).
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { api, CHAT_EVENTS_URL, fetchKioskData } from './api.js'
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
import ListingsModal from './components/ListingsModal.jsx'
import ConfirmModal from './components/ConfirmModal.jsx'
import EditListingView from './components/EditListingView.jsx'
import PreviewListingView from './components/PreviewListingView.jsx'

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
  const [inbox, setInbox] = useState([])
  const [browseData, setBrowseData] = useState(EMPTY_BROWSE_DATA)
  const [answers, setAnswers] = useState({}) // facet schema id -> facet value option id
  const [selections, setSelections] = useState([]) // raw facet-value-selections rows
  const [optionSchema, setOptionSchema] = useState({}) // option id -> schema id
  const [categoryListing, setCategoryListing] = useState({}) // category id -> first listing id
  const [savingQuestionId, setSavingQuestionId] = useState(null)
  const [notice, setNotice] = useState('')
  const [listingsModal, setListingsModal] = useState(null) // { title, listings } | null
  const [contactingListingId, setContactingListingId] = useState(null)
  const [myListings, setMyListings] = useState([]) // listings owned by the logged-in user
  const [selectedListingId, setSelectedListingId] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [categoryDirty, setCategoryDirty] = useState(false) // category changed via browse OK
  const [pendingDelete, setPendingDelete] = useState(null) // listing awaiting confirmation
  const [deleting, setDeleting] = useState(false)
  const [listingDirection, setListingDirection] = useState(null) // 'buy' | 'sell' | null

  // Listing wizard: interview → edit (description + images) → preview → report.
  const [wizardStage, setWizardStage] = useState('interview') // 'interview' | 'edit' | 'preview'
  const [draftDescription, setDraftDescription] = useState('')
  const [draftImages, setDraftImages] = useState([]) // { id, name, url } (browser-local previews)

  // Live-chat connection + latest values looked up by the SSE handler without
  // re-subscribing on every render.
  const [liveStatus, setLiveStatus] = useState('connecting') // 'connecting' | 'live' | 'reconnecting'
  const selectedChatIdRef = useRef(null)
  const chatsRef = useRef([])
  const inboxRef = useRef([])
  const myListingsRef = useRef([])
  selectedChatIdRef.current = selectedChatId
  chatsRef.current = chats
  inboxRef.current = inbox
  myListingsRef.current = myListings

  // Conversation currently open inside the Messages modal (if any); its messages
  // count as read, so live badges do not grow while the user is looking at it.
  const [modalChatId, setModalChatId] = useState(null)
  const modalChatIdRef = useRef(null)
  modalChatIdRef.current = modalChatId

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
        setInbox(view.inbox ?? [])
        setMyListings(view.myListings)
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

  // Live chat: consume the backend's SSE stream. New messages for a known
  // thread are appended in place; messages for an unseen thread trigger a full
  // reload so a newly started conversation becomes visible too.
  useEffect(() => {
    if (!user?.id) return undefined

    const source = new EventSource(CHAT_EVENTS_URL)
    let opened = false
    setLiveStatus('connecting')

    source.onopen = () => {
      setLiveStatus('live')
      // After a dropped connection, reload once so messages sent while the
      // stream was down are not lost (SSE does not replay past events here).
      if (opened) setReloadToken((n) => n + 1)
      opened = true
    }
    source.onerror = () => setLiveStatus('reconnecting')

    source.onmessage = (event) => {
      let payload
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }

      if (payload.type !== 'message.created' && payload.type !== 'message.updated') return
      const message = payload.message
      if (!message || typeof message.threadId !== 'number') return

      if (!chatsRef.current.some((chat) => chat.threadId === message.threadId)) {
        setReloadToken((n) => n + 1)
        return
      }

      setChats((prev) =>
        prev.map((chat) => {
          if (chat.threadId !== message.threadId) return chat

          const id = `message-${message.id}`
          const exists = chat.messages.some((m) => m.id === id)
          if (exists) {
            if (payload.type !== 'message.updated') return chat
            return {
              ...chat,
              messages: chat.messages.map((m) =>
                m.id === id
                  ? { ...m, text: message.text, time: formatTime(message.createdAt) }
                  : m,
              ),
            }
          }

          const mine = message.userId === user.id
          const liveMessage = {
            id,
            from: mine ? 'sent' : 'received',
            text: message.text,
            time: formatTime(message.createdAt),
          }
          const unread =
            mine ||
            selectedChatIdRef.current === chat.id ||
            modalChatIdRef.current === chat.id
              ? chat.unread
              : Math.max(chat.unread, 1)

          return { ...chat, unread, messages: [...chat.messages, liveMessage] }
        }),
      )
    }

    return () => source.close()
  }, [user?.id])

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
      if (pendingDelete) {
        if (!deleting) setPendingDelete(null)
        return
      }
      if (modal) {
        setModal(null)
        return
      }
      if (drawerOpen) setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, drawerOpen, pendingDelete, deleting])

  function toggleDrawer() {
    setDrawerOpen((o) => !o)
  }

  function toggleTheme() {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  // Start a fresh listing: clear the current category, listing, interview
  // answers and wizard draft locally. This deliberately makes no API calls; the
  // next Publish creates a new listing instead of updating the selected one.
  function startNewListing() {
    setDrawerOpen(false)
    setModal(null)
    setListingsModal(null)
    setPendingDelete(null)
    setSelectedListingId(null)
    setSelectedChatId(null)
    setSelectedSessionId(null)
    setCategoryDirty(false)
    setAnswers({})
    setListingDirection(null)
    setWizardStage('interview')
    resetDraft()
    setNotice('')
  }

  // Wizard draft lives in the browser only; object URLs are released on reset.
  function resetDraft() {
    setDraftDescription('')
    setDraftImages((prev) => {
      for (const image of prev) {
        try {
          URL.revokeObjectURL(image.url)
        } catch {
          // revokeObjectURL can throw on an invalid URL; ignore.
        }
      }
      return []
    })
  }

  function addImages(fileList) {
    const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) return
    setDraftImages((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    ])
  }

  function removeImage(imageId) {
    setDraftImages((prev) => {
      const image = prev.find((item) => item.id === imageId)
      if (image?.url) {
        try {
          URL.revokeObjectURL(image.url)
        } catch {
          // Ignore invalid URLs.
        }
      }
      return prev.filter((item) => item.id !== imageId)
    })
  }

  // (g) Browse modal: OK adopts the browsed category as the current one; Cancel just closes.
  // Sessions are categories, so adopting a category means selecting the matching session,
  // whose questions are that category's facet schemas. Start with unanswered questions.
  function handleBrowsePick(categoryId) {
    setModal(null)
    const node = browseData[categoryId]
    if (!node || node.path.length < 2) return // root path is not a category
    const targetSession = sessions.find((s) => String(s.categoryId) === String(categoryId))
    if (!targetSession) return
    const alreadyCurrent = selectedSessionId === String(targetSession.id)

    setSelectedListingId(null)
    setAnswers((prev) => {
      const next = { ...prev }
      for (const question of targetSession.questions ?? []) delete next[question.id]
      return next
    })
    setListingDirection(null)

    selectSession(String(targetSession.id))
    // Re-picking the category the session already has is not a change.
    setCategoryDirty(!alreadyCurrent)
  }

  // Listings for a direction, filtered by the answered questions (facets) of
  // each listing's own category. No direction means every orientation.
  function openListings(direction) {
    const wanted = direction ? (direction === 'buy' ? 'sell' : 'buy') : null
    const schemaCategory = {}
    for (const session of sessions) {
      for (const question of session.questions) schemaCategory[question.id] = String(session.categoryId)
    }
    const found = []
    for (const node of Object.values(browseData)) {
      for (const item of node?.items ?? []) {
        if (item.type === 'listing' && (!wanted || item.orientation === wanted)) found.push(item)
      }
    }
    const listings = found.filter((listing) => {
      const relevant = Object.keys(answers ?? {}).filter(
        (qid) => schemaCategory[qid] === listing.categoryId,
      )
      return relevant.every((qid) => {
        const optionId = Number(answers[qid])
        if (!Number.isFinite(optionId)) return true
        return selections.some(
          (s) =>
            s.listingId === Number(listing.id) &&
            Number(s.facetValueOptionId) === optionId,
        )
      })
    })
    const title =
      direction === 'buy' ? 'Buy listings' : direction === 'sell' ? 'Sell listings' : 'Search listings'
    setListingsModal({ title, listings })
  }

  // Search results: start a conversation about a listing. A new chat thread is
  // linked to the listing and to the current user's inbox item.
  async function contactListing(listing) {
    if (!user || contactingListingId) return
    setContactingListingId(listing.id)
    try {
      const thread = await api.create('chat-threads', {}, user.id)
      await api.create(
        'listing-chat-threads',
        { listingId: Number(listing.id), chatThreadId: thread.id },
        user.id,
      )
      await api.create(
        'inbox-items',
        { userId: user.id, chatThreadId: thread.id },
        user.id,
      )

      setNotice(`Conversation started for ${listing.title}.`)
      setListingsModal(null)
      setReloadToken((n) => n + 1)
    } catch (err) {
      setNotice(`Could not start conversation: ${err.message}`)
    } finally {
      setContactingListingId(null)
    }
  }

  // Buy/Sell chips are mutually exclusive: choosing one clears the other.
  function toggleListingDirection(direction) {
    setListingDirection((prev) => (prev === direction ? null : direction))
  }

  // Publish: when a drawer listing of the open category is selected, update that
  // listing (PATCH) and reconcile its facet selections; otherwise create a new
  // listing owned by the signed-in user. Either way the answered facets become
  // facet-value-selections on the listing that was written.
  async function publish() {
    if (!selectedSession || !user || publishing || savingQuestionId != null) return
    const answered = selectedSession.questions.filter((q) => answers[q.id] != null)

    // Only a listing from the category currently open can be updated; another
    // category's selection is ignored (browse clears it, this is a safety net).
    const target = selectedListingId
      ? myListings.find(
          (listing) =>
            String(listing.listingId) === String(selectedListingId) &&
            String(listing.sessionId) === String(selectedSession.id),
        ) ?? null
      : null

    setPublishing(true)
    try {
      let listingId
      let orientation = 'sell'
      if (target) {
        // Keep the listing's category, orientation and owner; just refresh it.
        orientation = target.orientation
        const updated = await api.update(
          'listings',
          target.listingId,
          {
            categoryId: selectedSession.categoryId,
            orientation,
            userId: user.id,
          },
          user.id,
        )
        listingId = updated.id
      } else {
        const created = await api.create(
          'listings',
          { categoryId: selectedSession.categoryId, orientation, userId: user.id },
          user.id,
        )
        listingId = created.id
      }

      // Reconcile facets: patch the selection already holding each answered
      // schema, create one where the listing has no selection yet.
      const nextSelections = [...selections]
      const existingForListing = selections.filter(
        (selection) => selection.listingId === listingId,
      )
      for (const question of answered) {
        const optionId = Number(answers[question.id])
        const existing = existingForListing.find(
          (selection) => Number(optionSchema[selection.facetValueOptionId]) === Number(question.id),
        )
        if (existing) {
          if (Number(existing.facetValueOptionId) === optionId) continue
          const updated = await api.update(
            'facet-value-selections',
            existing.id,
            { facetValueOptionId: optionId },
            user.id,
          )
          const index = nextSelections.findIndex((selection) => selection.id === updated.id)
          if (index >= 0) nextSelections[index] = updated
        } else {
          const created = await api.create(
            'facet-value-selections',
            { facetValueOptionId: optionId, listingId },
            user.id,
          )
          nextSelections.push(created)
        }
      }
      setSelections(nextSelections)

      const answerTexts = answered
        .map((question) => question.options.find((option) => option.id === answers[question.id])?.text)
        .filter(Boolean)
      const listingAnswers = Object.fromEntries(
        answered.map((question) => [question.id, String(answers[question.id])]),
      )
      const nextListing = {
        id: String(listingId),
        listingId,
        sessionId: selectedSession.id,
        categoryId: selectedSession.categoryId,
        orientation,
        title: `${selectedSession.title} #${listingId}`,
        desc: [orientation === 'buy' ? 'Wanted' : 'For sale', ...answerTexts].join(' · '),
        answers: listingAnswers,
      }

      // Update the drawer row in place instead of appending a duplicate.
      if (target) {
        setMyListings((prev) =>
          prev.map((listing) =>
            String(listing.listingId) === String(listingId) ? nextListing : listing,
          ),
        )
      } else {
        setMyListings((prev) => [...prev, nextListing])
      }

      // The wizard's last step: clear the interview and show the report dialog
      // over the "No category selected" screen.
      startNewListing()
      setModal('report')
    } catch (err) {
      setNotice(`Publish failed: ${err.message}`)
    } finally {
      setPublishing(false)
    }
  }

  // Drawer listing row: open its category session and recall the listing's facets.
  function openListing(listing) {
    // Keep the drawer open so its nested chat threads stay visible.
    selectSession(listing.sessionId, { keepDrawerOpen: true })
    setSelectedListingId(listing.id)
    // Show exactly this listing's answers: clear answers for the session's
    // questions that this listing has no selection for.
    const session = sessions.find((s) => s.id === listing.sessionId)
    const ownAnswers = listing.answers ?? {}
    setAnswers((prev) => {
      const next = { ...prev }
      for (const question of session?.questions ?? []) {
        if (ownAnswers[question.id] != null) next[question.id] = ownAnswers[question.id]
        else delete next[question.id]
      }
      return next
    })
  }

  // Drawer delete: ask first, then remove the listing from the backend.
  function askDeleteListing(listing) {
    setPendingDelete(listing)
  }

  async function confirmDeleteListing() {
    const listing = pendingDelete
    if (!listing || deleting) return
    setDeleting(true)
    try {
      await api.remove('listings', listing.listingId, user?.id)

      setMyListings((prev) =>
        prev.filter((item) => String(item.listingId) !== String(listing.listingId)),
      )
      setSelections((prev) => prev.filter((selection) => selection.listingId !== listing.listingId))
      setBrowseData((prev) => {
        const next = {}
        for (const [key, node] of Object.entries(prev)) {
          next[key] = {
            ...node,
            items: node.items.filter(
              (item) => !(item.type === 'listing' && item.id === String(listing.listingId)),
            ),
          }
        }
        return next
      })
      // The category's "first listing" fallback may have been the deleted one.
      setCategoryListing((prev) => {
        const key = String(listing.categoryId)
        if (String(prev[key]) !== String(listing.listingId)) return prev
        const remaining = (browseData[key]?.items ?? []).find(
          (item) => item.type === 'listing' && item.id !== String(listing.listingId),
        )
        return { ...prev, [key]: remaining ? Number(remaining.id) : null }
      })
      if (String(selectedListingId) === String(listing.listingId)) {
        setSelectedListingId(null)
      }
      setPendingDelete(null)
      setNotice(`Deleted ${listing.title}.`)
    } catch (err) {
      setNotice(`Delete failed: ${err.message}`)
    } finally {
      setDeleting(false)
    }
  }

  // Open a category interview as the main view. Switching categories abandons
  // the wizard's edit/preview draft for the previous category.
  function selectSession(sessionId, { keepDrawerOpen = false } = {}) {
    setCategoryDirty(false) // a plain category pick is not a browse change
    setSelectedChatId(null)
    setSelectedSessionId(sessionId)
    if (!keepDrawerOpen) setDrawerOpen(false)
    setWizardStage('interview')
    resetDraft()
  }

  // (f) Chat row click. Opening from the drawer also persists the read flag on
  // the signed-in user's side (the listing link for an owner).
  function selectChat(chatId) {
    const chat = chats.find((c) => c.id === chatId)
    if (!chat) return
    setSelectedSessionId(chat.sessionId) // parent session is highlighted too
    setSelectedChatId(chatId)
    markChatRead(chatId)
    setDrawerOpen(false)
  }

  // Opening a conversation clears its live unread counter and persists the read
  // flag on the backend entities that belong to the signed-in user: their own
  // inbox row, plus the listing link when they own the listing. The other
  // participant's side is left untouched.
  async function markChatRead(chatId) {
    const chat = chatsRef.current.find((c) => c.id === chatId)
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unread: 0 } : c)))

    if (!chat) return

    const item = inboxRef.current.find((i) => i.chatId === chatId)
    if (item) {
      try {
        await api.update('inbox-items', item.inboxItemId, { hasUnread: false }, user?.id)
      } catch {
        // Ignore persistence hiccups; the live counter is already cleared.
      }
    }

    const ownsListing = myListingsRef.current.some(
      (listing) => Number(listing.id) === Number(chat.listingId),
    )
    if (ownsListing && chat.listingChatThreadId) {
      try {
        await api.update('listing-chat-threads', chat.listingChatThreadId, { hasUnread: false }, user?.id)
      } catch {
        // Ignore persistence hiccups; the live counter is already cleared.
      }
    }
  }

  // Replace the answer and persist it as a facet-value-selection. When a drawer
  // listing of this category is selected, its own selection is patched/created;
  // otherwise the category's first listing keeps the interview answers.
  async function answerQuestion(session, questionId, optionId) {
    if (answers[questionId] === optionId || savingQuestionId === questionId) return

    const previous = answers[questionId]
    const selectedListing = selectedListingId
      ? myListings.find((listing) => String(listing.listingId) === String(selectedListingId))
      : null
    const listingId =
      selectedListing && String(selectedListing.sessionId) === String(session.id)
        ? selectedListing.listingId
        : categoryListing[session.id] ?? null
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

  // Persist text messages and show the saved row once; attachments stay local.
  async function sendMessage(chatId, message) {
    const chat = chats.find((c) => c.id === chatId)
    if (!chat) return

    // Attachments are browser-local placeholders and are not persisted.
    if (!message.text) {
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, message] } : c)),
      )
      return
    }

    try {
      const saved = await api.create(
        'chat-messages',
        { text: message.text, threadId: chat.threadId },
        user?.id,
      )
      // Text messages arrive through the REST response or the live SSE event,
      // whichever is first; only add the saved row once.
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c

          const savedId = `message-${saved.id}`
          if (c.messages.some((m) => m.id === savedId)) return c

          return {
            ...c,
            messages: [
              ...c.messages,
              {
                id: savedId,
                from: 'sent',
                text: saved.text,
                time: formatTime(saved.createdAt),
              },
            ],
          }
        }),
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

  // Aggregate unread count for the topbar's message icon. Count conversations
  // the signed-in user can actually see: their own listings' chat threads and
  // the threads sitting in their inbox.
  const myListingIds = new Set((myListings ?? []).map((listing) => Number(listing.id)))
  const inboxChatIds = new Set((inbox ?? []).map((item) => item.chatId))
  const unreadTotal = chats.reduce(
    (sum, chat) =>
      myListingIds.has(Number(chat.listingId)) || inboxChatIds.has(chat.id)
        ? sum + (chat.unread || 0)
        : sum,
    0,
  )

  const answeredCount = selectedSession
    ? selectedSession.questions.filter((q) => answers[q.id] != null).length
    : 0
  const canPublish = !!user && !!selectedSession && (categoryDirty || answeredCount > 0)

  // Interview step actions: Buy/Sell chips + Search on the right; "Next >"
  // continues to the wizard's edit step.
  const interviewActions = (
    <div className="action-row">
      <div className="action-chips" role="group" aria-label="Listing direction">
        <button
          type="button"
          className={listingDirection === 'buy' ? 'chip selected' : 'chip'}
          aria-pressed={listingDirection === 'buy'}
          onClick={() => toggleListingDirection('buy')}
        >
          Buy
        </button>
        <button
          type="button"
          className={listingDirection === 'sell' ? 'chip selected' : 'chip'}
          aria-pressed={listingDirection === 'sell'}
          onClick={() => toggleListingDirection('sell')}
        >
          Sell
        </button>
      </div>
      <div className="action-buttons">
        <button type="button" className="btn secondary" onClick={() => openListings(listingDirection)}>
          Search
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => setWizardStage('edit')}
          disabled={!canPublish || publishing || savingQuestionId != null}
        >
          Next &gt;
        </button>
      </div>
    </div>
  )

  // Edit step: "< Previous" returns to the interview; "Next >" opens preview.
  const editActions = (
    <div className="action-row">
      <button type="button" className="btn secondary" onClick={() => setWizardStage('interview')}>
        &lt; Previous
      </button>
      <div className="action-buttons">
        <button type="button" className="btn primary" onClick={() => setWizardStage('preview')}>
          Next &gt;
        </button>
      </div>
    </div>
  )

  // Preview step: "< Previous" returns to the edit step; Publish writes the
  // listing and shows the report dialog.
  const previewActions = (
    <div className="action-row">
      <button type="button" className="btn secondary" onClick={() => setWizardStage('edit')}>
        &lt; Previous
      </button>
      <div className="action-buttons">
        <button type="button" className="btn primary" onClick={publish} disabled={publishing}>
          {publishing ? 'Publishing…' : 'Publish'}
        </button>
      </div>
    </div>
  )

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
      <TopBar
        onMenu={toggleDrawer}
        onOpenModal={openModal}
        onCreateNew={startNewListing}
        theme={theme}
        onToggleTheme={toggleTheme}
        unreadCount={unreadTotal}
      />

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
          listings={myListings}
          chats={chats}
          selectedListingId={selectedListingId}
          selectedChatId={selectedChatId}
          onListingClick={openListing}
          onChatClick={selectChat}
          onDeleteListing={askDeleteListing}
        />

        {/* Clicking the main content (outside the drawer) closes it. */}
        <main className="main" onMouseDown={drawerOpen ? () => setDrawerOpen(false) : undefined}>
          {dataStatus === 'loading' ? (
            <LoadingPlaceholder />
          ) : dataStatus === 'error' ? (
            <ErrorPlaceholder message={loadError} onRetry={() => setReloadToken((n) => n + 1)} />
          ) : selectedChat ? (
            <ChatView chat={selectedChat} onSend={sendMessage} liveStatus={liveStatus} />
          ) : selectedSession && wizardStage === 'edit' ? (
            <EditListingView
              session={selectedSession}
              description={draftDescription}
              onDescriptionChange={setDraftDescription}
              images={draftImages}
              onAddImages={addImages}
              onRemoveImage={removeImage}
              actions={editActions}
            />
          ) : selectedSession && wizardStage === 'preview' ? (
            <PreviewListingView
              session={selectedSession}
              answers={answers}
              description={draftDescription}
              images={draftImages}
              actions={previewActions}
            />
          ) : selectedSession ? (
            <SessionView session={selectedSession} answers={answers} onAnswer={(questionId, optionId) => answerQuestion(selectedSession, questionId, optionId)} actions={interviewActions} />
          ) : (
            <EmptyPlaceholder hasSessions={sessions.length > 0} onBrowse={() => openModal('browse')} />
          )}
        </main>
      </div>

      {modal === 'browse' && (
        <BrowseModal data={browseData} onClose={() => setModal(null)} onPick={handleBrowsePick} />
      )}
      {modal === 'messages' && (
        <MessagesModal
          inbox={inbox}
          chats={chats}
          onSend={sendMessage}
          onChatRead={markChatRead}
          onActiveChatChange={setModalChatId}
          liveStatus={liveStatus}
          onClose={() => {
            setModalChatId(null)
            setModal(null)
          }}
        />
      )}
      {modal && modal !== 'browse' && modal !== 'messages' && modal !== 'report' && (
        <SimpleModal
          title={MODAL_TITLES[modal]}
          body={modal === 'profile' ? profileBody : SETTINGS_BODY}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'report' && (
        <SimpleModal
          title="Listing created"
          body={<p className="report-message">Listing created, thank you for using kiosk.</p>}
          footer={
            <button type="button" className="btn primary" onClick={() => setModal(null)}>
              Close
            </button>
          }
          onClose={() => setModal(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          title="Delete listing"
          message="Are you sure?"
          detail={`${pendingDelete.title} will be permanently deleted.`}
          confirmLabel="Yes"
          busyLabel="Deleting…"
          busy={deleting}
          onConfirm={confirmDeleteListing}
          onClose={() => {
            if (!deleting) setPendingDelete(null)
          }}
        />
      )}

      {listingsModal && (
        <ListingsModal
          title={listingsModal.title}
          listings={listingsModal.listings}
          onContact={contactListing}
          contactingId={contactingListingId}
          currentUserId={user?.id}
          onClose={() => setListingsModal(null)}
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

function EmptyPlaceholder({ hasSessions, onBrowse }) {
  return (
    <div className="placeholder">
      <span className="placeholder-icon">
        <LayersIcon size={56} />
      </span>
      {hasSessions ? (
        <button type="button" className="btn primary" onClick={onBrowse}>
          Browse
        </button>
      ) : (
        <p>The backend has no categories, so there is nothing to interview yet.</p>
      )}
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
