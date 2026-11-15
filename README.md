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
| `chat-threads` + `chat-messages` | Drawer chats and the Messages modal |
| `inbox-lists` + `inbox-items` | Which chat threads appear in Messages |
| `listing-chat-threads` | Maps each chat thread to its listing/category |
| `listings` | Browse listings; titles are `<Category> #<id>` |

## Feature map

- **Home screen** — `/` (the only route for now) renders the log-in entry: a single
  **Log in** button (`src/components/Home.jsx`, wired through React Router in
  `src/App.jsx` and `src/main.jsx`).
- **Top bar** — centered title; hamburger; browse/messages/settings/profile icons opening modals;
  theme toggle (moon/sun) on the right.
- **Dark mode** — toggles between light and dark palettes, follows the OS preference on first
  visit, and remembers the choice in `localStorage` (`kiosk-theme`).
- **Drawer** — overlay slide-in, 340px (full-width ≤600px), sessions → chats (2 levels),
  unread badges, caret expansion, all interaction rules (d)–(g) from the spec,
  expansion preserved across open/close cycles.
- **Session view** — per-session progress bar, priority-sorted product questions,
  wrapping chips (replace-only answers), green answered accents, empty bottom bar.
  Answers are saved to `facet-value-selections` on the category's first listing.
- **Chat view** — WhatsApp-style bubbles with timestamps, paperclip popover
  (Image / YouTube / GPS placeholders), Enter-to-send. Text messages are POSTed
  to `chat-messages`; attachment placeholders stay local.
- **Browse modal** — breadcrumbs, categories first with ">" navigation, listings after,
  2-line clamped descriptions, single-select toggle, Buy/Sell with alerts.
- **Messages modal** — centered title, scrollable inbox of sessions that have conversations;
  opening one slides in its chat screen, with a "<" back arrow to return to the list.
- **Other modals** — Settings placeholder; Profile shows the live backend user; close on X,
  overlay, ESC.
- **UX** — loading/error placeholders with retry, transient save notices, light/dark themes,
  rounded corners, transitions (drawer, modal, chips, caret), thin scrollbars, responsive
  rules, aria-labels and keyboard support.
