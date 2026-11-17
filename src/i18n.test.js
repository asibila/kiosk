import { beforeEach, describe, expect, it } from 'vitest'
import { setStrings, translate } from './i18n.jsx'

describe('i18n descriptions', () => {
  beforeEach(() => {
    setStrings([
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
    ])
  })

  it('builds a dictionary per language from named descriptions', () => {
    expect(translate('en', 'common.close')).toBe('Close')
    expect(translate('hr', 'common.close')).toBe('Zatvori')
  })

  it('ignores descriptions without an i18n name', () => {
    expect(translate('en', 'Cars')).toBe('Cars')
  })

  it('falls back to English when a language has no entry', () => {
    setStrings([
      {
        id: 1,
        name: 'common.close',
        translations: { en: 'Close' },
      },
    ])

    expect(translate('hr', 'common.close')).toBe('Close')
  })

  it('falls back to the key when the description is missing', () => {
    expect(translate('en', 'missing.key')).toBe('missing.key')
  })

  it('keeps variable interpolation', () => {
    expect(translate('en', 'notice.deleted', { title: 'Bike' })).toBe(
      'Deleted Bike.',
    )
    expect(translate('hr', 'notice.deleted', { title: 'Bicikl' })).toBe(
      'Obrisano: Bicikl.',
    )
  })
})
