// ─────────────────────────────────────────────────────────────
// STATE + APP SHELL — owns all interaction state and rules.
// Data comes from the NestJS CRUD API (see ../backend/API_ROUTES.md).
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router'
import { api, CHAT_EVENTS_URL, fetchKioskData, mediaUrl } from './api.js'
import { buildViewModel, formatTime } from './viewModel.js'
import { hasStrings, LANGUAGES, LanguageProvider, useI18n } from './i18n.jsx'
import { AlertIcon, LayersIcon, XIcon } from './icons.jsx'
import TopBar from './components/TopBar.jsx'
import Drawer from './components/Drawer.jsx'
import InterviewView from './components/InterviewView.jsx'
import ChatView from './components/ChatView.jsx'
import BrowseModal from './components/BrowseModal.jsx'
import MessagesModal from './components/MessagesModal.jsx'
import SimpleModal from './components/SimpleModal.jsx'
import Login from './components/Login.jsx'
import Signup from './components/Signup.jsx'
import Terms from './components/Terms.jsx'
import Privacy from './components/Privacy.jsx'
import SignupsModal from './components/SignupsModal.jsx'
import ConnectGoogleRow from './components/ConnectGoogleRow.jsx'
import ConfirmModal from './components/ConfirmModal.jsx'
import EditListingView from './components/EditListingView.jsx'
import PreviewListingView from './components/PreviewListingView.jsx'
import SearchView from './components/SearchView.jsx'
import ResultsView from './components/ResultsView.jsx'
import ListingPage from './components/ListingPage.jsx'
import TranslateTitlesModal from './components/TranslateTitlesModal.jsx'
import PublishSuccessView from './components/PublishSuccessView.jsx'
import {
  answersFromSearchQuery,
  getCategoryIdFromSearch,
  parseSearchQuery,
} from './searchQuery.js'
import {
  buildSellerStats,
  listingChecklist,
  pricePosition,
} from './sellerStats.js'

const MODAL_TITLES = { settings: 'settings.title', profile: 'profile.title' }

/** Delete-dialog outcomes, split by what the listing was looking for. */
const DELETE_OUTCOMES = {
  sell: ['sold', 'sale_fell_through', 'kept', 'gave_away'],
  buy: ['purchased', 'purchase_fell_through', 'no_longer_needed', 'bought_elsewhere'],
}

const DELETE_OUTCOME_LABELS = {
  sold: 'delete.outcomeSold',
  sale_fell_through: 'delete.outcomeSaleFellThrough',
  kept: 'delete.outcomeKept',
  gave_away: 'delete.outcomeGaveAway',
  purchased: 'delete.outcomePurchased',
  purchase_fell_through: 'delete.outcomePurchaseFellThrough',
  no_longer_needed: 'delete.outcomeNoLongerNeeded',
  bought_elsewhere: 'delete.outcomeBoughtElsewhere',
}

/** Outcomes that ask for the price actually paid. */
const PRICED_OUTCOMES = new Set(['sold', 'purchased'])

/** `?google=` results from the profile link flow → banner message keys. */
const GOOGLE_RESULT_KEYS = {
  connected: 'auth.googleConnected',
  error_email_mismatch: 'auth.error.emailMismatch',
  error_google_taken: 'auth.error.googleTaken',
  error_link_failed: 'auth.error.linkFailed',
  error_denied: 'auth.error.denied',
  error_failed: 'auth.error.linkFailed',
}

const THEME_KEY = 'kiosk-theme'
const REGION_KEY = 'kiosk-region-id'

/** Replace the leading direction segment of a drawer listing description. */
function withOrientationLabel(desc, orientation, t) {
  const label = t(orientation === 'buy' ? 'direction.buy' : 'direction.sell')
  const parts = String(desc ?? '').split(' · ')
  if (parts.length === 1 && parts[0] === '') return label
  parts[0] = label
  return parts.join(' · ')
}

function getInitialTheme() {
  // Server render: there is no window. Node 22+ exposes a `localStorage` global
  // that throws (and warns) unless `--localstorage-file` is set, so check for a
  // browser before touching it.
  if (typeof window === 'undefined') return 'light'
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // localStorage can be unavailable (private mode, blocked storage).
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/** Region chosen on /search; `null` means "not detected or chosen yet". */
function getStoredRegionId() {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(REGION_KEY)
    if (stored == null) return null
    const id = Number(stored)
    return Number.isInteger(id) && id >= 0 ? id : null
  } catch {
    return null
  }
}

