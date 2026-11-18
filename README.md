# Kiosk (React)

An interview & chat interface with an overlay drawer, converted from the original
single-file vanilla JS spec into a **React + Vite** application.

## Run

```bash
npm install
npm run dev      # SSR server + Vite middleware, https://localhost:5173
npm run dev:spa  # plain Vite SPA (no server render), for quick UI work
npm run build    # client build in dist/ + SSR bundle in .ssr/
npm start        # production server (needs the build above)
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

The production deployment is a **Node web service** (`kiosk-ssr`) that serves the
built client and server-renders listing pages:

| Setting | Value |
| --- | --- |
| Build command | `npm ci && npm run build` (client `dist/` + SSR `.ssr/`) |
| Start command | `npm start` (`node server.js`) |
| Runtime env | `API_URL`, `PUBLIC_ORIGIN`, optionally `PUBLIC_API_URL` |
| Build env | `VITE_API_BASE_URL` (baked into the browser bundle) |

`server.js` renders `/listing/:id`, answers `/robots.txt`, `/sitemap.xml` and
`/healthz`, serves the client routes (`/`, `/search`, `/results`, `/app`,
`/login`) as the SPA shell, and returns a real 404 for anything else. See
**Server-side rendering** below.

The legacy static site (`kiosk-9j6p`) still runs from this same repository: it
uses the plain `vite build` output and the `render.yaml` rewrite rules, and it
does not need the Node server. Keep `render.yaml` in sync only if that site is
still deployed.

In production the frontend and the API run on different origins, so the build
calls the API directly instead of using the Vite `/api` proxy. The default
production API is `https://kiosk-api-znxy.onrender.com`; set
`VITE_API_BASE_URL` at build time to point somewhere else.

The app uses `BrowserRouter`, so a static host should rewrite unknown paths to
`index.html`. On Render, add these rules under **Redirects/Rewrites** for the
static site, **in this order** (or apply `render.yaml`):

