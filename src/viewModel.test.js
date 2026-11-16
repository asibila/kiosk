import { describe, expect, it } from 'vitest'
import { buildViewModel } from './viewModel.js'

const users = [
  { id: 1, name: 'Ana', email: 'ana@example.com', role: 'ADMIN', isActive: true },
  { id: 2, name: 'Ivo', email: 'ivo@example.com', role: 'USER', isActive: true },
]

const categories = [{ id: 1, descriptionId: 1, parentCategoryId: null }]

const listings = [
  { id: 10, categoryId: 1, orientation: 'sell', userId: 1, isActive: true },
  { id: 11, categoryId: 1, orientation: 'buy', userId: 2, isActive: true },
]

const raw = { users, categories, listings }

describe('buildViewModel current user', () => {
  it('has no current user when nobody is signed in', () => {
    const view = buildViewModel(raw, { userId: null, language: 'en' })

    expect(view.user).toBeNull()
    expect(view.myListings).toEqual([])
    expect(view.inbox).toEqual([])
  })

  it('treats a stored id that matches no user as signed out', () => {
    const view = buildViewModel(raw, { userId: 999, language: 'en' })

    expect(view.user).toBeNull()
    expect(view.myListings).toEqual([])
  })

  it('shows only the signed-in user listings', () => {
    const view = buildViewModel(raw, { userId: 2, language: 'en' })

    expect(view.user.id).toBe(2)
    expect(view.myListings.map((listing) => listing.listingId)).toEqual([11])
  })

  it('still builds the catalog for guests', () => {
    const view = buildViewModel(raw, { userId: null, language: 'en' })

    expect(view.sessions.map((session) => session.id)).toEqual(['1'])
    expect(view.browseData.root.items).toHaveLength(1)
  })
})

describe('buildViewModel category tree', () => {
  it('terminates when stored categories form a cycle', () => {
    const view = buildViewModel(
      {
        users,
        listings: [],
        categories: [
          { id: 1, descriptionId: 1, parentCategoryId: 1 },
          { id: 2, descriptionId: 1, parentCategoryId: 3 },
          { id: 3, descriptionId: 1, parentCategoryId: 2 },
        ],
      },
      { userId: null, language: 'en' },
    )

    expect(view.sessions.map((session) => session.id)).toEqual(['1', '2', '3'])
    expect(view.browseData['2'].path).toEqual(['Home', 'Category 3', 'Category 2'])
  })
})
