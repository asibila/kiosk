# Kiosk (React)

A session & chat interface with an overlay drawer, converted from the original
single-file vanilla JS spec into a **React + Vite** application.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

The UI reads live data from the NestJS backend. Start it first on
`http://localhost:3000`:

```bash
cd ../backend
npm run start:dev
```

Vite proxies `/api/*` to `http://localhost:3000` in both dev and preview, so the
browser never hits a cross-origin request. Set `VITE_API_BASE_URL` to use a
different base path (it replaces the default `/api` verbatim, so point it at a
same-origin path or an API host that allows CORS):

```bash
VITE_API_BASE_URL=/backend npm run dev
```

## Structure

| Spec section | Where it lives |
| --- | --- |
| API client + resource loader | `src/api.js` |
| Backend rows → sessions / chats / browse tree | `src/viewModel.js` |
| STATE (drawer, selection, answers, messages, modals) | `src/App.jsx` |
| ICONS (inline SVG string → components) | `src/icons.jsx` |
| RENDER functions (components) | `src/components/*.jsx` |
| INIT (mount) | `src/main.jsx` |
| Legacy static seed (no longer rendered) | `src/data.js` |

## Backend mapping

| Backend resource | UI use |
| --- | --- |
| `users` | Profile modal (first user is the signed-in user) |
| `categories` + `descriptions` | Drawer sessions, browse tree |
| `facet-schemas` + `facet-value-options` | Interview questions and answer chips |
| `facet-value-selections` | Saved answers (on the category's first listing) |
| `chat-threads` + `chat-messages` | Chat view and the Messages modal |
| `inbox-items` | Which chat threads appear in the signed-in user's Messages |
| `listing-chat-threads` | Maps each chat thread to its listing/category |
| `listing-images` | Listing images metadata; the primary image is the search thumbnail |
| `listings` | Browse listings; drawer child rows are the signed-in user's listings |

## Feature map

- **Screen shell** - routes: `/` (home / log-in entry), `/login`, `/app` (kiosk
  listings + wizard + chat) and `/search` (standalone search). `/app` and `/search`
  share the same shell (`KioskApp`) with the usual topbar, drawer and modals; only
  the main area differs.
- **Home** - `/` redirects straight to `/search`; `/login` renders the log-in form
  (`src/components/Login.jsx`) and, after a successful sign-in, returns to `/search`.
- **Top bar** - centered title; hamburger; profile icon and theme toggle (moon/sun)
  on the right. Create-new-listing, Messages and Settings live at the bottom of the
  drawer.
- **Search screen** (`/search`) - three centred rows: "Search kiosk", a search box
  with listing-title autocomplete (filtered by the selected category, direction and
  facets), and a row with mutually exclusive Buy/Sell chips, a category button and
  a **Filter** button. The category button opens the shared **Browse** modal
  to pick a category (it reopens at the current one); choosing "Home" and OK resets
  it to "All categories". **Filter** opens a modal with the interview questions
  for the selected category (all categories when none is selected); chosen options
  refine the suggestions and the button shows the active facet count. Picking a
  suggestion fills the box; the topbar's usual actions keep working, and choosing a
  listing from the drawer navigates back to `/app`.
- **New listing** - the drawer's **New listing** action opens the Browse modal to
  choose a category; OK clears the selected category/listing and interview answers
  locally (no API call) and opens that category's interview, so the next Publish
  creates a fresh listing. Cancel keeps the current screen unchanged.
- **Dark mode** — toggles between light and dark palettes, follows the OS preference on first
  visit, and remembers the choice in `localStorage` (`kiosk-theme`).
- **Drawer** - overlay slide-in, 340px (full-width ≤600px), a flat list of the signed-in
  user's listings (from `GET /listings` filtered by `userId`), empty state when none.
  Selecting a listing expands its chat threads from `listing-chat-threads` underneath it
  (thread id plus last-message preview); clicking one opens that conversation on the main
  screen. Each row has a delete button that asks "Are you sure?" before calling
  `DELETE /listings/:id`. The bottom of the drawer holds three full-width actions —
  **New listing** (+), **Messages** (envelope/message icon, with the unread badge) and
  **Settings** (gear). When nobody is signed in, the drawer shows a **Sign in**
  button (linking to `/login`) instead of the listings and these actions.
- **Session view** — per-session progress bar, priority-sorted product questions,
  wrapping chips (replace-only answers), green answered accents, and an action bar with
  left-aligned, mutually exclusive Buy/Sell chips plus right-aligned Search and a
  "Next >" button into the listing wizard. The Buy/Sell chips write
  `Listing.orientation` (`buy` / `sell`) on the same listing that receives the answers,
  opening a drawer listing preselects its stored orientation, and both Search and
  "Next >" stay disabled until Buy or Sell is chosen. Answers are saved to
  `facet-value-selections` on the selected drawer listing (or the category's first
  listing when none is selected).
  Search results show an envelope action per listing; clicking it creates a new
  `chat-threads` row linked through `listing-chat-threads` and an `inbox-items` row in the
  signed-in user's inbox. The envelope is grayed out and disabled on the user's own listings.
- **Listing wizard** - after the interview: **Edit** (image grid with upload,
  remove and "make primary"; editing a saved listing uploads immediately, a new
  listing keeps its picks locally until Publish), **Preview** (answered facets,
  images) with **Publish**, then a report dialog ("Listing created, thank you
  for using kiosk.") over the starting screen. "< Previous" moves back a step
  at every stage. Search results show the listing's primary image as a small
  thumbnail (the glyph remains when a listing has no image).
- **Chat view** - WhatsApp-style bubbles with timestamps, paperclip popover
  (Image / YouTube / GPS placeholders), Enter-to-send. Text messages are POSTed
  to `chat-messages`; attachment placeholders stay local. The conversation header
  names the other participant and shows a live status dot. New messages arrive
  over `GET /chat-events/stream` (SSE) and appear without a page reload; unread
  badges show on the topbar message icon, the Messages dialog rows
  (`InboxItem.hasUnread`) and the drawer chat threads under a listing
  (`ListingChatThread.hasUnread`). Opening a conversation clears the flags
  through `PATCH` on both entities.
- **Browse modal** — breadcrumbs, categories first with ">" navigation, listings after,
  2-line clamped descriptions, single-select toggle, Buy/Sell with alerts.
- **Messages modal** — one row per `inbox-items` entry, showing the linked listing's
  name and description like the drawer; opening one slides in its chat thread inside
  the modal, with a "<" back arrow left of the "Messages" title.
- **Other modals** — Settings placeholder; Profile shows the live backend user; close on X,
  overlay, ESC.
- **UX** — loading/error placeholders with retry, transient save notices, light/dark themes,
  rounded corners, transitions (drawer, modal, chips, caret), thin scrollbars, responsive
  rules, aria-labels and keyboard support.
