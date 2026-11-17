import '@testing-library/jest-dom/vitest'

// Shared test setup only. The UI dictionaries are passed to `LanguageProvider`
// explicitly (`src/test/strings.js`) so the app never keeps them in a module
// variable.
