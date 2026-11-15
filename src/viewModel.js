// Map the backend's normalized CRUD rows onto the UI's session/chat/browse model.
// Backend reference: ../backend/API_ROUTES.md

const byId = (rows) => new Map(rows.map((row) => [row.id, row]))

export function formatTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function iconForCategory(title) {
  const t = title.toLowerCase()
  if (t.includes('phone') || t.includes('laptop') || t.includes('computer')) return 'laptop'
  if (t.includes('bike') || t.includes('vehicle') || t.includes('car')) return 'bike'
  if (t.includes('sneaker') || t.includes('shoe')) return 'sneaker'
  return 'layers'
}

function thumbForCategory(title) {
  const t = title.toLowerCase()
  if (t.includes('phone') || t.includes('laptop') || t.includes('computer')) return 'laptop'
  if (t.includes('bike') || t.includes('vehicle') || t.includes('car')) return 'bike'
  if (t.includes('sneaker') || t.includes('shoe')) return 'sneaker'
  return 'tag'
}

const orientationLabel = (orientation) => (orientation === 'buy' ? 'Wanted' : 'For sale')

export function buildViewModel(raw, { userId } = {}) {
  const users = raw.users ?? []
  const descriptions = raw.descriptions ?? []
  const categories = raw.categories ?? []
  const listings = raw.listings ?? []
  const facetSchemas = raw['facet-schemas'] ?? []
  const facetOptions = raw['facet-value-options'] ?? []
  const facetSelections = raw['facet-value-selections'] ?? []
  const chatThreads = raw['chat-threads'] ?? []
  const chatMessages = raw['chat-messages'] ?? []
  const inboxLists = raw['inbox-lists'] ?? []
  const inboxItems = raw['inbox-items'] ?? []
  const listingChatThreads = raw['listing-chat-threads'] ?? []

  const descriptionsById = byId(descriptions)
  const categoriesById = byId(categories)
  const listingsById = byId(listings)
  const optionsById = byId(facetOptions)

  const descriptionText = (descriptionId, fallback = '') =>
    descriptionsById.get(descriptionId)?.text || fallback
  const categoryTitle = (categoryId) => {
    const category = categoriesById.get(categoryId)
    return category ? descriptionText(category.descriptionId, `Category ${category.id}`) : `Category ${categoryId}`
  }
  const optionText = (option) => (option ? descriptionText(option.descriptionId, `Option ${option.id}`) : '')

  const listingsByCategory = new Map()
  for (const listing of listings) {
    if (!listingsByCategory.has(listing.categoryId)) listingsByCategory.set(listing.categoryId, listing)
  }

  const listingTitle = (listing) => `${categoryTitle(listing.categoryId)} #${listing.id}`
  const listingDescription = (listing) => {
    const selected = facetSelections
      .filter((selection) => selection.listingId === listing.id)
      .map((selection) => optionText(optionsById.get(selection.facetValueOptionId)))
      .filter(Boolean)
    return [orientationLabel(listing.orientation), ...selected].join(' · ')
  }

  // Only threads in the current user's inbox appear in Messages/drawer chats.
  // The logged-in user (from the login response) drives the inbox/chats and the
  // sent-vs-received message split. Falls back to the first user when no login
  // has happened yet.
  const currentUser = users.find((u) => u.id === userId) ?? users[0] ?? null
  const userInboxListIds = new Set(
    inboxLists.filter((list) => list.userId === currentUser?.id).map((list) => list.id),
  )
  const inboxThreadIds = new Set(
    inboxItems.filter((item) => userInboxListIds.has(item.listId)).map((item) => item.chatThreadId),
  )
  const visibleThreads = inboxThreadIds.size
    ? chatThreads.filter((thread) => inboxThreadIds.has(thread.id))
    : chatThreads

  // Chat threads → chats. A thread's session is the category of its listing.
  // The API records who created each message (`ChatMessage.userId`); the current
  // user is the sender, so their messages render as sent and the rest as received.
  // Messages sent from this UI are appended locally as sent until the backend saves them.
  const linkByThreadId = new Map(listingChatThreads.map((link) => [link.chatThreadId, link]))
  const chats = visibleThreads
    .map((thread) => {
      const link = linkByThreadId.get(thread.id)
      const listing = link ? listingsById.get(link.listingId) : null
      if (!listing) return null

      return {
        id: `thread-${thread.id}`,
        threadId: thread.id,
        sessionId: String(listing.categoryId),
        title: listingTitle(listing),
        unread: 0,
        messages: chatMessages
          .filter((message) => message.threadId === thread.id)
          .sort((a, b) => a.id - b.id)
          .map((message) => ({
            id: `message-${message.id}`,
            from: message.userId === currentUser?.id ? 'sent' : 'received',
            text: message.text,
            time: formatTime(message.createdAt),
          })),
      }
    })
    .filter(Boolean)

  // Categories → interview sessions; their facet schemas become questions.
  const sessions = categories.map((category) => {
    const title = categoryTitle(category.id)
    return {
      id: String(category.id),
      categoryId: category.id,
      title,
      icon: iconForCategory(title),
      listingId: listingsByCategory.get(category.id)?.id ?? null,
      questions: facetSchemas
        .filter((schema) => schema.categoryId === category.id)
        .map((schema, index) => ({
          id: String(schema.id),
          priority: index + 1,
          text: descriptionText(schema.descriptionId, schema.name),
          hint: `Choose ${schema.name}.`,
          options: facetOptions
            .filter((option) => option.schemaId === schema.id)
            .map((option) => ({ id: String(option.id), text: optionText(option) })),
        })),
    }
  })

  // Existing selections on each category's first listing pre-fill the
  // interview answers (schema id → option id).
  const answers = {}
  for (const category of categories) {
    const listing = listingsByCategory.get(category.id)
    if (!listing) continue
    for (const selection of facetSelections.filter((row) => row.listingId === listing.id)) {
      const option = optionsById.get(selection.facetValueOptionId)
      if (option) answers[String(option.schemaId)] = String(option.id)
    }
  }

  // The signed-in user's listings — the drawer shows GET /listings filtered by userId.
  const myListings = listings
    .filter((listing) => currentUser && listing.userId === currentUser.id)
    .map((listing) => {
      const listingAnswers = {}
      for (const selection of facetSelections.filter((row) => row.listingId === listing.id)) {
        const option = optionsById.get(selection.facetValueOptionId)
        if (option) listingAnswers[String(option.schemaId)] = String(option.id)
      }
      return {
        id: String(listing.id),
        listingId: listing.id,
        sessionId: String(listing.categoryId),
        categoryId: listing.categoryId,
        orientation: listing.orientation,
        title: listingTitle(listing),
        desc: listingDescription(listing),
        answers: listingAnswers,
      }
    })

  // Category tree for the browse modal.
  const categoryItem = (category) => {
    const childCount = categories.filter((child) => child.parentCategoryId === category.id).length
    const listingCount = listings.filter((listing) => listing.categoryId === category.id).length
    const parts = []
    if (childCount) parts.push(`${childCount} subcategor${childCount === 1 ? 'y' : 'ies'}`)
    if (listingCount) parts.push(`${listingCount} listing${listingCount === 1 ? '' : 's'}`)
    return {
      type: 'category',
      id: String(category.id),
      title: categoryTitle(category.id),
      desc: parts.join(' · ') || 'Category',
      thumb: thumbForCategory(categoryTitle(category.id)),
    }
  }

  const listingItem = (listing) => ({
    type: 'listing',
    id: String(listing.id),
    title: listingTitle(listing),
    desc: listingDescription(listing),
    thumb: 'box',
    categoryId: String(listing.categoryId),
    orientation: listing.orientation,
  })

  const pathForCategory = (category) => {
    const chain = []
    let current = category
    while (current) {
      chain.unshift(categoryTitle(current.id))
      current = current.parentCategoryId != null ? categoriesById.get(current.parentCategoryId) : null
    }
    return ['Home', ...chain]
  }

  const browseData = {}
  for (const category of categories) {
    browseData[String(category.id)] = {
      path: pathForCategory(category),
      items: [
        ...categories.filter((child) => child.parentCategoryId === category.id).map(categoryItem),
        ...listings.filter((listing) => listing.categoryId === category.id).map(listingItem),
      ],
    }
  }
  browseData.root = {
    path: ['Home'],
    items: categories.filter((category) => category.parentCategoryId == null).map(categoryItem),
  }

  return {
    user: currentUser,
    sessions,
    chats,
    myListings,
    browseData,
    answers,
    selections: facetSelections,
    optionSchema: Object.fromEntries(facetOptions.map((option) => [option.id, option.schemaId])),
    categoryListing: Object.fromEntries(
      categories.map((category) => [
        String(category.id),
        listingsByCategory.get(category.id)?.id ?? null,
      ]),
    ),
  }
}
