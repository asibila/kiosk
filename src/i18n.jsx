// React binding for the translation helpers in `strings.js`.
//
// The dictionaries are passed around explicitly instead of living in a module
// variable: a Node process rendering pages for different visitors must not let
// one request overwrite another's language. `createStrings()` builds the
// dictionaries, `translate()` is pure, and `LanguageProvider` holds them for a
// single browser tab.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { loadDescriptions } from './api.js'
import {
  createStrings,
  createTranslator,
  DEFAULT_LANGUAGE,
  hasStrings,
  isSupportedLanguage,
  languageCookie,
  LANGUAGES,
  readLanguageCookie,
} from './strings.js'

export * from './strings.js'

// Legacy key from before the cookie existed; still read to keep an existing
// device's choice after the upgrade.
const LANGUAGE_KEY = 'kiosk-language'

/** Resolve the language before the first render in a browser. */
export function getInitialLanguage() {
  try {
    const fromCookie = readLanguageCookie(document.cookie)
    if (fromCookie) return fromCookie
  } catch {
    // Cookies can be unavailable; fall through to storage.
  }

  try {
    const stored = localStorage.getItem(LANGUAGE_KEY)
    if (isSupportedLanguage(stored)) return stored
  } catch {
    // localStorage can be unavailable (private mode, blocked storage).
  }

  return DEFAULT_LANGUAGE
}

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  strings: {},
  refreshStrings: () => {},
  t: (key) => key,
  languages: LANGUAGES,
})

/**
 * Holds the selected language and its dictionaries.
 *
 * `initialLanguage` and `initialStrings` come from the server render; when they
 * are absent (plain client-side rendering) the strings are fetched from
 * `/descriptions` before the children mount.
 */
export function LanguageProvider({
  children,
  initialLanguage = null,
  initialStrings = null,
}) {
  const [language, setLanguage] = useState(
    () => initialLanguage ?? getInitialLanguage(),
  )
  const [strings, setStrings] = useState(() => initialStrings ?? {})
  const [stringsReady, setStringsReady] = useState(() =>
    hasStrings(initialStrings),
  )

  // Keep the document, the cookie and the stored preference in sync. The cookie
  // is what lets the server render the right language on the next request.
  useEffect(() => {
    document.documentElement.lang = language
    try {
      document.cookie = languageCookie(language)
    } catch {
      // Cookies can be blocked; the language still applies to this visit.
    }
    try {
      localStorage.setItem(LANGUAGE_KEY, language)
    } catch {
      // Ignore storage failures; the language still applies to this visit.
    }
  }, [language])

  // Load the UI strings once. Children wait for them so no screen flashes raw
  // translation keys while the request is in flight.
  useEffect(() => {
    if (stringsReady) return undefined

    let cancelled = false
    loadDescriptions()
      .then((descriptions) => {
        if (cancelled) return
        setStrings(createStrings(descriptions))
        setStringsReady(true)
      })
      .catch(() => {
        // Render anyway; missing keys fall back to the key itself and the
        // existing backend error screen explains the connectivity problem.
        if (!cancelled) setStringsReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [stringsReady])

  // Ask for the dictionaries again after a failed request. The data reload that
  // follows an error uses this so a retry recovers the translations too. It does
  // not clear `stringsReady`: the app stays mounted while the request is redone.
  const refreshStrings = useCallback(() => {
    loadDescriptions()
      .then((descriptions) => {
        setStrings(createStrings(descriptions))
        setStringsReady(true)
      })
      .catch(() => {
        // Keep rendering with the keys; the caller shows the bigger error.
      })
  }, [])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      strings,
      refreshStrings,
      t: createTranslator(strings, language),
      languages: LANGUAGES,
    }),
    [language, refreshStrings, strings],
  )

  if (!stringsReady) {
    return <div className="app-boot" aria-busy="true" />
  }

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useI18n() {
  return useContext(LanguageContext)
}
