import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setStrings } from '../i18n.jsx'

// Preload the same descriptions the backend seed inserts, so component tests
// can keep using synchronous queries instead of waiting for /descriptions.
const seed = JSON.parse(
  readFileSync(
    resolve(process.cwd(), '../backend/prisma/descriptions.seed.json'),
    'utf8',
  ),
)

setStrings(
  Object.entries(seed).map(([name, translations]) => ({
    name,
    translations,
  })),
)
