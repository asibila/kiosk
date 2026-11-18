// Server render entry.
//
// Only the render itself lives here: `server.js` (or tests) loads the data and
// calls `renderApp`. Keeping JSX out of `server.js` means the Node process can
// load this module through Vite in development and from the SSR bundle in
// production, while the data/head helpers stay plain JS.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import App from './App.jsx'

/**
 * Render the application for one URL with preloaded data.
 *
 * No effects run on the server, so `App` renders exactly what the browser will
 * hydrate: the same catalog snapshot and dictionaries must be passed to the
 * client in `window.__KIOSK_BOOT__`.
 *
 * @param {{url: string, data: any, strings: any, language?: string}} input
 * @returns {{html: string}}
 */
export function renderApp({ url, data, strings, language = 'en' }) {
  const html = renderToString(
    <StaticRouter location={url}>
      <App
        initialData={data}
        initialStrings={strings}
        initialLanguage={language}
        initialTheme={null}
      />
    </StaticRouter>,
  )
  return { html }
}
