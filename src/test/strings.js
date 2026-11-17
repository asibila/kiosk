import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createStrings } from '../strings.js'

// The same texts the backend seed inserts, so component tests can assert on
// real translations instead of raw keys.
const seed = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../backend/prisma/descriptions.seed.json'),
    'utf8',
  ),
)

/** Descriptions in the shape `GET /descriptions` returns. */
export const TEST_DESCRIPTIONS = Object.entries(seed).map(
  ([name, translations]) => ({ name, translations }),
)

/** Dictionaries for `<LanguageProvider initialStrings={TEST_STRINGS}>`. */
export const TEST_STRINGS = createStrings(TEST_DESCRIPTIONS)
