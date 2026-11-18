// Map the backend's normalized CRUD rows onto the UI's interview/chat/browse model.
// Backend reference: ../backend/API_ROUTES.md
import { createTranslator, pluralKey } from './strings.js'

const byId = (rows) => new Map(rows.map((row) => [row.id, row]))

/** The backend's virtual category for the questions shared by all categories. */
const ALL_CATEGORY_ID = 0

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

/**
 * Map raw API rows onto the UI model.
 *
 * `strings` is the dictionary built by `createStrings()` from `/descriptions`.
 * It is passed in rather than read from a module so a server rendering two
 * languages at once cannot mix them up.
 */
export function buildViewModel(
  raw,
  { userId, language = 'en', strings = {} } = {},
) {
  const t = createTranslator(strings, language)
  const users = raw.users ?? []
  const descriptions = raw.descriptions ?? []
  const categories = raw.categories ?? []
  const regions = raw.regions ?? []
  const listings = raw.listings ?? []
  const facetSchemas = raw['facet-schemas'] ?? []
  const facetOptions = raw['facet-value-options'] ?? []
  const facetSelections = raw['facet-value-selections'] ?? []
  const chatThreads = raw['chat-threads'] ?? []
  const chatMessages = raw['chat-messages'] ?? []
  const inboxItems = raw['inbox-items'] ?? []
  const listingChatThreads = raw['listing-chat-threads'] ?? []
  const listingImages = raw['listing-images'] ?? []
  const listingTranslations = raw['listing-translations'] ?? []

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
    // The virtual "all" category has no Description row; the UI label lives in i18n.
    if (categoryId === ALL_CATEGORY_ID) return t('search.allCategories')
    const category = categoriesById.get(categoryId)
    return category ? descriptionText(category.descriptionId, `Category ${category.id}`) : `Category ${categoryId}`
  }
  // The title heuristic that used to pick every icon reads English text, so a
  // translated category keeps the same fallback glyph as before.
  const englishCategoryTitle = (categoryId) => {
    const category = categoriesById.get(categoryId)
    if (!category) return ''
    return descriptionTextFor(descriptionsById.get(category.descriptionId), 'en')
  }
  // Category icons are inline SVG rows written through the API (sanitized there).
  const categoryIconSvg = (categoryId) => {
    const svg = categoriesById.get(categoryId)?.iconSvg
    return typeof svg === 'string' && svg.trim() !== '' ? svg : null
  }
  /** Database icon, or the title heuristic when the category has none. */
  const categoryIcon = (categoryId) => ({
    iconSvg: categoryIconSvg(categoryId),
    iconKind: iconForCategory(
      englishCategoryTitle(categoryId) || categoryTitle(categoryId),
    ),
    thumbKind: thumbForCategory(
      englishCategoryTitle(categoryId) || categoryTitle(categoryId),
    ),
  })
  const optionText = (option) => (option ? descriptionText(option.descriptionId, `Option ${option.id}`) : '')

  // Regions are id-ordered; id 0 is the global "All regions" row.
  const regionList = [...regions]
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((region) => ({
      id: Number(region.id),
      code: region.code,
      name: descriptionText(region.descriptionId, region.code),
    }))

  const listingsByCategory = new Map()
  for (const listing of listings) {
    if (!listingsByCategory.has(listing.categoryId)) listingsByCategory.set(listing.categoryId, listing)
  }

  // Titles come from ListingTranslation. Missing languages fall back to the UI
  // language, then English, then any available title, then the generated label.
  const titlesByListing = new Map()
  for (const row of listingTranslations) {
    const titles = titlesByListing.get(row.listingId) ?? {}
    titles[row.language] = row.title
    titlesByListing.set(row.listingId, titles)
  }
  const listingTitles = (listing) => titlesByListing.get(listing.id) ?? {}
  const listingTitleFor = (listing, lang = language) => {
    const titles = listingTitles(listing)
    const text =
      titles[lang] ?? titles.en ?? Object.values(titles)[0] ?? ''
    return text || `${categoryTitle(listing.categoryId)} #${listing.id}`
  }
  const listingTitle = (listing) => listingTitleFor(listing, language)
  const listingDescription = (listing) => {
    const selected = facetSelections
      .filter((selection) => selection.listingId === listing.id)
      .map((selection) => optionText(optionsById.get(selection.facetValueOptionId)))
      .filter(Boolean)
    return [orientationLabel(listing.orientation, t), ...selected].join(' · ')
  }

  // Only threads in the current user's inbox appear in Messages.
  // The logged-in user (from the login response) drives the inbox and the
  // sent-vs-received message split. With nobody signed in there is no current
  // user: guests see the catalog, and nothing is attributed to anyone.
  const currentUser = users.find((u) => u.id === userId) ?? null
  const userInboxItems = inboxItems.filter(
    (item) => currentUser && item.userId === currentUser.id,
  )

  // Chat threads -> chats. A thread belongs to the category of its listing.
  // The API records who created each message (`ChatMessage.userId`); the current
  // user is the sender, so their messages render as sent and the rest as received.
  const linkByThreadId = new Map(listingChatThreads.map((link) => [link.chatThreadId, link]))
  const inboxItemByThreadId = new Map(inboxItems.map((item) => [item.chatThreadId, item]))
  const chats = chatThreads
    .map((thread) => {
      const link = linkByThreadId.get(thread.id)
      const listing = link ? listingsById.get(link.listingId) : null
      if (!listing) return null

      // The thread's two participants: the listing owner and the user who
      // initiated the contact. `ListingChatThread.userId` records the latter;
      // older rows fall back to the inbox owner or the thread creator.
      const inboxItem = inboxItemByThreadId.get(thread.id)
      const contactUserId =
        link?.userId ?? inboxItem?.userId ?? thread.createdBy ?? null
      const ownerSide = currentUser?.id === listing.userId
      const partnerId = ownerSide ? contactUserId : listing.userId
      const partner = partnerId != null ? usersById.get(partnerId) : null

      return {
        id: `thread-${thread.id}`,
        threadId: thread.id,
        listingId: listing.id,
        listingChatThreadId: link?.id ?? null,
        contactUserId,
        categoryId: String(listing.categoryId),
        // Raw timestamps let the seller statistics bucket contacts per day.
        createdAt: thread.createdAt ?? null,
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

  // Categories → interviews. An interview includes the facets defined on
  // the category and on its ancestors, so parent-category facets apply to every
  // subcategory (for example Electronics/brand on Mobile phones), plus generic
  // facets such as condition, which apply to products in every category.
  //
  // Orientation, price and year are special facets stored on the listing
  // itself. They are always part of the interview, even when a database has no
  // matching FacetSchema rows, so every listing can answer the same first four
  // questions: For Sale / Wanted, condition, price, year.
  const SPECIAL_FACET_NAMES = new Set(['orientation', 'price', 'year'])
  const orientationSchema = facetSchemas.find((schema) => schema.name === 'orientation')
  const priceSchema = facetSchemas.find((schema) => schema.name === 'price')
  const yearSchema = facetSchemas.find((schema) => schema.name === 'year')

  const interviews = categories.map((category) => {
    const title = categoryTitle(category.id)
    const glyph = categoryIcon(category.id)
    const ancestorIds = new Set()
    let current = category
    while (current && !ancestorIds.has(current.id)) {
      ancestorIds.add(current.id)
      current =
        current.parentCategoryId != null
          ? categoriesById.get(current.parentCategoryId)
          : undefined
    }

    const facetQuestions = facetSchemas
      .filter(
        (schema) =>
          !SPECIAL_FACET_NAMES.has(schema.name) &&
          // Price and year are the only numeric fields on Listing today.
          schema.type !== 'numeric' &&
          (schema.isGeneric === true || ancestorIds.has(schema.categoryId)),
      )
      .map((schema) => ({
        id: String(schema.id),
        facet: schema.name,
        categoryId: schema.categoryId,
        categoryTitle: categoryTitle(schema.categoryId),
        isGeneric: schema.isGeneric === true,
        type: 'option',
        required: schema.required === true || schema.name === 'condition',
        text: descriptionText(schema.descriptionId, schema.name),
        hint: t('interview.choose'),
        options: facetOptions
          .filter((option) => option.schemaId === schema.id)
          .map((option) => ({ id: String(option.id), text: optionText(option) })),
      }))

    const byId = (a, b) => Number(a.id) - Number(b.id)
    const requiredGeneric = facetQuestions
      .filter((question) => question.isGeneric && question.required)
      .sort(byId)
    const optionalGeneric = facetQuestions
      .filter((question) => question.isGeneric && !question.required)
      .sort(byId)
    const categoryQuestions = facetQuestions
      .filter((question) => !question.isGeneric)
      .sort(byId)

    const orientationQuestion = {
      id: 'orientation',
      facet: 'orientation',
      categoryId: ALL_CATEGORY_ID,
      categoryTitle: t('search.allCategories'),
      isGeneric: true,
      type: 'option',
      required: true,
      text: orientationSchema
        ? descriptionText(orientationSchema.descriptionId, t('facet.orientation'))
        : t('facet.orientation'),
      hint: t('interview.choose'),
      options: [
        { id: 'sell', text: t('direction.sell') },
        { id: 'buy', text: t('direction.buy') },
      ],
    }

    // Price and year are numeric questions stored directly on Listing.
    const priceQuestion = {
      id: 'price',
      facet: 'price',
      categoryId: ALL_CATEGORY_ID,
      categoryTitle: t('search.allCategories'),
      isGeneric: true,
      type: 'numeric',
      required: false,
      text: priceSchema
        ? descriptionText(priceSchema.descriptionId, t('facet.price'))
        : t('facet.price'),
      hint: t('interview.priceHint'),
      unit: '€',
      min: 0,
      step: 0.01,
      options: [],
    }
    const yearQuestion = {
      id: 'year',
      facet: 'year',
      categoryId: ALL_CATEGORY_ID,
      categoryTitle: t('search.allCategories'),
      isGeneric: true,
      type: 'numeric',
      required: false,
      text: yearSchema
        ? descriptionText(yearSchema.descriptionId, t('facet.year'))
        : t('facet.year'),
      hint: t('interview.yearHint'),
      min: 0,
      step: 1,
      options: [],
    }

    // The four shared questions come first, in a fixed order. Category facets
    // follow, with the parent categories' facets before the category's own.
    const questions = [
      orientationQuestion,
      ...requiredGeneric,
      priceQuestion,
      yearQuestion,
      ...optionalGeneric,
      ...categoryQuestions,
    ].map((question, index) => ({ ...question, priority: index + 1 }))

    const answerable = questions.filter((question) => question.type === 'option').length

    return {
      id: String(category.id),
      categoryId: category.id,
      parentCategoryId: category.parentCategoryId ?? null,
      title,
      icon: glyph.iconKind,
      iconSvg: glyph.iconSvg,
      listingId: listingsByCategory.get(category.id)?.id ?? null,
      questions,
      // The questions are the source of truth for the progress UI. Backend
      // counters are kept when they are larger, so older data stays valid.
      facetsCountMax: Math.max(category.facetsCountMax ?? 0, questions.length),
      facetsCountMaxAnswerable: Math.max(
        category.facetsCountMaxAnswerable ?? 0,
        answerable,
      ),
    }
  })

  const facetsCountMaxByCategory = new Map(
    interviews.map((interview) => [interview.categoryId, interview.facetsCountMax]),
  )
  const facetsCountMaxAnswerableByCategory = new Map(
    interviews.map((interview) => [
      interview.categoryId,
      interview.facetsCountMaxAnswerable,
    ]),
  )

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
    answers.orientation = listing.orientation
    if (listing.price != null) answers.price = listing.price
    if (listing.year != null) answers.year = listing.year
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
      listingAnswers.orientation = listing.orientation
      if (listing.price != null) listingAnswers.price = listing.price
      if (listing.year != null) listingAnswers.year = listing.year
      return {
        id: String(listing.id),
        listingId: listing.id,
        categoryId: listing.categoryId,
        regionId: listing.regionId ?? 0,
        orientation: listing.orientation,
        isActive: listing.isActive !== false,
        price: listing.price ?? null,
        year: listing.year ?? null,
        title: listingTitle(listing),
        titles: listingTitles(listing),
        iconSvg: categoryIconSvg(listing.categoryId),
        desc: listingDescription(listing),
        answers: listingAnswers,
        facetsCount:
          listing.facetsCount ??
          facetSelections.filter((row) => row.listingId === listing.id).length +
            (listing.orientation != null ? 1 : 0) +
            (listing.price != null ? 1 : 0) +
            (listing.year != null ? 1 : 0),
        facetsCountMax:
          facetsCountMaxByCategory.get(listing.categoryId) ?? 0,
        facetsCountMaxAnswerable:
          facetsCountMaxAnswerableByCategory.get(listing.categoryId) ?? 0,
      }
    })

  // The virtual "all" category is an interview, not a browsable node.
  const browseCategories = categories.filter((category) => category.id !== ALL_CATEGORY_ID)

  // Category tree for the browse modal.
  const categoryItem = (category) => {
    const childCount = browseCategories.filter((child) => child.parentCategoryId === category.id).length
    const listingCount = listings.filter((listing) => listing.categoryId === category.id).length
    const glyph = categoryIcon(category.id)
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
      thumb: glyph.thumbKind,
      iconSvg: glyph.iconSvg,
    }
  }

  const listingItem = (listing) => ({
    type: 'listing',
    id: String(listing.id),
    userId: listing.userId,
    createdAt: listing.createdAt ?? null,
    title: listingTitle(listing),
    titles: listingTitles(listing),
    desc: listingDescription(listing),
    thumb: thumbForCategory(
      englishCategoryTitle(listing.categoryId) || categoryTitle(listing.categoryId),
    ),
    iconSvg: categoryIconSvg(listing.categoryId),
    imageUrl: primaryImageByListing.get(listing.id)?.url ?? null,
    categoryId: String(listing.categoryId),
    regionId: listing.regionId ?? 0,
    orientation: listing.orientation,
    isActive: listing.isActive !== false,
    price: listing.price ?? null,
    year: listing.year ?? null,
    facetsCount:
      listing.facetsCount ??
      facetSelections.filter((row) => row.listingId === listing.id).length +
        (listing.orientation != null ? 1 : 0) +
        (listing.price != null ? 1 : 0) +
        (listing.year != null ? 1 : 0),
    facetsCountMax:
      facetsCountMaxByCategory.get(listing.categoryId) ?? 0,
    facetsCountMaxAnswerable:
      facetsCountMaxAnswerableByCategory.get(listing.categoryId) ?? 0,
  })

  const pathForCategory = (category) => {
    const chain = []
    const seen = new Set()
    let current = category
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      chain.unshift(categoryTitle(current.id))
      current = current.parentCategoryId != null ? categoriesById.get(current.parentCategoryId) : null
    }
    return [t('browse.home'), ...chain]
  }

  const browseData = {}
  for (const category of browseCategories) {
    browseData[String(category.id)] = {
      path: pathForCategory(category),
      items: [
        ...browseCategories
          .filter((child) => child.parentCategoryId === category.id)
          .map(categoryItem),
        ...listings.filter((listing) => listing.categoryId === category.id).map(listingItem),
      ],
    }
  }
  browseData.root = {
    path: [t('browse.home')],
    items: browseCategories
      .filter((category) => category.parentCategoryId == null)
      .map(categoryItem),
  }

  return {
    user: currentUser,
    users: raw.users ?? [],
    languages: raw.languages ?? [],
    regions: regionList,
    language,
    interviews,
    chats,
    inbox,
    myListings,
    browseData,
    listingImages,
    listingTranslations,
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
