import { describe, expect, it } from 'vitest'
import { resolveApiBase } from './api.js'

describe('resolveApiBase', () => {
  it('uses the Vite proxy in development', () => {
    expect(resolveApiBase(undefined, false)).toBe('/api')
  })

  it('uses the deployed API for production builds', () => {
    expect(resolveApiBase(undefined, true)).toBe('https://kiosk-api-znxy.onrender.com')
  })

  it('prefers the configured base and strips trailing slashes', () => {
    expect(resolveApiBase('https://api.example.com/', true)).toBe('https://api.example.com')
    expect(resolveApiBase('  https://api.example.com//  ', false)).toBe('https://api.example.com')
  })
})
