// INIT — entry point. Mounts the React application.
//
// When the page was rendered by the server entry, `window.__KIOSK_BOOT__`
// carries the data and dictionaries that produced its markup. In that case the
// existing DOM is hydrated instead of replaced; a plain client boot has no boot
// payload and creates the tree as before.
import React from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'
import './index.css'

// A deploy replaces the precached app shell. When the new service worker takes
// control, reload once so the tab switches from the cached (old) bundle to the
// new one. The first install has no controller yet, so it does not reload.
if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller)
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  })
}

const boot = window.__KIOSK_BOOT__ ?? null

const tree = (
  <React.StrictMode>
    <BrowserRouter>
      <App
        initialData={boot?.data ?? null}
        initialStrings={boot?.strings ?? null}
        initialLanguage={boot?.language ?? null}
        initialTheme={boot ? (boot.theme ?? null) : undefined}
        // No boot payload: read the signed-in user from storage during render,
        // as plain client-side rendering always did.
        initialUserId={boot ? (boot.userId ?? null) : undefined}
      />
    </BrowserRouter>
  </React.StrictMode>
)

const container = document.getElementById('root')

if (container.hasChildNodes()) {
  hydrateRoot(container, tree)
} else {
  createRoot(container).render(tree)
}