function KioskApp({ initialData = null, initialTheme }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { id: listingRouteId } = useParams()
  const { language, refreshStrings, strings, t } = useI18n()

  // The session lives in an HTTP-only cookie and is resolved by the API. Until
  // `/auth/me` has answered, no catalog load starts, so drafts and chats are
  // fetched with the right identity on the first pass.
  const [authUser, setAuthUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const loggedInUserId = authUser?.id ?? null
  const isLoggedIn = loggedInUserId != null
  const user = authUser

  // Seed the first render from a server payload. This is what lets the server
  // emit real markup for /results and /listing/:id instead of a loading shell;
  // the browser rebuilds the same view model, so hydration matches.
  const initialViewRef = useRef(undefined)
  if (initialViewRef.current === undefined) {
    initialViewRef.current = initialData
      ? buildViewModel(initialData, { userId: loggedInUserId, language, strings })
      : null
  }
  const initialView = initialViewRef.current

  // The same shell (topbar, drawer, modals) hosts the listings screen, the
  // standalone /search form and the /results page; only the main area differs.
  const isSearchRoute = location.pathname === '/search'
  const isResultsRoute = location.pathname === '/results'
  const isAppRoute = location.pathname === '/app'
  const isListingRoute = listingRouteId != null
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedInterviewId, setSelectedInterviewId] = useState(null)
  const [selectedChatId, setSelectedChatId] = useState(null)
  const [modal, setModal] = useState(null) // 'browse' | 'messages' | 'settings' | 'profile' | null
  const [browseFor, setBrowseFor] = useState('listing') // 'listing' | 'search' | 'new'
  const [theme, setTheme] = useState(() =>
    initialTheme === undefined ? getInitialTheme() : initialTheme,
  )

  // /search keeps its structured query in the URL (category, direction, chips),
  // so the category picker reads and writes the URL instead of local state.
  const searchCategoryId = isSearchRoute ? getCategoryIdFromSearch(location.search) : ''

  // Backend data, seeded from the server render when there is one.
  const [dataStatus, setDataStatus] = useState(initialView ? 'ready' : 'loading') // 'loading' | 'ready' | 'error'
  const [loadError, setLoadError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [users, setUsers] = useState(initialView?.users ?? [])
  const [languages, setLanguages] = useState(
    initialView?.languages?.length ? initialView.languages : LANGUAGES,
  )
  const [regions, setRegions] = useState(initialView?.regions ?? [])
  // `null` until the stored choice or the IP detection resolves it.
  const [regionId, setRegionId] = useState(() => getStoredRegionId())
  const [interviews, setInterviews] = useState(initialView?.interviews ?? [])
  const [chats, setChats] = useState(initialView?.chats ?? [])
  const [inbox, setInbox] = useState(initialView?.inbox ?? [])
  const [browseData, setBrowseData] = useState(
    () =>
      initialView?.browseData ?? {
        root: { path: [t('browse.home')], items: [] },
      },
  )
  const [answers, setAnswers] = useState(initialView?.answers ?? {}) // facet schema id -> facet value option id
  const [selections, setSelections] = useState(initialView?.selections ?? []) // raw facet-value-selections rows
  const [optionSchema, setOptionSchema] = useState(
    initialView?.optionSchema ?? {},
  ) // option id -> schema id
  const [categoryListing, setCategoryListing] = useState(
    initialView?.categoryListing ?? {},
  ) // category id -> first listing id
  const [savingQuestionId, setSavingQuestionId] = useState(null)
  const [notice, setNotice] = useState('')
  const [contactingListingId, setContactingListingId] = useState(null)
  const [myListings, setMyListings] = useState(initialView?.myListings ?? []) // listings owned by the logged-in user
  const [selectedListingId, setSelectedListingId] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [categoryDirty, setCategoryDirty] = useState(false) // category changed via browse OK
  const [pendingDelete, setPendingDelete] = useState(null) // listing awaiting confirmation
  const [deleteDetailsOpen, setDeleteDetailsOpen] = useState(false)
  const [deleteOutcome, setDeleteOutcome] = useState(null) // 'sold' | 'kept' | null
  const [deleteFinalPrice, setDeleteFinalPrice] = useState('')
  const [deleting, setDeleting] = useState(false)
  // Listing that was just published; drives the post-publish screen on /app.
  const [publishedListingId, setPublishedListingId] = useState(null)

  // Listing wizard: interview → edit (images) → preview → published.
  const [wizardStage, setWizardStage] = useState('interview') // 'interview' | 'edit' | 'preview'
  // The wizard and the dashboard's "Answer questions" editor live in modals so
  // the dashboard stays behind them.
  const [wizardOpen, setWizardOpen] = useState(false)
  const [answerModal, setAnswerModal] = useState(null) // { listingId, interview, baseline, draft } | null
  const [savingAnswers, setSavingAnswers] = useState(false)
  const [draftImages, setDraftImages] = useState([]) // { id, name, url, file, isPrimary } (new listings)
  const [listingImages, setListingImages] = useState(
    initialView?.listingImages ?? [],
  ) // backend ListingImage rows
  const [listingTranslations, setListingTranslations] = useState(
    initialView?.listingTranslations ?? [],
  )
  const listingTranslationsRef = useRef(initialView?.listingTranslations ?? [])
  const [draftListingId, setDraftListingId] = useState(null) // inactive listing created on Next
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [translationsOpen, setTranslationsOpen] = useState(false)
  const [savingTitle, setSavingTitle] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)

  // Live-chat connection + latest values looked up by the SSE handler without
  // re-subscribing on every render.
  const [liveStatus, setLiveStatus] = useState('connecting') // 'connecting' | 'live' | 'reconnecting'
  const selectedChatIdRef = useRef(null)
  const chatsRef = useRef([])
  const inboxRef = useRef([])
  const myListingsRef = useRef([])
  // Distinguishes a real data reload from a language-only rebuild, so switching
  // language does not discard the interview answers being edited.
  const loadKeyRef = useRef(null)
  const initializedRef = useRef(Boolean(initialView))
  // Which data load already asked for a dictionary retry, so a failed
  // translation request is not retried on every render.
  const stringsRetryRef = useRef(null)
  selectedChatIdRef.current = selectedChatId
  chatsRef.current = chats
  inboxRef.current = inbox
  myListingsRef.current = myListings

  // Conversation currently open inside the Messages modal (if any); its messages
  // count as read, so live badges do not grow while the user is looking at it.
  const [modalChatId, setModalChatId] = useState(null)
  const modalChatIdRef = useRef(null)
  modalChatIdRef.current = modalChatId

  // Resolve the session cookie once, then let the data load run with the
  // signed-in identity (or as a guest when `/auth/me` answers 401).
  useEffect(() => {
    let cancelled = false

    api
      .me()
      .then((me) => {
        if (cancelled) return
        setAuthUser(me)
        setAuthChecked(true)
      })
      .catch(() => {
        if (cancelled) return
        setAuthUser(null)
        setAuthChecked(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // `/app` is private. Direct visits are redirected by the server; this covers
  // client-side navigation and a session that expired while the tab was open.
  useEffect(() => {
    if (!authChecked || !isAppRoute || isLoggedIn) return
    const from = `${location.pathname}${location.search}`
    navigate(`/login?from=${encodeURIComponent(from)}`, { replace: true })
  }, [authChecked, isAppRoute, isLoggedIn, location.pathname, location.search, navigate])

  // Load every resource the UI needs, then map it onto the interview/chat model.
  useEffect(() => {
    if (!authChecked) return undefined

    let cancelled = false
    const loadKey = `${reloadToken}|${loggedInUserId}`
    const dataChanged = !initializedRef.current || loadKeyRef.current !== loadKey
    loadKeyRef.current = loadKey

    if (dataChanged) {
      // A page rendered on the server already shows real content; keep it while
      // the browser refreshes the catalog in the background instead of flashing
      // the loading placeholder over the hydrated markup.
      if (!initializedRef.current) setDataStatus('loading')
      setLoadError('')
    }

    fetchKioskData({ signedIn: loggedInUserId != null })
      .then((raw) => {
        if (cancelled) return
        // The provider normally loaded these before mount; retrying here covers
        // a first request that failed along with the data.
        if (!hasStrings(strings) && stringsRetryRef.current !== reloadToken) {
          stringsRetryRef.current = reloadToken
          refreshStrings()
        }
        const view = buildViewModel(raw, {
          userId: loggedInUserId,
          language,
          strings,
        })
        setUsers(view.users ?? [])
        setLanguages(view.languages?.length ? view.languages : LANGUAGES)
        setRegions(view.regions ?? [])
        setInterviews(view.interviews)
        setChats(view.chats)
        setInbox(view.inbox ?? [])
        setMyListings(view.myListings)
        setBrowseData(view.browseData)
        setListingImages(view.listingImages ?? [])
        listingTranslationsRef.current = view.listingTranslations ?? []
        setListingTranslations(listingTranslationsRef.current)
        if (dataChanged) {
          setAnswers(view.answers)
          setSelections(view.selections)
          setOptionSchema(view.optionSchema)
          setCategoryListing(view.categoryListing)
          initializedRef.current = true
        }
        setDataStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        // The session expired between /auth/me and the catalog load: drop back
        // to a guest and reload the public catalog once.
        if (err.status === 401 && loggedInUserId != null) {
          setAuthUser(null)
          setAuthChecked(true)
          setReloadToken((n) => n + 1)
          return
        }
        setLoadError(err.message)
        setDataStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [reloadToken, loggedInUserId, language, strings, refreshStrings, authChecked])

  // The Google link flow (started from the profile) returns with `?google=…`:
  // show the outcome in the notice banner and drop the parameter so a refresh
  // does not repeat it.
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const result = params.get('google')
    if (!result) return

    const key = GOOGLE_RESULT_KEYS[result]
    if (key) setNotice(t(key))

    params.delete('google')
    const search = params.toString()
    navigate(`${location.pathname}${search ? `?${search}` : ''}`, { replace: true })
  }, [location.pathname, location.search, navigate, t])

  // Search region: an explicit choice survives reloads; without one, ask the
  // API which region this IP belongs to (0 when it cannot be resolved).
  useEffect(() => {
    if (regionId != null) return undefined
    let cancelled = false

    api
      .detectRegion()
      .then((result) => {
        if (cancelled) return
        const detected = Number(result?.regionId)
        setRegionId(Number.isInteger(detected) && detected >= 0 ? detected : 0)
      })
      .catch(() => {
        if (!cancelled) setRegionId(0)
      })

    return () => {
      cancelled = true
    }
  }, [regionId])

  /** Region picked from the "Search <region>" dialog. */
  function changeRegion(nextId) {
    const id = Number(nextId)
    const value = Number.isInteger(id) && id >= 0 ? id : 0
    setRegionId(value)
    try {
      localStorage.setItem(REGION_KEY, String(value))
    } catch {
      // Storage can be blocked; the choice still applies to this visit.
    }
  }

  // Live chat: consume the backend's SSE stream. New messages for a known
  // thread are appended in place; messages for an unseen thread trigger a full
  // reload so a newly started conversation becomes visible too.
  useEffect(() => {
    if (!user?.id) return undefined

    const source = new EventSource(CHAT_EVENTS_URL, { withCredentials: true })
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
    if (theme == null) {
      // The server could not read this device's preference, so it rendered the
      // light version. Adopt the stored one after hydration; the inline script
      // in index.html has already set the attribute, so leave it alone here.
      setTheme(getInitialTheme())
      return
    }
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // Ignore storage failures; the theme still applies for this visit.
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
        if (!deleting) {
          setPendingDelete(null)
          setDeleteDetailsOpen(false)
          setDeleteOutcome(null)
          setDeleteFinalPrice('')
        }
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

  // The structured query of the search screen currently shown, or null when the
  // main area is not a search screen. Both /search and /results keep the whole
  // query in the URL (category, facets, ranges).
  function currentSearchQuery() {
    if (!isSearchRoute && !isResultsRoute) return null
    return parseSearchQuery(location.search)
  }

  // Answers a new listing inherits from the search that was just run: the
  // selected facet values (condition included) and the price/year ranges.
  function searchAnswers(interview) {
    const query = currentSearchQuery()
    if (!query || !interview) return {}
    return answersFromSearchQuery(query, { questions: interview.questions ?? [] })
  }

  // Drawer "New listing" and the topbar "+" both land here. On the search
  // screen the category chosen in the search box and the active filters already
  // describe the new listing, so that category is used as-is with its questions
  // pre-answered instead of asking for a category again. A search over
  // "All categories" (category 0 / no category) still opens the Browse modal.
  function browseNewListing() {
    setDrawerOpen(false)
    const query = currentSearchQuery()
    const impliedInterview = query?.categoryId
      ? interviews.find(
          (interview) => String(interview.categoryId) === String(query.categoryId),
        )
      : null
    if (impliedInterview) {
      const prefill = searchAnswers(impliedInterview)
      startNewListing()
      setCategoryDirty(true)
      setSelectedInterviewId(String(impliedInterview.id))
      setWizardOpen(true)
      setAnswers(prefill)
      return
    }
    setBrowseFor('new')
    setModal('browse')
  }

  // Top bar "+": signed-in users start a new listing (the Browse modal only when
  // the current search has no category); guests get the drawer and a "Please
  // sign in to publish" prompt.
  function addListing() {
    if (isLoggedIn) {
      browseNewListing()
      return
    }
    setDrawerOpen(true)
    setModal('signin')
  }

  // Start a fresh listing: clear the current category, listing, interview
  // answers and wizard draft locally. This deliberately makes no API calls; the
  // next Publish creates a new listing instead of updating the selected one.
  function startNewListing() {
    navigate('/app')
    setDrawerOpen(false)
    setModal(null)
    setPendingDelete(null)
    setSelectedListingId(null)
    setSelectedChatId(null)
    setSelectedInterviewId(null)
    setCategoryDirty(false)
    setPublishedListingId(null)
    setDraftListingId(null)
    setTranslationsOpen(false)
    setAnswers({})
    setWizardStage('interview')
    setWizardOpen(false)
    setAnswerModal(null)
    resetDraft()
    setNotice('')
  }

  // Wizard draft lives in the browser only; object URLs are released on reset.
  function resetDraft() {
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

  // The listing the wizard is editing: the selected drawer listing or the
  // inactive draft created when Next was pressed. Null before a draft exists.
  function wizardTargetListing() {
    const targetId = selectedListingId ?? draftListingId
    if (!targetId) return null
    return (
      myListings.find(
        (listing) =>
          String(listing.listingId) === String(targetId) &&
          String(listing.categoryId) === String(selectedInterviewId),
      ) ?? null
    )
  }

  // Upload straight away when editing a saved listing; otherwise keep local
  // object URLs so Publish can upload them once the listing exists.
  async function addImages(fileList) {
    const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) return

    const target = wizardTargetListing()
    if (!target) {
      setDraftImages((prev) => [
        ...prev,
        ...files.map((file, index) => ({
          id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          name: file.name,
          url: URL.createObjectURL(file),
          file,
          // The first image is primary unless another one already is.
          isPrimary: prev.length === 0 && index === 0,
        })),
      ])
      return
    }

    setUploadingImages(true)
    try {
      const uploaded = []
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        form.append('listingId', String(target.listingId))
        uploaded.push(await api.upload('listing-images', form, user?.id))
      }
      setListingImages((prev) => [...prev, ...uploaded])
    } catch (err) {
      setNotice(t('notice.imageUploadFailed', { message: err.message }))
    } finally {
      setUploadingImages(false)
    }
  }

  async function removeImage(imageId) {
    const serverImage = listingImages.find((image) => image.id === imageId)
    if (!serverImage) {
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
      return
    }

    try {
      await api.remove('listing-images', imageId, user?.id)
    } catch (err) {
      setNotice(t('notice.imageDeleteFailed', { message: err.message }))
      return
    }

    const siblings = listingImages.filter(
      (image) => image.listingId === serverImage.listingId && image.id !== imageId,
    )
    setListingImages((prev) => prev.filter((image) => image.id !== imageId))

    // Deleting the primary image promotes the next one so a thumbnail remains.
    if (serverImage.primaryImage && siblings.length > 0) {
      try {
        const updated = await api.update(
          'listing-images',
          siblings[0].id,
          { primaryImage: true },
          user?.id,
        )
        setListingImages((prev) =>
          prev.map((image) => (image.id === updated.id ? updated : image)),
        )
      } catch {
        // Non-fatal: the listing simply has no primary image for now.
      }
    }
  }

  async function setPrimaryImage(imageId) {
    const serverImage = listingImages.find((image) => image.id === imageId)
    if (!serverImage) {
      setDraftImages((prev) =>
        prev.map((image) => ({ ...image, isPrimary: image.id === imageId })),
      )
      return
    }

    try {
      const updated = await api.update(
        'listing-images',
        imageId,
        { primaryImage: true },
        user?.id,
      )
      setListingImages((prev) =>
        prev.map((image) =>
          image.listingId === updated.listingId
            ? { ...image, primaryImage: image.id === updated.id }
            : image,
        ),
      )
    } catch (err) {
      setNotice(t('notice.primaryFailed', { message: err.message }))
    }
  }

  // Upload images picked before the listing existed (Publish path).
  async function uploadDraftImages(listingId) {
    if (draftImages.length === 0) return

    const uploaded = []
    for (const draft of draftImages) {
      const form = new FormData()
      form.append('file', draft.file)
      form.append('listingId', String(listingId))
      uploaded.push(await api.upload('listing-images', form, user?.id))
    }

    const primaryIndex = draftImages.findIndex((draft) => draft.isPrimary)
    if (primaryIndex >= 0 && uploaded[primaryIndex]) {
      uploaded[primaryIndex] = await api.update(
        'listing-images',
        uploaded[primaryIndex].id,
        { primaryImage: true },
        user?.id,
      )
    }

    setListingImages((prev) => [...prev, ...uploaded])
  }

  // (g) Browse modal: OK adopts the browsed category as the current one; Cancel just closes.
  // Interviews are categories, so adopting a category means selecting the matching interview,
  // whose questions are that category's facet schemas. Start with unanswered questions.
  function handleBrowsePick(categoryId) {
    setModal(null)
    // Opened from the /search screen: the pick only changes its category
    // filter, which lives in the URL alongside the rest of the query.
    if (browseFor === 'search') {
      const nextId = categoryId === 'root' ? '' : String(categoryId)
      const params = new URLSearchParams()
      if (nextId) params.set('category', nextId)
      const search = params.toString()
      navigate({ pathname: '/search', search: search ? `?${search}` : '' }, { replace: true })
      return
    }
    const node = browseData[categoryId]
    if (!node || node.path.length < 2) return // root path is not a category
    const targetInterview = interviews.find((s) => String(s.categoryId) === String(categoryId))
    if (!targetInterview) return

    // Opened from the drawer's "New listing": start a fresh wizard in the
    // chosen category (no listing is written until Publish). Facets already
    // selected in the search filter carry over to the interview questions.
    if (browseFor === 'new') {
      const prefill = searchAnswers(targetInterview)
      startNewListing()
      setCategoryDirty(true)
      setSelectedInterviewId(String(targetInterview.id))
      setWizardOpen(true)
      setAnswers(prefill)
      return
    }
    const alreadyCurrent = selectedInterviewId === String(targetInterview.id)

    setSelectedListingId(null)
    setAnswers((prev) => {
      const next = { ...prev }
      for (const question of targetInterview.questions ?? []) delete next[question.id]
      return next
    })

    selectInterview(String(targetInterview.id))
    // Re-picking the category the interview already has is not a change.
    setCategoryDirty(!alreadyCurrent)
  }


  // Search results: start a conversation about a listing. A new chat thread is
  // linked to the listing and to the current user's inbox item.
  async function contactListing(listing) {
    const actorId = user?.id
    if (!actorId || contactingListingId) return
    setContactingListingId(listing.id)
    try {
      const thread = await api.create('chat-threads', {}, actorId)
      await api.create(
        'listing-chat-threads',
        { listingId: Number(listing.id), chatThreadId: thread.id },
        actorId,
      )
      await api.create(
        'inbox-items',
        { userId: actorId, chatThreadId: thread.id },
        actorId,
      )

      setNotice(t('notice.conversationStarted', { title: listing.title }))
      setReloadToken((n) => n + 1)
    } catch (err) {
      setNotice(t('notice.conversationFailed', { message: err.message }))
    } finally {
      setContactingListingId(null)
    }
  }

  // Publish: when a drawer listing of the open category is selected, update that
  // listing (PATCH) and reconcile its facet selections; otherwise create a new
  // listing owned by the signed-in user. Either way the answered facets become
  // facet-value-selections on the listing that was written.
  async function publish() {
    if (!selectedInterview || !user || publishing || savingQuestionId != null) return
    if (requiredQuestionsMissing(selectedInterview).length > 0) {
      setNotice(t('interview.requiredMissing'))
      return
    }
    const answered = selectedInterview.questions.filter((q) => answers[q.id] != null)
    const answeredFacets = answered.filter(
      (q) => q.type !== 'numeric' && q.facet !== 'orientation',
    )
    const price = answers.price != null ? Number(answers.price) : null
    const year = answers.year != null ? Number(answers.year) : null

    // Only a listing from the category currently open can be updated; another
    // category's selection is ignored (browse clears it, this is a safety net).
    const target = wizardTargetListing()

    setPublishing(true)
    try {
      let listingId
      let savedListing
      let orientation = answers.orientation ?? target?.orientation ?? 'sell'
      if (target) {
        // Keep the listing's category and owner; apply the chosen orientation
        // and publish the draft.
        savedListing = await api.update(
          'listings',
          target.listingId,
          {
            categoryId: selectedInterview.categoryId,
            orientation,
            userId: user.id,
            isActive: true,
            price,
            year,
          },
          user.id,
        )
        listingId = savedListing.id
      } else {
        savedListing = await api.create(
          'listings',
          {
            categoryId: selectedInterview.categoryId,
            regionId: regionId ?? 0,
            orientation,
            userId: user.id,
            isActive: true,
            price,
            year,
          },
          user.id,
        )
        listingId = savedListing.id
      }

      // Publishing always needs a title row for the current language; fall back
      // to the generated label if the user never edited it.
      let publishTitle = titleForListing(listingId)
      if (!titlesForListing(listingId)[language]) {
        const saved = await saveListingTitle(
          listingId,
          language,
          generatedTitle(selectedInterview, listingId),
        )
        publishTitle = saved?.title ?? publishTitle
      }

      // Reconcile facets: patch the selection already holding each answered
      // schema, create one where the listing has no selection yet.
      const nextSelections = [...selections]
      const existingForListing = selections.filter(
        (selection) => selection.listingId === listingId,
      )
      for (const question of answeredFacets) {
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
        .filter((question) => question.facet !== 'orientation')
        .map((question) =>
          question.type === 'numeric'
            ? `${question.text}: ${answers[question.id]}${question.unit ? ` ${question.unit}` : ''}`
            : question.options.find((option) => option.id === answers[question.id])?.text,
        )
        .filter(Boolean)
      const listingAnswers = Object.fromEntries(
        answered.map((question) => [
          question.id,
          question.type === 'numeric' ? answers[question.id] : String(answers[question.id]),
        ]),
      )
      const nextListing = {
        id: String(listingId),
        listingId,
        categoryId: selectedInterview.categoryId,
        orientation,
        isActive: true,
        price,
        year,
        facetsCount: savedListing?.facetsCount,
        facetsCountMax: selectedInterview.facetsCountMax,
        facetsCountMaxAnswerable: selectedInterview.facetsCountMaxAnswerable,
        title: publishTitle || generatedTitle(selectedInterview, listingId),
        iconSvg: selectedInterview.iconSvg ?? null,
        titles: {
          ...titlesForListing(listingId),
          ...(publishTitle ? { [language]: publishTitle } : {}),
        },
        desc: [
          t(orientation === 'buy' ? 'direction.buy' : 'direction.sell'),
          ...answerTexts,
        ].join(' · '),
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

      // Images picked before the listing existed are uploaded now that it has
      // an id; a failed upload should not hide the successful publish.
      if (draftImages.length > 0) {
        try {
          await uploadDraftImages(listingId)
        } catch (err) {
          setNotice(t('notice.publishImageFailed', { message: err.message }))
        }
      }

      // The wizard's last step: clear the interview and show the post-publish
      // screen (published card, seller statistics, next steps) on /app, then
      // refresh the catalog so the now-active listing appears in search.
      startNewListing()
      setPublishedListingId(listingId)
      setReloadToken((n) => n + 1)
    } catch (err) {
      setNotice(t('notice.publishFailed', { message: err.message }))
    } finally {
      setPublishing(false)
    }
  }

  // Drawer listing row: show that listing's statistics on /app. The category
  // interview is one click away from the stats page (Answer questions) rather
  // than opening on the listing click itself.
  function openListing(listing) {
    navigate('/app')
    setSelectedChatId(null)
    // Stats, not the interview: the overview reads the selected own listing.
    setSelectedInterviewId(null)
    setSelectedListingId(listing.id)
    // The clicked listing should win over the one that was just published.
    setPublishedListingId(null)
    setWizardStage('interview')
    setDraftListingId(null)
    setWizardOpen(false)
    setAnswerModal(null)
    resetDraft()
  }

  // Open the wizard modal for an existing listing (edit step by default).
  function openWizardForListing(listing, stage = 'edit') {
    if (!listing) return
    navigate('/app')
    selectInterview(listing.categoryId)
    setSelectedListingId(listing.id)
    // Show exactly this listing's answers: clear answers for the interview's
    // questions that this listing has no selection for.
    const interview = interviews.find(
      (s) => String(s.id) === String(listing.categoryId),
    )
    const ownAnswers = listing.answers ?? {}
    setAnswers((prev) => {
      const next = { ...prev }
      for (const question of interview?.questions ?? []) {
        if (ownAnswers[question.id] != null) next[question.id] = ownAnswers[question.id]
        else delete next[question.id]
      }
      return next
    })
    setWizardStage(stage)
  }

  // Dashboard "Answer questions": edit the full interview in a modal, with
  // Apply/Cancel. Nothing is written until Apply, so Cancel always discards.
  function openAnswerQuestions(listing) {
    if (!listing) return
    const interview = interviews.find(
      (s) => String(s.categoryId) === String(listing.categoryId),
    )
    if (!interview) return

    const baseline = {}
    for (const question of interview.questions ?? []) {
      const value = listing.answers?.[question.id]
      if (value != null) baseline[question.id] = String(value)
    }

    navigate('/app')
    setWizardOpen(false)
    setSelectedChatId(null)
    setSelectedInterviewId(null)
    setWizardStage('interview')
    setDrawerOpen(false)
    setAnswerModal({
      listingId: listing.listingId,
      interview,
      baseline,
      draft: { ...baseline },
    })
  }

  function closeAnswerQuestions() {
    if (savingAnswers) return
    setAnswerModal(null)
  }

  /** `null` and `''` are both "no answer"; numbers and option ids compare by text. */
  function sameAnswer(a, b) {
    return (a == null ? '' : String(a)) === (b == null ? '' : String(b))
  }

  const answerChanges =
    answerModal?.interview.questions.filter(
      (question) =>
        !sameAnswer(
          answerModal.draft[question.id],
          answerModal.baseline[question.id],
        ),
    ) ?? []

  // Write one answer for a saved listing. Used by Apply; the background reload
  // after it refreshes counts, selections and the listing page.
  async function persistAnswerOnListing(listingId, question, value) {
    const actorId = user?.id
    if (question?.type === 'numeric') {
      const field = question.facet === 'year' ? 'year' : 'price'
      await api.update(
        'listings',
        listingId,
        { [field]: value == null ? null : Number(value) },
        actorId,
      )
      return
    }

    if (question?.facet === 'orientation') {
      await api.update('listings', listingId, { orientation: value }, actorId)
      return
    }

    const existing = selections.find(
      (selection) =>
        selection.listingId === listingId &&
        optionSchema[selection.facetValueOptionId] === Number(question.id),
    )

    if (value == null || value === '') {
      if (existing) await api.remove('facet-value-selections', existing.id, actorId)
      return
    }

    if (existing) {
      await api.update(
        'facet-value-selections',
        existing.id,
        { facetValueOptionId: Number(value) },
        actorId,
      )
    } else {
      await api.create(
        'facet-value-selections',
        { facetValueOptionId: Number(value), listingId },
        actorId,
      )
    }
  }

  async function applyAnswerChanges() {
    if (!answerModal || savingAnswers || answerChanges.length === 0) return
    setSavingAnswers(true)
    try {
      for (const question of answerChanges) {
        await persistAnswerOnListing(
          answerModal.listingId,
          question,
          answerModal.draft[question.id] ?? null,
        )
      }
      setAnswerModal(null)
      setReloadToken((n) => n + 1)
    } catch (err) {
      setNotice(t('notice.answerFailed', { message: err.message }))
    } finally {
      setSavingAnswers(false)
    }
  }

  // Close the wizard without publishing. A draft created by "Next" stays in the
  // drawer as an inactive listing; unsaved image picks are released.
  function closeWizard() {
    setWizardOpen(false)
    setSelectedInterviewId(null)
    setWizardStage('interview')
    setDraftListingId(null)
    resetDraft()
  }

  // Drawer delete: ask first, then remove the listing from the backend. The
  // optional details (outcome, sale price) are recorded just before deleting.
  function askDeleteListing(listing) {
    setPendingDelete(listing)
    setDeleteDetailsOpen(false)
    setDeleteOutcome(null)
    setDeleteFinalPrice('')
  }

  function closeDeleteDialog() {
    if (deleting) return
    setPendingDelete(null)
    setDeleteDetailsOpen(false)
    setDeleteOutcome(null)
    setDeleteFinalPrice('')
  }

  async function confirmDeleteListing() {
    const listing = pendingDelete
    if (!listing || deleting) return
    setDeleting(true)
    try {
      // Best-effort outcome analytics: a failure here must not keep the listing.
      if (deleteOutcome) {
        const finalPrice =
          PRICED_OUTCOMES.has(deleteOutcome) && deleteFinalPrice.trim() !== ''
            ? Number(deleteFinalPrice)
            : null
        try {
          await api.create(
            'listing-outcomes',
            {
              listingId: listing.listingId,
              outcome: deleteOutcome,
              finalPrice: Number.isFinite(finalPrice) ? finalPrice : null,
            },
            user?.id,
          )
        } catch {
          // Ignore: deleting the listing is what the seller asked for.
        }
      }

      await api.remove('listings', listing.listingId, user?.id)

      setMyListings((prev) =>
        prev.filter((item) => String(item.listingId) !== String(listing.listingId)),
      )
      setListingImages((prev) =>
        prev.filter((image) => image.listingId !== listing.listingId),
      )
      setSelections((prev) => prev.filter((selection) => selection.listingId !== listing.listingId))
      setListingTranslations((prev) =>
        prev.filter((row) => Number(row.listingId) !== Number(listing.listingId)),
      )
      listingTranslationsRef.current = listingTranslationsRef.current.filter(
        (row) => Number(row.listingId) !== Number(listing.listingId),
      )
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
      if (String(draftListingId) === String(listing.listingId)) {
        setDraftListingId(null)
        setWizardStage('interview')
      }
      setPendingDelete(null)
      setDeleteDetailsOpen(false)
      setDeleteOutcome(null)
      setDeleteFinalPrice('')
      setNotice(t('notice.deleted', { title: listing.title }))
    } catch (err) {
      setNotice(t('notice.deleteFailed', { message: err.message }))
    } finally {
      setDeleting(false)
    }
  }

  // Open a category interview in the wizard modal. Switching categories abandons
  // the wizard's edit/preview draft for the previous category.
  function selectInterview(interviewId, { keepDrawerOpen = false } = {}) {
    setCategoryDirty(false) // a plain category pick is not a browse change
    setSelectedChatId(null)
    // Interview ids are the category ids as strings, whatever the caller passes.
    setSelectedInterviewId(interviewId == null ? null : String(interviewId))
    setDraftListingId(null)
    setTranslationsOpen(false)
    setAnswerModal(null)
    setWizardOpen(interviewId != null)
    if (!keepDrawerOpen) setDrawerOpen(false)
    setWizardStage('interview')
    resetDraft()
  }

  // (f) Chat row click. Opening from the drawer also persists the read flag on
  // the signed-in user's side (the listing link for an owner).
  function selectChat(chatId) {
    const chat = chats.find((c) => c.id === chatId)
    if (!chat) return
    navigate('/app')
    setSelectedInterviewId(String(chat.categoryId)) // parent interview is highlighted too
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

  // The listing that receives interview answers and the listing orientation:
  // the selected drawer listing, otherwise the draft created on Next. Before a
  // draft exists the answers stay in local state and are flushed when Next
  // creates the inactive listing.
  function interviewTargetListingId(interview) {
    const selectedListing = selectedListingId
      ? myListings.find((listing) => String(listing.listingId) === String(selectedListingId))
      : null
    if (selectedListing && String(selectedListing.categoryId) === String(interview.id)) {
      return selectedListing.listingId
    }
    const draft = draftListingId
      ? myListings.find(
          (listing) =>
            String(listing.listingId) === String(draftListingId) &&
            String(listing.categoryId) === String(interview.id),
        )
      : null
    return draft?.listingId ?? null
  }

  // Required facet questions gate Next/Publish. Orientation and condition are
  // always required; the backend can mark more facets as required.
  function requiredQuestionsMissing(interview = selectedInterview) {
    return (interview?.questions ?? []).filter(
      (question) => question.required && answers[question.id] == null,
    )
  }

  // Per-language titles: the UI language's title, then English, then any.
  function titlesForListing(listingId) {
    const titles = {}
    for (const row of listingTranslations) {
      if (Number(row.listingId) === Number(listingId)) titles[row.language] = row.title
    }
    return titles
  }

  function titleForListing(listingId, lang = language) {
    const titles = titlesForListing(listingId)
    return titles[lang] ?? titles.en ?? Object.values(titles)[0] ?? ''
  }

  function generatedTitle(interview, listingId) {
    return `${interview.title} #${listingId}`
  }

  // Upsert one title translation and refresh the model so drawer/result titles
  // pick up the change. Returns the saved row, or null on failure.
  async function saveListingTitle(listingId, lang, text) {
    const title = String(text ?? '').trim()
    if (!listingId || !title) return null

    setSavingTitle(true)
    try {
      const saved = await api.create(
        'listing-translations',
        { listingId: Number(listingId), language: lang, title },
        user?.id,
      )
      // Patch the title in the already-mounted model instead of triggering a
      // data reload (a reload would reset the wizard's local answers). The ref
      // keeps sequential translation saves (modal) consistent.
      const nextRows = [
        ...listingTranslationsRef.current.filter(
          (row) =>
            !(
              Number(row.listingId) === Number(saved.listingId) &&
              row.language === saved.language
            ),
        ),
        saved,
      ]
      listingTranslationsRef.current = nextRows
      setListingTranslations(nextRows)

      const nextTitles = {}
      for (const row of nextRows) {
        if (Number(row.listingId) === Number(saved.listingId)) {
          nextTitles[row.language] = row.title
        }
      }
      const displayTitle =
        nextTitles[language] ?? nextTitles.en ?? Object.values(nextTitles)[0] ?? ''
      setMyListings((prev) =>
        prev.map((listing) =>
          Number(listing.listingId) === Number(saved.listingId)
            ? { ...listing, title: displayTitle || listing.title, titles: nextTitles }
            : listing,
        ),
      )
      setChats((prev) =>
        prev.map((chat) =>
          Number(chat.listingId) === Number(saved.listingId)
            ? { ...chat, title: displayTitle || chat.title }
            : chat,
        ),
      )
      setBrowseData((prev) => {
        const next = {}
        for (const [key, node] of Object.entries(prev)) {
          next[key] = {
            ...node,
            items: node.items.map((item) =>
              item.type === 'listing' &&
              Number(item.id) === Number(saved.listingId)
                ? { ...item, title: displayTitle || item.title, titles: nextTitles }
                : item,
            ),
          }
        }
        return next
      })
      return saved
    } catch (err) {
      setNotice(t('notice.titleFailed', { message: err.message }))
      return null
    } finally {
      setSavingTitle(false)
    }
  }

  // Fill in the generated title for the current language when a listing has no
  // row for it yet (existing listings, or a language added after the draft).
  async function ensureDefaultTitle(interview, listingId) {
    if (titlesForListing(listingId)[language]) return
    await saveListingTitle(listingId, language, generatedTitle(interview, listingId))
  }

  // Pressing Next opens the edit step. A new listing is materialised as an
  // inactive draft first, so the edit screen can save images and translations.
  // Pressing Next again reuses that draft instead of creating another one.
  async function openEditStage() {
    if (!selectedInterview || !user || creatingDraft || publishing) return
    // Step 1 asks only these two questions; other required facets are answered
    // later from the dashboard and still gate Publish on the last step.
    const orientationQuestion = selectedInterview.questions.find(
      (question) => question.facet === 'orientation',
    )
    const conditionQuestion = selectedInterview.questions.find(
      (question) => question.facet === 'condition',
    )
    if (
      orientationQuestion &&
      answers[orientationQuestion.id] == null
    ) {
      setNotice(t('interview.requiredMissing'))
      return
    }
    if (conditionQuestion && answers[conditionQuestion.id] == null) {
      setNotice(t('interview.requiredMissing'))
      return
    }

    let target = wizardTargetListing()
    if (!target) {
      setCreatingDraft(true)
      try {
        const orientation = answers.orientation ?? 'sell'
        const price = answers.price != null ? Number(answers.price) : null
        const year = answers.year != null ? Number(answers.year) : null
        const created = await api.create(
          'listings',
          {
            categoryId: selectedInterview.categoryId,
            regionId: regionId ?? 0,
            orientation,
            userId: user.id,
            isActive: false,
            price,
            year,
          },
          user.id,
        )

        const titleText = generatedTitle(selectedInterview, created.id)
        let titleRow = null
        try {
          titleRow = await api.create(
            'listing-translations',
            { listingId: created.id, language, title: titleText },
            user.id,
          )
          listingTranslationsRef.current = [
            ...listingTranslationsRef.current,
            titleRow,
          ]
          setListingTranslations(listingTranslationsRef.current)
        } catch (err) {
          setNotice(t('notice.titleFailed', { message: err.message }))
        }

        // Persist the answers chosen during the interview on the new draft.
        const createdSelections = []
        for (const question of selectedInterview.questions ?? []) {
          if (question.type === 'numeric' || question.facet === 'orientation') continue
          const optionId = Number(answers[question.id])
          if (!Number.isFinite(optionId)) continue
          try {
            createdSelections.push(
              await api.create(
                'facet-value-selections',
                { facetValueOptionId: optionId, listingId: created.id },
                user.id,
              ),
            )
          } catch (err) {
            setNotice(t('notice.answerFailed', { message: err.message }))
          }
        }
        if (createdSelections.length > 0) {
          setSelections((prev) => [...prev, ...createdSelections])
        }

        const answered = (selectedInterview.questions ?? []).filter(
          (question) => answers[question.id] != null,
        )
        const answerTexts = answered
          .filter((question) => question.facet !== 'orientation')
          .map((question) =>
            question.type === 'numeric'
              ? `${question.text}: ${answers[question.id]}${question.unit ? ` ${question.unit}` : ''}`
              : question.options.find(
                  (option) => option.id === String(answers[question.id]),
                )?.text,
          )
          .filter(Boolean)
        const listingAnswers = Object.fromEntries(
          answered.map((question) => [
            question.id,
            question.type === 'numeric'
              ? answers[question.id]
              : String(answers[question.id]),
          ]),
        )
        const titles = titleRow ? { [language]: titleRow.title } : {}

        setDraftListingId(created.id)
        setMyListings((prev) => [
          ...prev,
          {
            id: String(created.id),
            listingId: created.id,
            categoryId: selectedInterview.categoryId,
            orientation,
            isActive: false,
            price,
            year,
            facetsCount: created.facetsCount,
            facetsCountMax: selectedInterview.facetsCountMax,
            facetsCountMaxAnswerable: selectedInterview.facetsCountMaxAnswerable,
            title: titleRow?.title ?? titleText,
            iconSvg: selectedInterview.iconSvg ?? null,
            titles,
            desc: [
              t(orientation === 'buy' ? 'direction.buy' : 'direction.sell'),
              ...answerTexts,
            ].join(' · '),
            answers: listingAnswers,
          },
        ])
        target = { listingId: created.id }
      } catch (err) {
        setNotice(t('notice.draftFailed', { message: err.message }))
        return
      } finally {
        setCreatingDraft(false)
      }
    } else {
      await ensureDefaultTitle(selectedInterview, target.listingId)
    }

    setWizardStage('edit')
  }

  // Replace the answer and persist it as a facet-value-selection. When a drawer
  // listing of this category is selected, its own selection is patched/created;
  // otherwise the category's first listing keeps the interview answers.
  async function answerQuestion(interview, questionId, value) {
    if (answers[questionId] === value || savingQuestionId === questionId) return

    const question = (interview.questions ?? []).find((row) => row.id === questionId)
    const previous = answers[questionId]
    const listingId = interviewTargetListingId(interview)

    setAnswers((prev) => {
      const next = { ...prev }
      if (value == null) delete next[questionId]
      else next[questionId] = value
      return next
    })

    // Before the draft exists the answer is only local; Next creates the
    // inactive listing and flushes every answer to the backend.
    if (!listingId) return

    setSavingQuestionId(questionId)
    try {
      if (question?.type === 'numeric') {
        const field = question.facet === 'year' ? 'year' : 'price'
        const fieldValue = value == null ? null : Number(value)
        const updated = await api.update(
          'listings',
          listingId,
          { [field]: fieldValue },
          user?.id,
        )

        setMyListings((prev) =>
          prev.map((item) => {
            if (Number(item.listingId) !== Number(listingId)) return item
            const nextAnswers = { ...(item.answers ?? {}) }
            if (fieldValue == null) delete nextAnswers[questionId]
            else nextAnswers[questionId] = fieldValue
            return {
              ...item,
              [field]: fieldValue,
              facetsCount: updated.facetsCount,
              answers: nextAnswers,
            }
          }),
        )
        setBrowseData((prev) => {
          const next = {}
          for (const [key, node] of Object.entries(prev)) {
            next[key] = {
              ...node,
              items: node.items.map((item) =>
                item.type === 'listing' && String(item.id) === String(listingId)
                  ? {
                      ...item,
                      [field]: fieldValue,
                      facetsCount: updated.facetsCount,
                    }
                  : item,
              ),
            }
          }
          return next
        })
      } else if (question?.facet === 'orientation') {
        // Orientation is a facet in the UI but is stored on the listing itself.
        const updated = await api.update(
          'listings',
          listingId,
          { orientation: value },
          user?.id,
        )

        setMyListings((prev) =>
          prev.map((item) =>
            Number(item.listingId) === Number(listingId)
              ? {
                  ...item,
                  orientation: updated.orientation,
                  desc: withOrientationLabel(item.desc, updated.orientation, t),
                  answers: {
                    ...(item.answers ?? {}),
                    orientation: updated.orientation,
                  },
                }
              : item,
          ),
        )
        setBrowseData((prev) => {
          const next = {}
          for (const [key, node] of Object.entries(prev)) {
            next[key] = {
              ...node,
              items: node.items.map((item) =>
                item.type === 'listing' && String(item.id) === String(listingId)
                  ? {
                      ...item,
                      orientation: updated.orientation,
                      desc: withOrientationLabel(item.desc, updated.orientation, t),
                    }
                  : item,
              ),
            }
          }
          return next
        })
      } else {
        const existing = selections.find(
          (selection) =>
            selection.listingId === listingId &&
            optionSchema[selection.facetValueOptionId] === Number(questionId),
        )

        if (existing) {
          const updated = await api.update(
            'facet-value-selections',
            existing.id,
            { facetValueOptionId: Number(value) },
            user?.id,
          )
          setSelections((prev) => prev.map((selection) => (selection.id === updated.id ? updated : selection)))
        } else {
          const created = await api.create(
            'facet-value-selections',
            { facetValueOptionId: Number(value), listingId },
            user?.id,
          )
          setSelections((prev) => [...prev, created])
        }
      }
    } catch (err) {
      // Roll the answer back so the UI matches what the backend actually stored.
      setAnswers((prev) => {
        const next = { ...prev }
        if (previous == null) delete next[questionId]
        else next[questionId] = previous
        return next
      })
      setNotice(t('notice.answerFailed', { message: err.message }))
    } finally {
      setSavingQuestionId(null)
    }
  }

  // Persist text messages and show the saved row once; attachments stay local.
  async function sendMessage(chatId, message) {
    const chat = chats.find((c) => c.id === chatId)
    if (!chat || !user) return

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
      setNotice(t('notice.messageFailed', { message: err.message }))
    }
  }

  // Search text that was committed without picking a facet value. The parent
  // keeps it visible to the user instead of silently dropping it.
  function handleCommitSearchText(text) {
    setNotice(t('search.commitText', { text }))
  }

  // Unmatched search tokens are logged for taxonomy improvement. They are never
  // written to a listing or treated as free-text search.
  function handleUnmatchedSearchToken(token) {
    try {
      const key = 'kiosk-unmatched-search-tokens'
      const stored = JSON.parse(localStorage.getItem(key) ?? '[]')
      const rows = Array.isArray(stored) ? stored : []
      rows.push({ token, lang: language, categoryId: searchCategoryId || null, at: new Date().toISOString() })
      localStorage.setItem(key, JSON.stringify(rows.slice(-50)))
    } catch {
      // Logging is best-effort; the input stays usable.
    }
  }

  function openModal(name) {
    setModal(name)
    setDrawerOpen(false)
  }

  // Sign out: drop the stored kiosk user id and return to the login screen.
  // Sign out: revoke the server session; user-scoped state and live streams are
  // discarded. The language and theme preferences stay on the device.
  async function signOut() {
    try {
      await api.logout()
    } catch {
      // Signing out locally still works when the API is unreachable.
    }
    setAuthUser(null)
    setAuthChecked(true)
    setDrawerOpen(false)
    setModal(null)
    setReloadToken((n) => n + 1)
    navigate('/login', { replace: true })
  }

  // Guests reach the sign-in form from the drawer, the profile or the interview
  // and return to the same screen afterwards.
  function signIn() {
    navigate('/login', { state: { from: `${location.pathname}${location.search}` } })
  }

  const selectedInterview =
    interviews.find((s) => String(s.id) === String(selectedInterviewId)) || null
  const selectedChat = chats.find((c) => c.id === selectedChatId) || null
  const wizardStepNumber =
    wizardStage === 'preview' ? 3 : wizardStage === 'edit' ? 2 : 1
  const wizardModalTitle = t('wizard.modalTitle', { step: wizardStepNumber })

  // Images shown by the wizard: saved rows for the edited listing plus the
  // browser-local picks for a listing that has not been published yet.
  const wizardTarget = wizardTargetListing()
  const wizardImages = [
    ...listingImages
      .filter((image) => wizardTarget && image.listingId === wizardTarget.listingId)
      .map((image) => ({
        id: image.id,
        name: `Listing image ${image.id}`,
        url: mediaUrl(image.url),
        isPrimary: image.primaryImage,
      })),
    ...draftImages.map((image) => ({
      id: image.id,
      name: image.name,
      url: image.url,
      isPrimary: image.isPrimary,
    })),
  ]

  const wizardListingId = wizardTarget?.listingId ?? draftListingId
  const wizardTitles = wizardListingId ? titlesForListing(wizardListingId) : {}
  const wizardTitle = wizardTitles[language] ?? ''
  const wizardTitlePlaceholder =
    selectedInterview && wizardListingId
      ? generatedTitle(selectedInterview, wizardListingId)
      : ''

  // Flat, de-duplicated listing list for the /search suggestions.
  const searchListings = (() => {
    const seen = new Set()
    const rows = []
    for (const node of Object.values(browseData)) {
      for (const item of node?.items ?? []) {
        if (item.type !== 'listing' || seen.has(item.id)) continue
        seen.add(item.id)
        rows.push(item)
      }
    }
    return rows
  })()

  // Listing detail page (/listing/:id) reads from the same flat list the search
  // results use, so a bookmarked URL works after a full reload.
  const listingPageItem = isListingRoute
    ? (searchListings.find((item) => String(item.id) === String(listingRouteId)) ?? null)
    : null

  // Seller statistics: the screen shown on /app. A listing picked in the drawer
  // wins; otherwise the post-publish screen shows the listing just published.
  // With neither, `/app` asks the user to pick one (no implicit "newest" ad).
  const selectedOwnListing =
    selectedListingId != null
      ? (myListings.find(
          (listing) => String(listing.listingId) === String(selectedListingId),
        ) ?? null)
      : null
  const publishedListing =
    publishedListingId != null
      ? (myListings.find(
          (listing) => String(listing.listingId) === String(publishedListingId),
        ) ?? null)
      : null
  const featuredListing = selectedOwnListing ?? publishedListing
  const featuredIsJustPublished =
    publishedListing != null && featuredListing === publishedListing
  const featuredCategoryTitle = featuredListing
    ? (interviews.find(
        (interview) =>
          String(interview.categoryId) === String(featuredListing.categoryId),
      )?.title ?? '')
    : ''
  const featuredImage =
    featuredListing != null
      ? (listingImages.find(
          (image) =>
            String(image.listingId) === String(featuredListing.listingId) &&
            image.primaryImage,
        ) ??
        listingImages.find(
          (image) => String(image.listingId) === String(featuredListing.listingId),
        ) ??
        null)
      : null
  const sellerStats = featuredListing
    ? buildSellerStats({
        myListings,
        chats,
        listingId: featuredListing.listingId,
      })
    : null
  const featuredPriceStats = featuredListing
    ? pricePosition({ listing: featuredListing, catalog: searchListings })
    : null
  const featuredChecklist = featuredListing
    ? listingChecklist({
        listing: featuredListing,
        imageCount: listingImages.filter(
          (image) => String(image.listingId) === String(featuredListing.listingId),
        ).length,
        titles: titlesForListing(featuredListing.listingId),
        languages: languages.map((row) => row.code),
      })
    : []
  // The overview owns the main area while no other screen is active. The wizard
  // is a modal, so it does not hide the dashboard behind it.
  const showsSellerOverview =
    featuredListing != null &&
    !selectedChat &&
    !isSearchRoute &&
    !isResultsRoute &&
    !isListingRoute

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

  const answeredCount = selectedInterview
    ? selectedInterview.questions.filter((q) => answers[q.id] != null).length
    : 0
  const missingRequired = requiredQuestionsMissing(selectedInterview)
  const canPublish =
    !!user &&
    !!selectedInterview &&
    missingRequired.length === 0 &&
    (categoryDirty || answeredCount > 0)

  // Step 1 asks exactly two questions: orientation and condition. Other
  // required facets are answered from the dashboard and gate Publish only.
  const stepOneCondition = selectedInterview?.questions.find(
    (question) => question.facet === 'condition',
  )
  const canContinueStepOne =
    !!user &&
    answers.orientation != null &&
    (!stepOneCondition || answers[stepOneCondition.id] != null)

  // Step 1 actions: "Next >" continues to the wizard's edit step.
  const stepOneActions = (
    <div className="action-row">
      <div className="action-buttons">
        {!user && (
          <button type="button" className="btn secondary" onClick={signIn}>
            {t('interview.signInToPublish')}
          </button>
        )}
        <button
          type="button"
          className="btn primary"
          onClick={openEditStage}
          disabled={!canContinueStepOne || publishing || creatingDraft}
          title={!canContinueStepOne ? t('interview.requiredMissing') : undefined}
        >
          {creatingDraft ? t('interview.creatingDraft') : t('interview.next')}
        </button>
      </div>
    </div>
  )

  // Edit step: "< Previous" returns to the interview; "Next >" opens preview.
  const editActions = (
    <div className="action-row">
      <button type="button" className="btn secondary" onClick={() => setWizardStage('interview')}>
        {t('interview.previous')}
      </button>
      <div className="action-buttons">
        <button
          type="button"
          className="btn primary"
          onClick={() => setWizardStage('preview')}
          disabled={savingTitle}
        >
          {t('interview.next')}
        </button>
      </div>
    </div>
  )

  // Preview step: "< Previous" returns to the edit step; Publish writes the
  // listing and shows the report dialog.
  const previewActions = (
    <div className="action-row">
      <button type="button" className="btn secondary" onClick={() => setWizardStage('edit')}>
        {t('interview.previous')}
      </button>
      <div className="action-buttons">
        <button
          type="button"
          className="btn success"
          onClick={publish}
          disabled={publishing || !canPublish || savingTitle}
          title={missingRequired.length > 0 ? t('interview.requiredMissing') : undefined}
        >
          {publishing ? t('interview.publishing') : t('interview.publish')}
        </button>
      </div>
    </div>
  )

  const profileBody =
    dataStatus === 'loading' ? (
      <p>{t('profile.loading')}</p>
    ) : user ? (
      <div className="profile-details">
        <dl>
          <div>
            <dt>{t('profile.name')}</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>{t('profile.email')}</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>{t('profile.role')}</dt>
            <dd>{user.role}</dd>
          </div>
          <div>
            <dt>{t('profile.status')}</dt>
            <dd>{user.isActive ? t('profile.active') : t('profile.inactive')}</dd>
          </div>
          <div>
            <dt>{t('profile.userId')}</dt>
            <dd>{user.id}</dd>
          </div>
        </dl>
        <ConnectGoogleRow from="/app" />
        <p className="profile-note">{t('profile.note')}</p>
      </div>
    ) : (
      <p>{isLoggedIn ? t('profile.noUsers') : t('profile.guest')}</p>
    )

  // Never render the signed-in shell before `/auth/me` answers, and never for a
  // guest: the guard effect above is already sending them to the login form.
  if (isAppRoute && (!authChecked || !isLoggedIn)) {
    return (
      <div className="loading-screen">
        <LoadingIndicator />
      </div>
    )
  }

  return (
    <div className="app">
      <TopBar
        onMenu={toggleDrawer}
        onOpenModal={openModal}
        onAddListing={addListing}
        theme={theme}
        onToggleTheme={toggleTheme}
        languages={languages}
      />

      {notice && (
        <div className="app-notice" role="status">
          <AlertIcon size={18} />
          <span>{notice}</span>
          <button
            type="button"
            className="icon-btn notice-close"
            aria-label={t('common.close')}
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
          onCreateNew={browseNewListing}
          onOpenMessages={() => openModal('messages')}
          onOpenSettings={() => openModal('settings')}
          onOpenSignups={() => openModal('signups')}
          onSignOut={signOut}
          unreadCount={unreadTotal}
          signedIn={isLoggedIn}
          onSignIn={signIn}
          user={user}
        />

        {/* Clicking the main content (outside the drawer) closes it. */}
        <main className="main" onMouseDown={drawerOpen ? () => setDrawerOpen(false) : undefined}>
          {/* A reload after publishing refreshes the catalog in the background;
              the post-publish screen already has everything it needs. */}
          {dataStatus === 'loading' && !showsSellerOverview ? (
            <LoadingIndicator />
          ) : dataStatus === 'error' ? (
            <ErrorPlaceholder message={loadError} onRetry={() => setReloadToken((n) => n + 1)} />
          ) : isResultsRoute ? (
            <ResultsView
              listings={searchListings}
              categories={interviews}
              selections={selections}
              regions={regions}
              currentUserId={isLoggedIn ? user?.id : null}
              onContact={isLoggedIn ? contactListing : null}
              contactingId={contactingListingId}
            />
          ) : isListingRoute ? (
            <ListingPage
              listing={listingPageItem}
              categories={interviews}
              selections={selections}
              images={listingImages}
              users={users}
              currentUserId={isLoggedIn ? user?.id : null}
              isLoggedIn={isLoggedIn}
              onContact={isLoggedIn ? contactListing : null}
              contactingId={contactingListingId}
            />
          ) : isSearchRoute ? (
            <SearchView
              listings={searchListings}
              categories={interviews}
              selections={selections}
              categoryId={searchCategoryId}
              currentUserId={isLoggedIn ? user?.id : null}
              regions={regions}
              regionId={regionId ?? 0}
              onRegionChange={changeRegion}
              onCommitText={handleCommitSearchText}
              onUnmatchedToken={handleUnmatchedSearchToken}
              onOpenBrowse={() => {
                setBrowseFor('search')
                setModal('browse')
              }}
            />
          ) : selectedChat ? (
            <ChatView chat={selectedChat} onSend={sendMessage} liveStatus={liveStatus} />
          ) : showsSellerOverview ? (
            <PublishSuccessView
              variant={featuredIsJustPublished ? 'published' : 'dashboard'}
              listing={featuredListing}
              categoryTitle={featuredCategoryTitle}
              imageUrl={featuredImage?.url ?? null}
              stats={sellerStats}
              priceStats={featuredPriceStats}
              checklist={featuredChecklist}
              onPublishAnother={browseNewListing}
              onImproveQuestions={() => openAnswerQuestions(featuredListing)}
              onEditListing={() => openWizardForListing(featuredListing, 'edit')}
            />
          ) : myListings.length > 0 ? (
            <SelectListingPlaceholder onOpenDrawer={() => setDrawerOpen(true)} />
          ) : (
            <EmptyPlaceholder
              hasInterviews={interviews.length > 0}
              signedIn={isLoggedIn}
              onBrowse={() => {
                setBrowseFor('listing')
                setModal('browse')
              }}
            />
          )}
        </main>
      </div>

      {translationsOpen && wizardListingId && selectedInterview && (
        <TranslateTitlesModal
          languages={languages}
          titles={wizardTitles}
          fallbackTitle={wizardTitlePlaceholder}
          saving={savingTitle}
          onSave={(lang, text) =>
            saveListingTitle(wizardListingId, lang, text)
          }
          onClose={() => setTranslationsOpen(false)}
        />
      )}

      {wizardOpen && selectedInterview && (
        <div className="modal-overlay">
          <div
            className="modal-card wizard-modal"
            role="dialog"
            aria-modal="true"
            aria-label={wizardModalTitle}
          >
            <header className="modal-head">
              <h2>{wizardModalTitle}</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('common.close')}
                onClick={closeWizard}
              >
                <XIcon />
              </button>
            </header>

            <div className="wizard-modal-body">
              {wizardStage === 'edit' ? (
                <EditListingView
                  interview={selectedInterview}
                  language={language}
                  title={wizardTitle}
                  titlePlaceholder={wizardTitlePlaceholder}
                  savingTitle={savingTitle}
                  onSaveTitle={(text) =>
                    saveListingTitle(wizardListingId, language, text)
                  }
                  onOpenTranslate={() => setTranslationsOpen(true)}
                  images={wizardImages}
                  onAddImages={addImages}
                  onRemoveImage={removeImage}
                  onSetPrimary={setPrimaryImage}
                  uploading={uploadingImages}
                  actions={editActions}
                />
              ) : wizardStage === 'preview' ? (
                <PreviewListingView
                  interview={selectedInterview}
                  title={wizardTitle || wizardTitlePlaceholder}
                  answers={answers}
                  images={wizardImages}
                  actions={previewActions}
                />
              ) : (
                <WizardQuestionsStep
                  interview={selectedInterview}
                  answers={answers}
                  onAnswer={(questionId, value) =>
                    answerQuestion(selectedInterview, questionId, value)
                  }
                  actions={stepOneActions}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {answerModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeAnswerQuestions()
          }}
        >
          <div
            className="modal-card wizard-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('questions.title')}
          >
            <header className="modal-head">
              <h2>{t('questions.title')}</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label={t('common.close')}
                onClick={closeAnswerQuestions}
              >
                <XIcon />
              </button>
            </header>

            <div className="wizard-modal-body">
              <InterviewView
                interview={answerModal.interview}
                answers={answerModal.draft}
                onAnswer={(questionId, value) =>
                  setAnswerModal((prev) => {
                    if (!prev) return prev
                    const draft = { ...prev.draft }
                    if (value == null) delete draft[questionId]
                    else draft[questionId] = value
                    return { ...prev, draft }
                  })
                }
                actions={
                  <div className="action-row">
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={closeAnswerQuestions}
                        disabled={savingAnswers}
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        type="button"
                        className="btn primary"
                        onClick={applyAnswerChanges}
                        disabled={savingAnswers || answerChanges.length === 0}
                      >
                        {savingAnswers
                          ? t('questions.saving')
                          : t('questions.apply')}
                      </button>
                    </div>
                  </div>
                }
              />
            </div>
          </div>
        </div>
      )}

      {modal === 'browse' && (
        <BrowseModal
          data={browseData}
          startId={browseFor === 'search' && searchCategoryId ? searchCategoryId : 'root'}
          onClose={() => setModal(null)}
          onPick={handleBrowsePick}
        />
      )}
      {modal === 'signups' && <SignupsModal onClose={() => setModal(null)} />}
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
      {modal === 'signin' && (
        <SimpleModal
          title={t('topbar.signInToPublish')}
          body={<p className="signin-message">{t('topbar.signInToPublishBody')}</p>}
          footer={
            <>
              <button type="button" className="btn secondary" onClick={() => setModal(null)}>
                {t('common.cancel')}
              </button>
              <button type="button" className="btn primary" onClick={signIn}>
                {t('drawer.signIn')}
              </button>
            </>
          }
          onClose={() => setModal(null)}
        />
      )}
      {modal && !['browse', 'messages', 'signups', 'signin'].includes(modal) && (
        <SimpleModal
          title={t(MODAL_TITLES[modal])}
          body={modal === 'profile' ? profileBody : t('settings.body')}
          footer={
            modal === 'profile' && isLoggedIn ? (
              <button type="button" className="btn secondary" onClick={signOut}>
                {t('drawer.signOut')}
              </button>
            ) : modal === 'profile' ? (
              <button type="button" className="btn primary" onClick={signIn}>
                {t('drawer.signIn')}
              </button>
            ) : undefined
          }
          onClose={() => setModal(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmModal
          title={t('delete.title')}
          message={t('delete.message')}
          detail={t('delete.detail', { title: pendingDelete.title })}
          confirmLabel={t('delete.confirm')}
          busyLabel={t('delete.busy')}
          busy={deleting}
          wide={deleteDetailsOpen}
          detailsExpanded={deleteDetailsOpen}
          detailsLabel={t('delete.details')}
          onDetails={() => setDeleteDetailsOpen(true)}
          onConfirm={confirmDeleteListing}
          onClose={closeDeleteDialog}
        >
          {deleteDetailsOpen && (
            <div className="delete-details">
              <p className="field-label">{t('delete.outcome')}</p>
              <div className="chips">
                {(DELETE_OUTCOMES[pendingDelete.orientation] ?? []).map(
                  (outcome) => (
                    <button
                      key={outcome}
                      type="button"
                      className={
                        deleteOutcome === outcome ? 'chip selected' : 'chip'
                      }
                      aria-pressed={deleteOutcome === outcome}
                      onClick={() => {
                        setDeleteOutcome(outcome)
                        if (!PRICED_OUTCOMES.has(outcome)) setDeleteFinalPrice('')
                      }}
                    >
                      {t(DELETE_OUTCOME_LABELS[outcome])}
                    </button>
                  ),
                )}
              </div>

              {PRICED_OUTCOMES.has(deleteOutcome) && (
                <label className="delete-sold-price">
                  <span className="field-label">
                    {t(
                      deleteOutcome === 'purchased'
                        ? 'delete.purchasePrice'
                        : 'delete.soldPrice',
                    )}
                  </span>
                  <span className="delete-sold-price-row">
                    <input
                      className="q-number-input"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={deleteFinalPrice}
                      placeholder={
                        pendingDelete.price != null ? String(pendingDelete.price) : ''
                      }
                      onChange={(event) => setDeleteFinalPrice(event.target.value)}
                    />
                    <span className="q-number-unit">€</span>
                  </span>
                </label>
              )}
            </div>
          )}
        </ConfirmModal>
      )}

    </div>
  )
}

function WizardQuestionsStep({ interview, answers, onAnswer, actions }) {
  const { t } = useI18n()
  const orientation = interview.questions.find((q) => q.facet === 'orientation')
  const condition = interview.questions.find((q) => q.facet === 'condition')
  const questions = [
    orientation && { question: orientation, label: t('wizard.sellOrBuy') },
    condition && { question: condition, label: t('wizard.condition') },
  ].filter(Boolean)

  return (
    <section className="wizard-view" aria-label={t('wizard.questionsAria')}>
      <div className="wizard-scroll wizard-questions">
        {questions.map(({ question, label }) => (
          <div className="wizard-question" key={question.id}>
            <h3 className="wizard-question-text">{label}</h3>
            <div className="chips">
              {question.options.map((option) => {
                const chosen = answers[question.id] === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={chosen ? 'chip selected' : 'chip'}
                    aria-pressed={chosen}
                    onClick={() => onAnswer(question.id, option.id)}
                  >
                    {option.text}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      {actions ? (
        <footer className="wizard-footer">{actions}</footer>
      ) : (
        <footer className="wizard-footer" aria-hidden="true" />
      )}
    </section>
  )
}

function LoadingIndicator() {
  const { t } = useI18n()
  return (
    <div className="loading-indicator" role="status" aria-live="polite" aria-busy="true">
      <span className="spinner" aria-hidden="true" />
      <span>{t('common.loading')}</span>
    </div>
  )
}

function ErrorPlaceholder({ message, onRetry }) {
  const { t } = useI18n()
  return (
    <div className="placeholder">
      <span className="placeholder-icon error">
        <AlertIcon size={56} />
      </span>
      <h2>{t('error.title')}</h2>
      <p>{message}</p>
      <p>{t('error.hint')}</p>
      <button type="button" className="btn primary" onClick={onRetry}>
        {t('error.retry')}
      </button>
    </div>
  )
}

function EmptyPlaceholder({ hasInterviews, onBrowse, signedIn = false }) {
  const { t } = useI18n()
  return (
    <div className="placeholder">
      <span className="placeholder-icon">
        <LayersIcon size={56} />
      </span>
      {hasInterviews ? (
        <>
          {signedIn && (
            <>
              <h2>{t('empty.signedInTitle')}</h2>
              <p>{t('empty.signedInBody')}</p>
            </>
          )}
          <button type="button" className="btn primary" onClick={onBrowse}>
            {t(signedIn ? 'empty.publishFirst' : 'empty.browse')}
          </button>
        </>
      ) : (
        <p>{t('empty.noCategories')}</p>
      )}
    </div>
  )
}

function SelectListingPlaceholder({ onOpenDrawer }) {
  const { t } = useI18n()
  return (
    <div className="placeholder">
      <span className="placeholder-icon">
        <LayersIcon size={56} />
      </span>
      <h2>{t('dashboard.selectTitle')}</h2>
      <p>{t('dashboard.selectBody')}</p>
      <button type="button" className="btn primary" onClick={onOpenDrawer}>
        {t('dashboard.openListings')}
      </button>
    </div>
  )
}

/**
 * App shell.
 *
 * The optional props are filled by the server entry with a page's preloaded
 * data and dictionaries. A plain client-side boot leaves them out, and the app
 * fetches everything after mount like before.
 */
export default function App({
  initialData = null,
  initialStrings = null,
  initialLanguage = null,
  initialTheme,
  initialUserId,
}) {
  return (
    <LanguageProvider
      initialLanguage={initialLanguage}
      initialStrings={initialStrings}
    >
      <div className="app">
        <Routes>
          <Route path="/" element={<Navigate to="/search" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route
            path="/app"
            element={
              <KioskApp
                initialData={initialData}
                initialTheme={initialTheme}
                initialUserId={initialUserId}
              />
            }
          />
          <Route
            path="/search"
            element={
              <KioskApp
                initialData={initialData}
                initialTheme={initialTheme}
                initialUserId={initialUserId}
              />
            }
          />
          <Route
            path="/results"
            element={
              <KioskApp
                initialData={initialData}
                initialTheme={initialTheme}
                initialUserId={initialUserId}
              />
            }
          />
          <Route
            path="/listing/:id"
            element={
              <KioskApp
                initialData={initialData}
                initialTheme={initialTheme}
                initialUserId={initialUserId}
              />
            }
          />
          <Route path="*" element={<Navigate to="/search" replace />} />
        </Routes>
      </div>
    </LanguageProvider>
  )
}
