// Pure translation helpers: no React, no browser globals.
//
// The backend `Description` table is the source of truth for every interface
// string: descriptions with a `name` hold one row per language, keyed by the
// same names used with `t()` (for example `common.close`).
//
// Keeping this module free of React lets the server data layer build
// dictionaries without pulling the component tree into the SSR data path.

export const DEFAULT_LANGUAGE = 'en'

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hr', name: 'Hrvatski' },
]

/** Cookie the language is remembered in, so the server can render it. */
export const LANGUAGE_COOKIE = 'kiosk-language'

/** One year, in seconds. */
const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

export function isSupportedLanguage(code) {
  return LANGUAGES.some((language) => language.code === code)
}

/**
 * Turn the backend's grouped descriptions into dictionaries keyed by language
 * and i18n key: `{ en: { 'common.close': 'Close' }, hr: { ... } }`.
 *
 * Descriptions without a name are category/facet text and are ignored here; the
 * view model keeps using those by id.
 */
export function createStrings(descriptions) {
  const strings = {}

  for (const description of descriptions ?? []) {
    if (!description?.name) continue

    for (const [language, text] of Object.entries(
      description.translations ?? {},
    )) {
      if (typeof text !== 'string') continue
      const dictionary = (strings[language] ??= {})
      dictionary[description.name] = text
    }
  }

  return strings
}

/** True once at least the default-language dictionary is available. */
export function hasStrings(strings) {
  return Object.keys(strings?.[DEFAULT_LANGUAGE] ?? {}).length > 0
}

/**
 * Look up one key. Missing languages fall back to the default, and a key that
 * is missing everywhere renders as the key itself, so a partially loaded
 * dictionary still produces a usable page.
 */
export function translate(strings, language, key, vars) {
  const dict = strings?.[language] ?? strings?.[DEFAULT_LANGUAGE] ?? {}
  let text = dict[key] ?? strings?.[DEFAULT_LANGUAGE]?.[key] ?? key
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (_, name) =>
      vars[name] == null ? '' : String(vars[name]),
    )
  }
  return text
}

/** Bind a dictionary and language into a `t(key, vars)` function. */
export function createTranslator(strings, language) {
  return (key, vars) => translate(strings, language, key, vars)
}

export function pluralKey(count, key) {
  return `${key}.${count === 1 ? 'one' : 'many'}`
}

/**
 * Read the language from a `Cookie` header (server) or `document.cookie`
 * (browser). Returns `null` when the cookie is absent or holds an unsupported
 * code, so callers can fall back to another source.
 */
export function readLanguageCookie(cookie) {
  if (!cookie) return null

  for (const part of String(cookie).split(';')) {
    const separator = part.indexOf('=')
    if (separator === -1) continue

    const name = part.slice(0, separator).trim()
    if (name !== LANGUAGE_COOKIE) continue

    const code = decodeURIComponent(part.slice(separator + 1)).trim()
    return isSupportedLanguage(code) ? code : null
  }

  return null
}

/**
 * Serialize the language cookie for a `Set-Cookie` header. `SameSite=Lax` keeps
 * it readable on top-level navigations, which is when the server needs it.
 */
export function languageCookie(language) {
  const code = isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE
  return `${LANGUAGE_COOKIE}=${code}; Path=/; Max-Age=${LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax`
}
