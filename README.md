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
| `listings` | Browse listings; drawer child rows are the signed-in user's listings |

## Feature map

- **Home screen** — `/` (the only route for now) renders the log-in entry: a single
  **Log in** button (`src/components/Home.jsx`, wired through React Router in
  `src/App.jsx` and `src/main.jsx`).
- **Top bar** — centered title; hamburger; create-new-listing, browse, messages, settings and
  profile icons; theme toggle (moon/sun) on the right.
- **New listing** — the plus button clears the selected category/listing and interview answers
  locally (no API call) and returns to “No category selected”, so the next Publish creates a
  fresh listing.
- **Dark mode** — toggles between light and dark palettes, follows the OS preference on first
  visit, and remembers the choice in `localStorage` (`kiosk-theme`).
- **Drawer** - overlay slide-in, 340px (full-width ≤600px), a flat list of the signed-in
  user's listings (from `GET /listings` filtered by `userId`), empty state when none.
  Selecting a listing expands its chat threads from `listing-chat-threads` underneath it
  (thread id plus last-message preview); clicking one opens that conversation on the main
  screen. Each row has a delete button that asks "Are you sure?" before calling
  `DELETE /listings/:id`.
- **Session view** — per-session progress bar, priority-sorted product questions,
  wrapping chips (replace-only answers), green answered accents, and an action bar with
  left-aligned, mutually exclusive Buy/Sell chips plus right-aligned Search and a
  "Next >" button into the listing wizard. Answers are saved to `facet-value-selections`
  on the selected drawer listing (or the category's first listing when none is selected).
  Search results show an envelope action per listing; clicking it creates a new
  `chat-threads` row linked through `listing-chat-threads` and an `inbox-items` row in the
  signed-in user's inbox. The envelope is grayed out and disabled on the user's own listings.
- **Listing wizard** — after the interview: **Edit** (description compose area, any number
  of image uploads, browser-local previews), **Preview** (answered facets, description,
  images) with **Publish**, then a report dialog ("Listing created, thank you for using
  kiosk.") over the starting screen. "< Previous" moves back a step at every stage.
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
