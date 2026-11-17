// Lightweight i18n for the kiosk UI. The backend `Description` table is the
// source of truth for every interface string: descriptions with a `name` hold
// one row per language, keyed by the same names used with `t()` below (for
// example `common.close`). `en` is the default, `hr` is the second supported
// language.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { loadDescriptions } from './api.js'

export const DEFAULT_LANGUAGE = 'en'

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hr', name: 'Hrvatski' },
]

const LANGUAGE_KEY = 'kiosk-language'

// Filled from GET /descriptions before the app renders (or by tests).
let STRINGS = {}

/**
 * Turn the backend's grouped descriptions into dictionaries keyed by language
 * and i18n key. Descriptions without a name are category/facet text and are
 * ignored here; the view model keeps using them by id.
 */
export function setStrings(descriptions) {
  const next = {}

  for (const description of descriptions ?? []) {
    if (!description?.name) continue

    for (const [language, text] of Object.entries(
      description.translations ?? {},
    )) {
      if (typeof text !== 'string') continue
      const dictionary = (next[language] ??= {})
      dictionary[description.name] = text
    }
  }

  STRINGS = next
  return STRINGS
}

/** True once at least the default-language dictionary is available. */
export function hasStrings() {
  return Object.keys(STRINGS[DEFAULT_LANGUAGE] ?? {}).length > 0
}

export function translate(language, key, vars) {
  const dict = STRINGS[language] ?? STRINGS[DEFAULT_LANGUAGE] ?? {}
  let text = dict[key] ?? STRINGS[DEFAULT_LANGUAGE]?.[key] ?? key
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (_, name) =>
      vars[name] == null ? '' : String(vars[name]),
    )
  }
  return text
}

export function pluralKey(count, key) {
  return `${key}.${count === 1 ? 'one' : 'many'}`
}

export function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY)
    if (LANGUAGES.some((language) => language.code === stored)) return stored
  } catch {
    // localStorage can be unavailable (private mode, blocked storage).
  }
  return DEFAULT_LANGUAGE
}

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => key,
  languages: LANGUAGES,
})

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage)
  const [stringsReady, setStringsReady] = useState(hasStrings)

  // Keep the document language and the stored preference in sync.
  useEffect(() => {
    document.documentElement.lang = language
    try {
      localStorage.setItem(LANGUAGE_KEY, language)
    } catch {
      // Ignore storage failures; the language still applies this session.
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
        setStrings(descriptions)
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

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
      languages: LANGUAGES,
    }),
    [language],
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
