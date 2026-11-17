import { beforeEach, describe, expect, it } from 'vitest'
import {
  createStrings,
  DEFAULT_LANGUAGE,
  getInitialLanguage,
  hasStrings,
  languageCookie,
  readLanguageCookie,
  translate,
} from './i18n.jsx'

const descriptions = [
  {
    id: 1,
    name: 'common.close',
    translations: { en: 'Close', hr: 'Zatvori' },
  },
  {
    id: 2,
    name: 'notice.deleted',
    translations: { en: 'Deleted {title}.', hr: 'Obrisano: {title}.' },
  },
  {
    id: 3,
    name: null,
    translations: { en: 'Cars', hr: 'Automobili' },
  },
]

describe('createStrings', () => {
  it('builds a dictionary per language from named descriptions', () => {
    const strings = createStrings(descriptions)

    expect(strings.en['common.close']).toBe('Close')
    expect(strings.hr['common.close']).toBe('Zatvori')
  })

  it('ignores descriptions without an i18n name', () => {
    const strings = createStrings(descriptions)

    expect(strings.en.Cars).toBeUndefined()
    expect(Object.keys(strings.en)).toHaveLength(2)
  })

  it('reports whether the default dictionary is usable', () => {
    expect(hasStrings(createStrings(descriptions))).toBe(true)
    expect(hasStrings({})).toBe(false)
    expect(hasStrings(null)).toBe(false)
  })
})

describe('translate', () => {
  const strings = createStrings(descriptions)

  it('returns the text for the requested language', () => {
    expect(translate(strings, 'en', 'common.close')).toBe('Close')
    expect(translate(strings, 'hr', 'common.close')).toBe('Zatvori')
  })

  it('falls back to English when a language has no entry', () => {
    const partial = createStrings([
      { id: 1, name: 'common.close', translations: { en: 'Close' } },
    ])

    expect(translate(partial, 'hr', 'common.close')).toBe('Close')
  })

  it('falls back to the key when the description is missing', () => {
    expect(translate(strings, 'en', 'missing.key')).toBe('missing.key')
  })

  it('keeps variable interpolation', () => {
    expect(translate(strings, 'en', 'notice.deleted', { title: 'Bike' })).toBe(
      'Deleted Bike.',
    )
    expect(translate(strings, 'hr', 'notice.deleted', { title: 'Bicikl' })).toBe(
      'Obrisano: Bicikl.',
    )
  })

  it('renders a missing variable as an empty string', () => {
    expect(translate(strings, 'en', 'notice.deleted', {})).toBe('Deleted .')
  })
})

describe('language cookie', () => {
  it('reads the code from a Cookie header', () => {
    expect(readLanguageCookie('a=1; kiosk-language=hr; b=2')).toBe('hr')
    expect(readLanguageCookie('kiosk-language=en')).toBe('en')
  })

  it('ignores a missing or unsupported code', () => {
    expect(readLanguageCookie('')).toBeNull()
    expect(readLanguageCookie('other=hr')).toBeNull()
    expect(readLanguageCookie('kiosk-language=de')).toBeNull()
  })

  it('serializes a supported code and falls back for an unknown one', () => {
    expect(languageCookie('hr')).toContain('kiosk-language=hr')
    expect(languageCookie('de')).toContain(`kiosk-language=${DEFAULT_LANGUAGE}`)
    expect(languageCookie('hr')).toContain('Path=/')
    expect(languageCookie('hr')).toContain('SameSite=Lax')
  })
})

describe('getInitialLanguage', () => {
  beforeEach(() => {
    document.cookie = 'kiosk-language=; Max-Age=0; Path=/'
    localStorage.clear()
  })

  it('prefers the cookie over the stored value', () => {
    document.cookie = 'kiosk-language=hr; Path=/'
    localStorage.setItem('kiosk-language', 'en')

    expect(getInitialLanguage()).toBe('hr')
  })

  it('falls back to the stored value when there is no cookie', () => {
    localStorage.setItem('kiosk-language', 'hr')

    expect(getInitialLanguage()).toBe('hr')
  })

  it('defaults to English when nothing is stored', () => {
    expect(getInitialLanguage()).toBe(DEFAULT_LANGUAGE)
  })
})
