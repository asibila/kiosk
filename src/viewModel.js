// Map the backend's normalized CRUD rows onto the UI's session/chat/browse model.
// Backend reference: ../backend/API_ROUTES.md
import { pluralKey, translate } from './i18n.jsx'

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

const orientationLabel = (orientation, t) =>
  t(orientation === 'buy' ? 'direction.buy' : 'direction.sell')

function descriptionTextFor(description, language) {
  if (!description) return ''
  if (description.translations) {
    return (
      description.translations[language] ??
      description.translations.en ??
      Object.values(description.translations)[0] ??
      ''
    )
  }
  return description.text ?? ''
}

export function buildViewModel(raw, { userId, language = 'en' } = {}) {
  const t = (key, vars) => translate(language, key, vars)
  const users = raw.users ?? []
  const descriptions = raw.descriptions ?? []
  const categories = raw.categories ?? []
  const listings = raw.listings ?? []
  const facetSchemas = raw['facet-schemas'] ?? []
  const facetOptions = raw['facet-value-options'] ?? []
  const facetSelections = raw['facet-value-selections'] ?? []
  const chatThreads = raw['chat-threads'] ?? []
  const chatMessages = raw['chat-messages'] ?? []
  const inboxItems = raw['inbox-items'] ?? []
  const listingChatThreads = raw['listing-chat-threads'] ?? []
  const listingImages = raw['listing-images'] ?? []

  const descriptionsById = byId(descriptions)
  const categoriesById = byId(categories)
  const listingsById = byId(listings)
  const optionsById = byId(facetOptions)
  const usersById = byId(users)

  // Primary image per listing (falls back to the first image if none is marked).
  const primaryImageByListing = new Map()
  for (const image of listingImages) {
    if (image.primaryImage) primaryImageByListing.set(image.listingId, image)
  }
  for (const image of listingImages) {
    if (!primaryImageByListing.has(image.listingId)) {
      primaryImageByListing.set(image.listingId, image)
    }
  }

  const descriptionText = (descriptionId, fallback = '') =>
    descriptionTextFor(descriptionsById.get(descriptionId), language) || fallback
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
    return [orientationLabel(listing.orientation, t), ...selected].join(' · ')
  }

  // Only threads in the current user's inbox appear in Messages.
  // The logged-in user (from the login response) drives the inbox and the
  // sent-vs-received message split. Falls back to the first user when no login
  // has happened yet.
  const currentUser = users.find((u) => u.id === userId) ?? users[0] ?? null
  const userInboxItems = inboxItems.filter(
    (item) => currentUser && item.userId === currentUser.id,
  )

  // Chat threads -> chats. A thread's session is the category of its listing.
  // The API records who created each message (`ChatMessage.userId`); the current
  // user is the sender, so their messages render as sent and the rest as received.
  const linkByThreadId = new Map(listingChatThreads.map((link) => [link.chatThreadId, link]))
  const inboxItemByThreadId = new Map(inboxItems.map((item) => [item.chatThreadId, item]))
  const chats = chatThreads
    .map((thread) => {
      const link = linkByThreadId.get(thread.id)
      const listing = link ? listingsById.get(link.listingId) : null
      if (!listing) return null

      // The thread's two participants: the listing owner and the user whose
      // inbox the conversation sits in. Show whichever one is not signed in.
      const inboxItem = inboxItemByThreadId.get(thread.id)
      const ownerSide = currentUser?.id === listing.userId
      const partnerId = ownerSide ? inboxItem?.userId : listing.userId
      const partner = partnerId != null ? usersById.get(partnerId) : null

      return {
        id: `thread-${thread.id}`,
        threadId: thread.id,
        listingId: listing.id,
        listingChatThreadId: link?.id ?? null,
        sessionId: String(listing.categoryId),
        title: listingTitle(listing),
        desc: listingDescription(listing),
        partnerName: partner?.name ?? null,
        // The badge belongs to the signed-in user's side of the conversation:
        // the owner sees the listing link's flag, the contact sees their inbox
        // item's flag.
        unread: (ownerSide ? link?.hasUnread : inboxItem?.hasUnread) ? 1 : 0,
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

  const chatsById = new Map(chats.map((chat) => [chat.id, chat]))
  // Each inbox row corresponds to an InboxItem (chat thread in the user's inbox).
  const inbox = userInboxItems
    .map((item) => {
      const chat = chatsById.get(`thread-${item.chatThreadId}`)
      if (!chat) return null
      return {
        id: `inbox-${item.id}`,
        inboxItemId: item.id,
        chatId: chat.id,
        title: chat.title,
        desc: chat.desc,
        hasUnread: item.hasUnread,
      }
    })
    .filter(Boolean)

  // Categories → interview sessions. A session includes the facets defined on
  // the category and on its ancestors, so parent-category facets apply to every
  // subcategory (for example Electronics/brand on Mobile phones), plus generic
  // facets such as condition, which apply to products in every category.
  const sessions = categories.map((category) => {
    const title = categoryTitle(category.id)
    const ancestorIds = new Set()
    let current = category
    while (current) {
      ancestorIds.add(current.id)
      current =
        current.parentCategoryId != null
          ? categoriesById.get(current.parentCategoryId)
          : undefined
    }

    return {
      id: String(category.id),
      categoryId: category.id,
      parentCategoryId: category.parentCategoryId ?? null,
      title,
      icon: iconForCategory(title),
      listingId: listingsByCategory.get(category.id)?.id ?? null,
      questions: facetSchemas
        .filter(
          (schema) => schema.isGeneric === true || ancestorIds.has(schema.categoryId),
        )
        .map((schema, index) => {
          const text = descriptionText(schema.descriptionId, schema.name)
          return {
            id: String(schema.id),
            facet: schema.name,
            categoryId: schema.categoryId,
            categoryTitle: categoryTitle(schema.categoryId),
            isGeneric: schema.isGeneric === true,
            priority: index + 1,
            text,
            hint: t('interview.choose'),
            options: facetOptions
              .filter((option) => option.schemaId === schema.id)
              .map((option) => ({ id: String(option.id), text: optionText(option) })),
          }
        }),
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
    if (childCount) {
      parts.push(t(pluralKey(childCount, 'browse.subcategory'), { count: childCount }))
    }
    if (listingCount) {
      parts.push(t(pluralKey(listingCount, 'browse.listing'), { count: listingCount }))
    }
    return {
      type: 'category',
      id: String(category.id),
      title: categoryTitle(category.id),
      desc: parts.join(' · ') || t('browse.category'),
      thumb: thumbForCategory(categoryTitle(category.id)),
    }
  }

  const listingItem = (listing) => ({
    type: 'listing',
    id: String(listing.id),
    userId: listing.userId,
    createdAt: listing.createdAt ?? null,
    title: listingTitle(listing),
    desc: listingDescription(listing),
    thumb: 'box',
    imageUrl: primaryImageByListing.get(listing.id)?.url ?? null,
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
    return [t('browse.home'), ...chain]
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
    path: [t('browse.home')],
    items: categories.filter((category) => category.parentCategoryId == null).map(categoryItem),
  }

  return {
    user: currentUser,
    users: raw.users ?? [],
    languages: raw.languages ?? [],
    language,
    sessions,
    chats,
    inbox,
    myListings,
    browseData,
    listingImages,
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
