# Kiosk (React)

A session & chat interface with an overlay drawer, converted from the original
single-file vanilla JS spec into a **React + Vite** application.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## Structure

| Spec section | Where it lives |
| --- | --- |
| DATA (sessions, questions, chats, browseData) | `src/data.js` |
| STATE (drawer, selection, answers, messages, modals) | `src/App.jsx` |
| ICONS (inline SVG string → components) | `src/icons.jsx` |
| RENDER functions (components) | `src/components/*.jsx` |
| INIT (mount) | `src/main.jsx` |

## Feature map

- **Top bar** — centered title; hamburger; browse/messages/settings/profile icons opening modals.
- **Drawer** — overlay slide-in, 340px (full-width ≤600px), sessions → chats (2 levels),
  unread badges, caret expansion, all interaction rules (d)–(g) from the spec,
  expansion preserved across open/close cycles.
- **Session view** — per-session progress bar, priority-sorted product questions,
  wrapping chips (replace-only answers), green answered accents, empty bottom bar.
- **Chat view** — WhatsApp-style bubbles with timestamps, paperclip popover
  (Image / YouTube / GPS placeholders), Enter-to-send, in-memory persistence.
- **Browse modal** — breadcrumbs, categories first with ">" navigation, listings after,
  2-line clamped descriptions, single-select toggle, Buy/Sell with alerts.
- **Other modals** — Messages / Settings / Profile placeholders; close on X, overlay, ESC.
- **UX** — light theme, rounded corners, transitions (drawer, modal, chips, caret),
  thin scrollbars, responsive rules, aria-labels and keyboard support.