| Source | Destination | Action |
| --- | --- | --- |
| `/api/*` | `https://kiosk-api-znxy.onrender.com/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

The first rule keeps older cached bundles working by proxying their `/api/*`
requests to the backend. It must come before the SPA fallback.

Without the second rule, opening or refreshing `/listing/:id` returns a 404
instead of the app. The fixed routes (`/search`, `/results`, `/login`, `/app`)
also get their own `index.html` shell at build time, so they load on hosts that
only serve existing files. `/listing/:id` still needs the rewrite.

The API also has to allow the frontend origin through CORS; `FRONTEND_ORIGINS`
overrides the defaults in the backend's `src/main.ts` (the defaults include both
`kiosk-9j6p` and `kiosk-ssr`).

## Structure

| Spec section | Where it lives |
| --- | --- |
| API client + resource loader | `src/api.js` |
| Backend rows → interviews / chats / browse tree | `src/viewModel.js` |
| Pure translations: dictionaries, `translate()`, language cookie | `src/strings.js` |
| React language provider (strings loaded from `GET /descriptions`) | `src/i18n.jsx` |
| Sign-in / signup screens | `src/components/Login.jsx`, `src/components/Signup.jsx` |
| Google sign-in button | `src/components/GoogleAuthButton.jsx` |
| Profile: connect Google | `src/components/ConnectGoogleRow.jsx` |
| Terms of service / privacy notice | `src/components/Terms.jsx`, `src/components/Privacy.jsx` |
| Admin: recent signups | `src/components/SignupsModal.jsx` |
| Server-side page data (catalog cache, `/results`, `/listing/:id`) | `src/data.server.js` |
| HTTP server (SSR routes, static files, robots/sitemap, 404/503) | `server.js` |
| Server render entry (`renderToString` + `StaticRouter`) | `src/entry-server.jsx` |
| Head tags, Open Graph, JSON-LD, HTML document | `src/server-head.js` |
| Post-publish screen + seller statistics | `src/components/PublishSuccessView.jsx`, `src/sellerStats.js` |
| Structured search input | `src/components/FacetChipInput.jsx` |
| Suggestion fetch (debounce/abort/stale discard) | `src/useFacetSuggestions.js` |
| Chip/suggestion JSDoc types + range formatting | `src/facetTypes.js` |
| Search URL encoding/parsing + result filtering | `src/searchQuery.js` |
| Listing detail page | `src/components/ListingPage.jsx` |
| Listing title translations | `src/components/TranslateTitlesModal.jsx` |
| STATE (drawer, selection, answers, messages, modals) | `src/App.jsx` |
| ICONS (inline SVG string → components) | `src/icons.jsx` |
| Category icons (stored SVG + fallback glyph) | `src/icons.jsx` (`CategoryIcon`), `src/viewModel.js` |
| RENDER functions (components) | `src/components/*.jsx` |
| INIT (mount) | `src/main.jsx` (hydrates when the server supplied `window.__KIOSK_BOOT__`) |
| Legacy static seed (no longer rendered) | `src/data.js` |

## Backend mapping

| Backend resource | UI use |
| --- | --- |
| `users` | Profile modal (first user is the signed-in user) |
| `categories` + `descriptions` | Drawer interviews and browse tree use descriptions by id; descriptions with a `name` are the UI translation dictionary loaded at startup |
| `languages` | Codes/names for the topbar EN/HR switcher |
| `regions` + `/regions/detect` | Search region title/picker; detection is resolved by the API from the visitor's IP |
| `facet-schemas` + `facet-value-options` | Interview questions and answer chips |
| `facet-value-selections` | Saved answers (on the category's first listing) |
| `/suggest` (`GET /api/suggest`) | Facet-value autocomplete + counts for the search chip input |
| `chat-threads` + `chat-messages` | Chat view and the Messages modal |
| `inbox-items` | Which chat threads appear in the signed-in user's Messages |
| `listing-chat-threads` | Maps each chat thread to its listing/category |
| `listing-images` | Listing images metadata; the primary image is the search thumbnail |
| `listings` | Browse listings; drawer child rows are the signed-in user's listings |

## Server-side rendering

`/listing/:id` is rendered on the server so the page is complete for crawlers
(title, price, description, facets, seller, image) and hydrates into the normal
SPA. Everything else stays a client-rendered route.

| Piece | Where |
| --- | --- |
| HTTP server, routes, static files, 404/503, robots + sitemap | `server.js` |
| Render entry (`renderToString` + `StaticRouter`) | `src/entry-server.jsx` |
| Head tags, Open Graph, JSON-LD, document assembly | `src/server-head.js` |
| Page data (catalog cache, `loadListingPage`) | `src/data.server.js` |
| SSR bundle build | `vite.ssr.config.js` → `.ssr/entry-server.js` |

How a request flows:

1. `server.js` calls `loadListingPage(id)` (`null` → 404, drafts are private).
2. `renderApp()` renders `<StaticRouter>` + `App` with `initialData`,
   `initialStrings` and `initialLanguage` — no effects, no fetch.
3. `buildListingHead()` emits `<title>`, description, canonical, `hreflang`
   alternates (en/hr), Open Graph/Twitter tags and schema.org `Product` +
   `BreadcrumbList` JSON-LD.
4. `renderDocument()` fills the `<!--ssr-head-->` / `<!--ssr-outlet-->` markers in
   `index.html` and injects `window.__KIOSK_BOOT__`; `main.jsx` hydrates when the
   payload exists and boots with `createRoot` otherwise.

Details worth knowing:

- **Guest render only.** The server never forwards the visitor's cookies to the
  API, so the HTML is identical for everyone and safe to cache
  (`s-maxage=60`). Signed-in content (own drafts, chats) is fetched after
  hydration, which is why an unknown or draft id returns 404 *and* still boots
  the SPA — the owner's browser can recover.
- **Language** comes from `?lang=` (validated: `en`, `hr`), then the
  `kiosk-language` cookie, then English. `hreflang` links both variants.
- **Hydration** keeps the server markup while the browser refreshes the catalog
  in the background (`App` only shows the loading placeholder on a cold start),
  so a server-rendered page does not flash a spinner.
- **The boot payload contains the catalog snapshot** the render used (the same
  rows `fetchKioskData` would fetch). It is shared with the client so hydration
  matches; pruning it to the listing's own rows is a future size optimisation.
- **The service worker** denylists `/listing/*`, `/sitemap.xml` and
  `/robots.txt`, so a cached app shell can never replace a server-rendered page.
- `server.js` runs Vite in middleware mode with `npm run dev` (HMR for the SSR
  entry) and serves `dist/` + `.ssr/` with `npm start`.

Tests: `src/server-head.test.js` (head/JSON-LD/escaping), `src/entry-server.test.jsx`
(render output), `server.test.js` (routes, 404/503, robots/sitemap via supertest).

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
GET /api/suggest?q=<text>&lang=<en|hr>&category=<id>&chips=<JSON>
-> { suggestions: [{ facet, facetLabel, valueId, label, count }] }
```

The legacy `orientation=<buy|sell>` parameter is still accepted, but the
frontend sends an orientation value chip instead. The request is debounced
250 ms, aborted when a newer token starts, and stale responses are discarded.
The backend computes counts from `FacetValueSelection` rows, never from ad free
text, and omits values with a zero count. Orientation chips filter
`Listing.orientation`; range chips are carried in the query and applied to the
listing's price/year fields. Range chips are created from the **Filter** modal's
ALL section.

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
  (`src/components/Login.jsx`) and `/signup` the registration form
  (`src/components/Signup.jsx`). Sign-in sets an HTTP-only `kiosk_session`
  cookie via `POST /auth/login`; signup does the same through
  `POST /auth/register`, so the account is signed in immediately. The app then
  returns to the page that requested sign-in (or to `/app`, the seller
  overview, when nothing specific was requested). `/terms` and `/privacy` render the plain-language terms and privacy
  notice, linked from the signup checkbox. No user id is kept in
  `localStorage`; guests skip the private chat/inbox resources when loading
  the catalog.
  `/results?...` renders the bookmarkable results page described below and
  `/listing/:id` renders one listing.
  Admins (role `ADMIN`) get a **Signups** action in the drawer that lists the
  most recent accounts (`GET /users` returns full rows to admins).
  Both screens also offer **Continue with Google** (`src/components/GoogleAuthButton.jsx`),
  which links to `GET /auth/google`; the API runs the OAuth flow and redirects
  back with the session cookie set. If the Google email already belongs to a
  password account the site shows "sign in with your password instead" — it
  never links silently while signup emails are unverified.
  Existing password accounts can attach Google afterwards: the **Profile** modal
  has **Connect Google** (`src/components/ConnectGoogleRow.jsx` → `GET
  /auth/google?link=1`), which links the identity only when the Google email
  matches the account; `GET /auth/providers` drives the "Connected" badge, and
  the outcome comes back as `?google=connected` (or an error) shown in the
  notice banner.
- **Top bar** - centered title (a link back to `/search`); hamburger; on the
  right a **+** button that starts a new listing, then the **EN / HR** language
  dropdown, profile icon and theme toggle (moon/sun). Signed-in users start a
  new listing right away when the current search already has a category;
  otherwise they get the Browse modal to pick one. Guests get the drawer plus a
  "Please sign in to publish" prompt. Messages and Settings live at the bottom
  of the drawer.
- **Language** - the topbar dropdown changes the interface and every backend
  description (categories, facet questions and options) between English and
  Croatian. English is the default; the choice is written to the
  `kiosk-language` cookie (so a server render can read it) and mirrored in
  `localStorage`, and applied to `<html lang>`. Descriptions are fetched with
  both translations (`{ en, hr }`) from `/descriptions`, so switching does not
  lose the interview answers currently being edited. The dictionaries are
  passed through React context, never held in a module variable, so two
  requests with different languages cannot overwrite each other.
- **Search screen** (`/search`) - the title is a **Search \<region\>** button:
  the region comes from `GET /regions/detect` (IP-based, `0` when unknown) and
  the dialog lists **All regions** first plus every seeded country; the choice
  is remembered in `localStorage`, limits the search to that region (a country
  excludes global listings, "All regions" searches everything) and tags new
  listings with `regionId`. The input is a structured **facet chip** field,
  not a free-text ad search. Committed chips are facet values (`valueId`) or
  numeric ranges; typing opens a grouped suggestion list from
  `GET /api/suggest` (scoped to language, category and existing chips).
  Keyboard: arrows move the highlight, Enter selects/chips the token, Escape
  closes, Tab selects the first suggestion, Backspace on empty removes the last
  chip. Each chip has a 32px ✕ target; the same chip set is edited by the
  **Filter** modal. The modal starts with an **ALL** section holding the shared
  interview questions in order: **For Sale / Wanted**, **Condition**, **Price**
  and **Year**, plus any other generic value facets. Facets are then grouped by
  the selected category's ancestor chain, root first: selecting **Mobile phones**
  shows **ALL** (orientation, condition, price, year), **ELECTRONICS** (brand)
  and **MOBILE PHONES** (screen size). A parent category's facets therefore apply
  to all of its subcategories. Suggestion counts update politely via an
  `aria-live` region; unmatched tokens are reported to the parent once (and
  logged under `kiosk-unmatched-search-tokens`). The field has a fixed 52px
  height: chips wrap and the rows scroll with the wheel or ↑/↓, and the blue
  magnifier button inside it submits the search. The category button opens the
  shared **Browse** modal (reopening at the current category); choosing "Home"
  and OK resets it to "All categories".
  Each category draws its `iconSvg` from `GET /categories` through
  `CategoryIcon` (inline SVG, sized by a wrapper); when a category has no icon
  the old title-based glyph is used, read from the **English** description so a
  translated UI keeps the same icon. The same icon is the fallback thumbnail for
  listings without a photo and the row icon in the drawer's listing list.
  The **Filter** button shows the active chip count (values and ranges). The
  topbar's usual actions keep working, and choosing a listing from the drawer
  navigates back to `/app`. The form also mirrors its query into `/search`'s URL
  (`?category=&facet=&range=`) with `replace`, so the address bar is bookmarkable
  and Back from the results page restores the same form.
- **Search results** (`/results`) - pressing **Search** opens a GET-style results
  URL that serializes the whole query as `category`, `region`, `facet=<name>:<valueId>`
  and `range=<facet>:<min>-<max>` parameters. Reloading, bookmarking or sharing that
  URL reproduces the search; only ids are encoded, so labels are resolved again
  from the catalog in the active language. A `region` parameter keeps only
  listings tagged with that region (global listings are excluded); without it
  every region is searched. The page shows the active filters, a
  result count and responsive cards (primary image, title, matched facet summary,
  orientation badge). Clicking a card opens its listing page; cards also offer
  the same envelope action as the listings modal (disabled for the signed-in
  user's own listings). A category filter includes its subcategories. **Edit
  search** carries the same query back to `/search`. Range chips filter the
  listing's price/year fields; an orientation chip filters `Listing.orientation`
  directly. The legacy `direction` parameter is still read for old bookmarks.
  The topbar **+** starts a new listing in the searched category with the active
  filters already answered (see **New listing**).
- **Listing page** (`/listing/:id`) - bookmarkable detail page for one listing:
  primary image with a thumbnail gallery, orientation/category badges, the
  listing's facet values, category, seller, listed date and the contact action.
  Own listings show an owner note instead of contact; guests get a sign-in link
  that returns to the same listing after login. Opened from results, the back
  link restores that exact `/results?…` query; a direct or bookmarked visit falls
  back to "Back to search". A deleted or unknown id shows a not-found state.
  After hydration the page sends one `POST /listings/:id/view` beacon (skipped
  for the owner), which the API dedupes per visitor and day and filters for bots.
  Owners in turn see that listing's counters — `12 views · 2 contacts` — fetched
  from `GET /listings/:id/stats`; the server-rendered HTML never contains them.
- **New listing** - the topbar **+** button (and the drawer's **New listing**
  action) start a listing. On `/search` and `/results` the query already
  describes it: when the search has a category (`category>0`), that category's
  interview opens directly and the selected filters pre-answer its questions
  (condition, orientation, the category facets, and price/year - a range answers
  with the middle of the range, or with its one open bound). Options that do not
  belong to the interview are dropped. Only an "all categories" search
  (`category=0` or no category) asks for a category in the Browse modal; a
  category picked there still inherits the generic filter answers. From `/app`
  the Browse modal is always used. OK clears the selected category/listing and
  interview answers locally before applying the new ones. Guests who press **+**
  see the drawer with a "Please sign in to publish" prompt instead. Cancel keeps
  the current screen unchanged. Pressing **Next >** materialises an inactive
  draft (`isActive: false`), creates its UI-language title and saves the
  interview answers on it.
- **Dark mode** — toggles between light and dark palettes, follows the OS preference on first
  visit, and remembers the choice in `localStorage` (`kiosk-theme`).
- **Drawer** - overlay slide-in, 340px (full-width ≤600px), a flat list of the signed-in
  user's listings (from `GET /listings` filtered by `userId`), empty state when none.
  Selecting a listing expands its chat threads from `listing-chat-threads` underneath it
  (thread id plus last-message preview); clicking one opens that conversation on the main
  screen. Each row has a delete button that asks "Are you sure?" before calling
  `DELETE /listings/:id`. The bottom of the drawer holds four full-width actions —
  **New listing** (+), **Messages** (envelope/message icon, with the unread badge),
  **Settings** (gear) and **Sign out** (exit icon). Sign out calls
  `POST /auth/logout` (revoking the HTTP-only session cookie), closes the
  drawer/modal and returns to `/login`; the language and theme preferences are
  kept. The **Profile** modal also has a **Sign out** footer button. When nobody
  is signed in, the drawer shows a **Sign in** button (linking to `/login`)
  instead of the listings and these actions.
- **Interview view** - per-interview progress bar, priority-sorted product questions,
  wrapping chips (replace-only answers), green answered accents, and an action bar
  with right-aligned Search and a "Next >" button into the listing wizard. The
  first four shared questions are **For Sale / Wanted**, **Condition**, **Price**
  and **Year**; orientation, condition, price and year questions come from the
  generic (ALL PRODUCTS) section, followed by the category's own facets and its
  ancestors' facets. **For Sale / Wanted** and **Condition** are required, shown
  with a Required badge, and "Next >"/Publish stay disabled until they are
  answered. The orientation answer writes `Listing.orientation` (`buy` / `sell`)
  on the same listing that receives the answers; opening a drawer listing
  preselects its stored orientation. Other answers are saved to
  `facet-value-selections` on the selected drawer listing or the draft created by
  **Next >**; before that draft exists they stay in component state and are
  flushed when the draft is created. After the draft exists, answers save
  immediately. Drafts are shown in the drawer in italic with a **Draft** marker.
  Search results show an envelope action per listing; clicking it creates a new
  `chat-threads` row linked through `listing-chat-threads` and an `inbox-items` row in the
  signed-in user's inbox. The envelope is grayed out and disabled on the user's own listings.
- **Listing wizard** - after the interview: **Edit** (per-language title with
  **Translate**, image grid with upload, remove and "make primary"), **Preview**
  (answered facets, title, images) with **Publish**, then the post-publish screen
  (see **Post-publish** below).
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
- **Post-publish** (`/app`, right after Publish) - replaces the old starting
  screen and its "Listing created" dialog. The same view is also the **seller
  overview** for a signed-in visitor: with no ad just published it is titled
  **Your seller overview** and features the newest active ad (or newest draft);
  without any listings `/app` shows a "Publish your first ad" placeholder. It
  shows the featured listing's card
  (primary image, title, category, price, completeness score) with **View
  listing** (the bookmarkable `/listing/:id`) and **Publish another** (back to
  category Browse), then the seller's own numbers: **Views** (last 14 days, from
  `GET /listings/:id/stats`, charted per day in its own panel), **Active ads**,
  **Contacts** (chat threads on the user's listings) and **Unread**, a 14-day
  contacts bar chart from `ChatThread.createdAt` (falling back to a "no contacts
  yet" hint),
  a price-position track that places the listing's price between the cheapest
  and dearest active ad in its category (with the median), and a **Make it stand
  out** checklist for photos, title translations and unanswered questions. The
  checklist's **Finish** buttons reopen the interview
  (`App.openListing`) or its **Edit** step for that listing. The publish reload
  runs in the background so the screen does not flash a loading placeholder
  (`src/components/PublishSuccessView.jsx`, `src/sellerStats.js`).
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
  2-line clamped descriptions, single-select toggle and orientation badges.
- **Messages modal** — one row per `inbox-items` entry, showing the linked listing's
  name and description like the drawer; opening one slides in its chat thread inside
  the modal, with a "<" back arrow left of the "Messages" title.
- **Other modals** — Settings placeholder; Profile shows the live backend user; close on X,
  overlay, ESC.
- **UX** — loading/error placeholders with retry, transient save notices, light/dark themes,
  rounded corners, transitions (drawer, modal, chips, caret), thin scrollbars, responsive
  rules, aria-labels and keyboard support.
