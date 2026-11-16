# Kiosk (React)

A session & chat interface with an overlay drawer, converted from the original
single-file vanilla JS spec into a **React + Vite** application.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm test         # Vitest + Testing Library
```

The UI reads live data from the NestJS backend, so start it first:

```bash
cd ../backend
npm run start:dev
```

The browser always calls `/api` on the same origin. Vite proxies `/api/*` to
`VITE_API_PROXY_TARGET` in both dev and preview, so the browser never hits a
cross-origin request. That proxy target is the only backend setting and lives
in `.env` (copy `.env.example` if you don't have one):

```bash
VITE_API_PROXY_TARGET=http://localhost:3000
```

## Deployment

In production the frontend and the API run on different origins, so the build
calls the API directly instead of using the Vite `/api` proxy. The default
production API is `https://kiosk-api-znxy.onrender.com`; set
`VITE_API_BASE_URL` at build time to point somewhere else.

The app uses `BrowserRouter`, so the static host must rewrite unknown paths to
`index.html`. On Render, add this rule under **Redirects/Rewrites** for the
static site (or apply `render.yaml`):

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | Rewrite |

Without it, opening or refreshing `/search`, `/results` or `/listing/:id`
returns a 404 instead of the app. The API also has to allow the frontend origin
through CORS; `FRONTEND_ORIGINS` overrides the defaults in the backend's
`src/main.ts`.

## Structure

| Spec section | Where it lives |
| --- | --- |
| API client + resource loader | `src/api.js` |
| Backend rows → sessions / chats / browse tree | `src/viewModel.js` |
| UI translations + language provider | `src/i18n.jsx` |
| Structured search input | `src/components/FacetChipInput.jsx` |
| Suggestion fetch (debounce/abort/stale discard) | `src/useFacetSuggestions.js` |
| Chip/suggestion JSDoc types + range formatting | `src/facetTypes.js` |
| Search URL encoding/parsing + result filtering | `src/searchQuery.js` |
| Listing detail page | `src/components/ListingPage.jsx` |
| Listing title translations | `src/components/TranslateTitlesModal.jsx` |
| STATE (drawer, selection, answers, messages, modals) | `src/App.jsx` |
| ICONS (inline SVG string → components) | `src/icons.jsx` |
| RENDER functions (components) | `src/components/*.jsx` |
| INIT (mount) | `src/main.jsx` |
| Legacy static seed (no longer rendered) | `src/data.js` |

## Backend mapping

| Backend resource | UI use |
| --- | --- |
| `users` | Profile modal (first user is the signed-in user) |
| `categories` + `descriptions` | Drawer sessions, browse tree (translated per selected language) |
| `languages` | Codes/names for the topbar EN/HR switcher |
| `facet-schemas` + `facet-value-options` | Interview questions and answer chips |
| `facet-value-selections` | Saved answers (on the category's first listing) |
| `/suggest` (`GET /api/suggest`) | Facet-value autocomplete + counts for the search chip input |
| `chat-threads` + `chat-messages` | Chat view and the Messages modal |
| `inbox-items` | Which chat threads appear in the signed-in user's Messages |
| `listing-chat-threads` | Maps each chat thread to its listing/category |
| `listing-images` | Listing images metadata; the primary image is the search thumbnail |
| `listings` | Browse listings; drawer child rows are the signed-in user's listings |

## Facet chip input

`FacetChipInput` is a controlled component: `chips` + `onChange(chips)` is the
single source of truth. Each chip is one of:

```js
{ kind: 'value', facet: 'fuel', facetLabel: 'Fuel', valueId: '13', label: 'Diesel' }
{ kind: 'range', facet: 'price', facetLabel: 'Price', min: 5000, max: 10000, unit: '€' }
```

Internal state also tracks the typed token, suggestions, highlighted row and
loading/error. Suggestions come from:

```text
GET /api/suggest?q=<text>&lang=<en|hr>&category=<id>&orientation=<buy|sell>&chips=<JSON>
-> { suggestions: [{ facet, facetLabel, valueId, label, count }] }
```

The request is debounced 250 ms, aborted when a newer token starts, and stale
responses are discarded. The backend computes counts from `FacetValueSelection`
rows, never from ad free text, and omits values with a zero count. Range chips are
carried in the query but ignored by the backend until numeric facets exist; they
are created from the **Filter** modal's ALL section.

Accessibility: the input is a `combobox` with `aria-expanded`,
`aria-controls`, `aria-autocomplete="list"` and `aria-activedescendant`; the
dropdown is a `listbox` with `option` rows and presentation group headers. Chip
removal is a real button with an aria-label, and result counts are announced via
`aria-live="polite"`. Focus rings appear on the field, chips and options.

## Feature map

- **Screen shell** - routes: `/` (home / log-in entry), `/login`, `/app` (kiosk
  listings + wizard + chat) and `/search` (standalone search). `/app` and `/search`
  share the same shell (`KioskApp`) with the usual topbar, drawer and modals; only
  the main area differs.
- **Home** - `/` redirects straight to `/search`; `/login` renders the log-in form
  (`src/components/Login.jsx`) and, after a successful sign-in, returns to `/search`.
  `/results?...` renders the bookmarkable results page described below and
  `/listing/:id` renders one listing.
- **Top bar** - centered title (a link back to `/search`); hamburger; **EN / HR** language switch; profile icon
  and theme toggle (moon/sun) on the right. Create-new-listing, Messages and
  Settings live at the bottom of the drawer.
- **Language** - the topbar switch changes the interface and every backend
  description (categories, facet questions and options) between English and
  Croatian. English is the default; the choice is remembered in `localStorage`
  (`kiosk-language`) and applied to `<html lang>`. Descriptions are fetched with
  both translations (`{ en, hr }`) from `/descriptions`, so switching does not
  lose the interview answers currently being edited.
- **Search screen** (`/search`) - the input is a structured **facet chip** field,
  not a free-text ad search. Committed chips are facet values (`valueId`) or
  numeric ranges; typing opens a grouped suggestion list from
  `GET /api/suggest` (scoped to language, category, direction and existing chips).
  Keyboard: arrows move the highlight, Enter selects/chips the token, Escape
  closes, Tab selects the first suggestion, Backspace on empty removes the last
  chip. Each chip has a 32px ✕ target; the same chip set is edited by the
  **Filter** modal. The modal starts with an **ALL** section holding the generic
  **Price** and **Year** ranges plus generic value facets (condition). Facets are
  then grouped by the selected category's ancestor chain, root first: selecting
  **Mobile phones** shows **ALL** (price/year/condition), **ELECTRONICS**
  (brand) and **MOBILE PHONES** (screen size). With **All categories** selected,
  the modal shows only the generic Price and Year ranges. A parent category's
  facets therefore apply to all of its subcategories. Suggestion counts
  update politely via an `aria-live` region; unmatched tokens are reported to the
  parent once (and logged under `kiosk-unmatched-search-tokens`). The field wraps
  chips up to ~120px, then scrolls vertically; the dropdown is anchored to the
  field's bottom edge. The category button opens the shared **Browse** modal
  (reopening at the current category); choosing "Home" and OK resets it to
  "All categories". Buy/Sell chips remain beside the field, and the
  **Filter** button shows the active chip count (values and ranges). The topbar's
  usual actions keep working, and choosing a listing from the drawer navigates
  back to `/app`. The form also mirrors its query into `/search`'s URL
  (`?category=&direction=&facet=&range=`) with `replace`, so the address bar is
  bookmarkable and Back from the results page restores the same form.
- **Search results** (`/results`) - pressing **Search** opens a GET-style results
  URL that serializes the whole query as `category`, `direction`,
  `facet=<name>:<valueId>` and `range=<facet>:<min>-<max>` parameters. Reloading,
  bookmarking or sharing that URL reproduces the search; only ids are encoded, so
  labels are resolved again from the catalog in the active language. The page
  shows the active filters, a result count and responsive cards (primary image,
  title, matched facet summary, orientation badge). Clicking a card opens its
  listing page; cards also offer the same envelope action as the listings modal
  (disabled for the signed-in user's own listings). A category filter includes
  its subcategories. **Edit search** carries the same query back to `/search`.
  Range chips are preserved in the URL but not applied until numeric facet values
  exist in the catalog.
- **Listing page** (`/listing/:id`) - bookmarkable detail page for one listing:
  primary image with a thumbnail gallery, orientation/category badges, the
  listing's facet values, category, seller, listed date and the contact action.
  Own listings show an owner note instead of contact; guests get a sign-in link
  that returns to the same listing after login. Opened from results, the back
  link restores that exact `/results?…` query; a direct or bookmarked visit falls
  back to "Back to search". A deleted or unknown id shows a not-found state.
- **New listing** - the drawer's **New listing** action opens the Browse modal to
  choose a category; OK clears the selected category/listing and interview answers
  locally and opens that category's interview. Cancel keeps the current screen
  unchanged. Pressing **Next >** materialises an inactive draft (`isActive:
  false`), creates its UI-language title and saves the interview answers on it.
- **Dark mode** — toggles between light and dark palettes, follows the OS preference on first
  visit, and remembers the choice in `localStorage` (`kiosk-theme`).
- **Drawer** - overlay slide-in, 340px (full-width ≤600px), a flat list of the signed-in
  user's listings (from `GET /listings` filtered by `userId`), empty state when none.
  Selecting a listing expands its chat threads from `listing-chat-threads` underneath it
  (thread id plus last-message preview); clicking one opens that conversation on the main
  screen. Each row has a delete button that asks "Are you sure?" before calling
  `DELETE /listings/:id`. The bottom of the drawer holds four full-width actions —
  **New listing** (+), **Messages** (envelope/message icon, with the unread badge),
  **Settings** (gear) and **Sign out** (exit icon). Sign out removes
  `localStorage['kiosk-user-id']`, closes the drawer/modal and returns to `/login`;
  the language and theme preferences are kept. The **Profile** modal also has a
  **Sign out** footer button. When nobody is signed in, the drawer shows a **Sign in**
  button (linking to `/login`) instead of the listings and these actions.
- **Session view** — per-session progress bar, priority-sorted product questions,
  wrapping chips (replace-only answers), green answered accents, and an action bar with
  left-aligned, mutually exclusive Buy/Sell chips plus right-aligned Search and a
  "Next >" button into the listing wizard. A category's questions are its own facets,
  the facets of its ancestors and the generic facets (such as condition), so every
  category asks the generic questions and parent facets apply to subcategories.
  The Buy/Sell chips write
  `Listing.orientation` (`buy` / `sell`) on the same listing that receives the answers,
  opening a drawer listing preselects its stored orientation, and both Search and
  "Next >" stay disabled until Buy or Sell is chosen. Answers are saved to
  `facet-value-selections` on the selected drawer listing or the draft created by
  **Next >**; before that draft exists they stay in component state and are
  flushed when the draft is created. After the draft exists, answers save
  immediately. Drafts are shown in the drawer in italic with a **Draft** marker.
  Search results show an envelope action per listing; clicking it creates a new
  `chat-threads` row linked through `listing-chat-threads` and an `inbox-items` row in the
  signed-in user's inbox. The envelope is grayed out and disabled on the user's own listings.
- **Listing wizard** - after the interview: **Edit** (per-language title with
  **Translate**, image grid with upload, remove and "make primary"), **Preview**
  (answered facets, title, images) with **Publish**, then a report dialog
  ("Listing created, thank you for using kiosk.") over the starting screen.
  "< Previous" moves back a step at every stage.
  The **Next >** step creates the listing as an inactive draft; **Publish** sets
  `isActive: true`. Drafts are private to their owner in search/listing pages and
  render italic in the drawer. The title field shows the UI language's
  `ListingTranslation` (prefilled with `"Category #id"` when the draft is
  created); **Translate** opens a modal with one input per language from the
  `languages` table. Missing translations fall back to the UI language, English,
  any saved title, then the generated label. Editing a saved listing uploads
  images immediately; a draft keeps earlier picks local until Publish.
  Search results show the listing's primary image as a small
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
