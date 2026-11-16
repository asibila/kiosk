// Lightweight i18n for the kiosk UI. The backend `Language` table is the source
// of truth for description translations; this file translates the interface
// chrome. `en` is the default, `hr` is the second supported language.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export const DEFAULT_LANGUAGE = 'en'

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hr', name: 'Hrvatski' },
]

const LANGUAGE_KEY = 'kiosk-language'

const STRINGS = {
  en: {
    'common.close': 'Close',
    'common.cancel': 'Cancel',
    'common.done': 'Done',
    'common.ok': 'OK',

    'direction.buy': 'Wanted',
    'direction.sell': 'For sale',
    'direction.buyAction': 'Buy',
    'direction.sellAction': 'Sell',

    'topbar.menu': 'Toggle my listings drawer',
    'topbar.profile': 'Open profile',
    'topbar.language': 'Language',
    'topbar.themeLight': 'Switch to light mode',
    'topbar.themeDark': 'Switch to dark mode',
    'topbar.actions': 'Top bar actions',
    'topbar.home': 'Go to search',

    'login.aria': 'Log in',
    'login.title': 'Kiosk',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.signin': 'Log in',
    'login.signingIn': 'Signing in…',
    'login.invalid': 'Invalid email or password.',
    'login.failed': 'Sign in failed.',

    'drawer.aria': 'My listings',
    'drawer.title': 'My listings',
    'drawer.empty': 'No listings yet',
    'drawer.delete': 'Delete listing',
    'drawer.deleteAria': 'Delete {title}',
    'drawer.conversations': 'Conversations for {title}',
    'drawer.chat': 'Chat #{id}',
    'drawer.noMessages': 'No messages yet',
    'drawer.unread': '{count} unread',
    'drawer.newListing': 'New listing',
    'drawer.messages': 'Messages',
    'drawer.settings': 'Settings',
    'drawer.guest': 'Sign in to see your listings and messages.',
    'drawer.signIn': 'Sign in',
    'drawer.signOut': 'Sign out',

    'search.aria': 'Search kiosk',
    'search.title': 'Search kiosk',
    'search.placeholder': 'Search listings…',
    'search.listingsAria': 'Search listings',
    'search.categoryAria': 'Category: {category}. Choose a category',
    'search.allCategories': 'All categories',
    'search.filter': 'Filter',
    'search.submit': 'Search',
    'search.commitText':
      'Only facet filters can be searched. Choose a suggestion for “{text}”.',
    'search.resultCount.one': '{count} matching ad',
    'search.resultCount.many': '{count} matching ads',
    'results.aria': 'Search results',
    'results.title': 'Search results',
    'results.edit': 'Edit search',
    'results.filters': 'Active filters',
    'results.open': 'Open {title}',
    'listing.aria': 'Listing details',
    'listing.back': 'Back to search',
    'listing.backResults': 'Back to results',
    'listing.notFound': 'This listing no longer exists.',
    'listing.noImages': 'No photos yet.',
    'listing.photo': 'Photo {number}',
    'listing.category': 'Category',
    'listing.direction': 'Type',
    'listing.seller': 'Seller',
    'listing.you': 'You',
    'listing.listed': 'Listed',
    'listing.details': 'Details',
    'listing.contact': 'Contact seller',
    'listing.contacting': 'Starting conversation…',
    'listing.signInToContact': 'Sign in to contact the seller',
    'listing.yourNote': 'This is your listing.',
    'listing.draft': 'Draft',

    'facet.placeholder': 'Search by model, fuel, year…',
    'facet.inputLabel': 'Search filters',
    'facet.suggestions': 'Filter suggestions',
    'facet.loading': 'Loading suggestions…',
    'facet.error': 'Couldn’t load suggestions',
    'facet.noMatch': 'No matching filter for “{text}”',
    'facet.remove': 'Remove {facetLabel} {label}',
    'facet.resultCount.one': '{count} suggestion',
    'facet.resultCount.many': '{count} suggestions',
    'facet.rangeMin': 'Min',
    'facet.rangeMax': 'Max',
    'facet.rangeApply': 'Add',
    'facet.rangeUpdate': 'Update',
    'facet.rangeClear': 'Clear',
    'facet.rangeFrom': 'from {value}',
    'facet.rangeUpTo': 'up to {value}',
    'facet.rangeAny': 'any',
    'facet.price': 'Price',
    'facet.year': 'Year',

    'session.aria': '{title} interview',
    'session.questionsAnswered': 'Questions answered',
    'session.answered': '{answered} / {total} answered',
    'session.empty':
      'This category has no interview questions yet. Facet schemas added to it in the backend will appear here.',
    'session.answeredTitle': 'Answered',

    'browse.aria': 'Browse marketplace',
    'browse.title': 'Browse',
    'browse.breadcrumb': 'Breadcrumb',
    'browse.home': 'Home',
    'browse.open': 'Open {title}',
    'browse.subcategory.one': '{count} subcategory',
    'browse.subcategory.many': '{count} subcategories',
    'browse.listing.one': '{count} listing',
    'browse.listing.many': '{count} listings',
    'browse.category': 'Category',

    'interview.choose': 'Choose one of the options.',
    'interview.next': 'Next >',
    'interview.creatingDraft': 'Creating draft…',
    'interview.previous': '< Previous',
    'interview.signInToPublish': 'Sign in to publish',
    'interview.search': 'Search',
    'interview.publish': 'Publish',
    'interview.publishing': 'Publishing…',
    'interview.chooseDirection': 'Choose Buy or Sell first',
    'interview.directionAria': 'Listing direction',

    'wizard.step2': 'Step 2 of 3 — Edit',
    'wizard.step3': 'Step 3 of 3 — Preview',
    'wizard.editAria': 'Edit listing',
    'wizard.previewAria': 'Preview listing',
    'wizard.images': 'Images',
    'wizard.title': 'Title ({language})',
    'wizard.translate': 'Translate',
    'wizard.titleHint':
      'Shown in search results. Pick Translate to add the other languages.',
    'wizard.titleSaving': 'Saving title…',
    'translate.title': 'Translate title',
    'translate.hint':
      'Enter a title for each language. Empty languages fall back to another translation.',
    'translate.save': 'Save translations',
    'translate.saving': 'Saving…',
    'wizard.noImages': 'No images yet',
    'wizard.imageCount.one': '{count} image',
    'wizard.imageCount.many': '{count} images',
    'wizard.primary': 'Primary',
    'wizard.makePrimary': 'Make primary image',
    'wizard.removeImage': 'Remove image',
    'wizard.removeAria': 'Remove {name}',
    'wizard.uploading': 'Uploading…',
    'wizard.addImages': 'Add images',
    'wizard.primaryHint':
      'The primary image is the thumbnail shown in search results.',
    'wizard.facets': 'Facets',
    'wizard.noAnswers': 'No questions answered.',
    'wizard.noUploads': 'No images uploaded.',

    'chat.aria': 'Chat: {title}',
    'chat.with': 'Chatting with {name}',
    'chat.otherUser': 'the other user',
    'chat.live': 'Live',
    'chat.connecting': 'Connecting…',
    'chat.reconnecting': 'Reconnecting…',
    'chat.messagesAria': 'Messages',
    'chat.attach': 'Attach',
    'chat.attachFile': 'Attach file',
    'chat.attachmentType': 'Attachment type',
    'chat.image': 'Image',
    'chat.youtube': 'YouTube video',
    'chat.gps': 'GPS location',
    'chat.placeholder': 'Type a message…',
    'chat.messageText': 'Message text',
    'chat.send': 'Send message',
    'chat.attachmentPlaceholder': '{label} — placeholder',

    'facets.aria': 'Filter',
    'facets.title': 'Filter',
    'facets.all': 'All',
    'facets.empty': 'No facets for this category.',
    'facets.done': 'Done',

    'listings.empty': 'No listings match the current filters.',
    'listings.buyTitle': 'Buy listings',
    'listings.sellTitle': 'Sell listings',
    'listings.searchTitle': 'Search listings',
    'listings.your': 'Your listing: {title}',
    'listings.start': 'Start conversation about {title}',
    'listings.yourTitle': 'This is your listing',
    'listings.startTitle': 'Start conversation',

    'messages.aria': 'Messages',
    'messages.title': 'Messages',
    'messages.back': 'Back to inbox',
    'messages.empty': 'No conversations yet.',
    'messages.inbox': 'Inbox',

    'delete.title': 'Delete listing',
    'delete.message': 'Are you sure?',
    'delete.detail': '{title} will be permanently deleted.',
    'delete.confirm': 'Yes',
    'delete.busy': 'Deleting…',

    'report.title': 'Listing created',
    'report.body': 'Listing created, thank you for using kiosk.',

    'settings.title': 'Settings',
    'settings.body':
      'Appearance, notifications and privacy controls live here. Nothing is wired up yet — this panel is a placeholder.',

    'profile.title': 'Profile',
    'profile.loading': 'Loading profile…',
    'profile.name': 'Name',
    'profile.email': 'Email',
    'profile.role': 'Role',
    'profile.status': 'Status',
    'profile.active': 'Active',
    'profile.inactive': 'Inactive',
    'profile.userId': 'User ID',
    'profile.note': 'Loaded from the backend users table.',
    'profile.noUsers': 'The backend has no users yet.',
    'profile.guest': 'Sign in to see your profile.',

    'loading.title': 'Loading sessions…',
    'loading.body':
      'Fetching categories, listings and conversations from the backend.',
    'error.title': 'Cannot load data',
    'error.hint': 'Make sure the backend is running on http://localhost:3000.',
    'error.retry': 'Try again',
    'empty.browse': 'Browse',
    'empty.noCategories':
      'The backend has no categories, so there is nothing to interview yet.',

    'notice.imageUploadFailed': 'Image upload failed: {message}',
    'notice.imageDeleteFailed': 'Could not delete image: {message}',
    'notice.primaryFailed': 'Could not set primary image: {message}',
    'notice.conversationStarted': 'Conversation started for {title}.',
    'notice.conversationFailed': 'Could not start conversation: {message}',
    'notice.directionFailed': 'Direction not saved: {message}',
    'notice.answerFailed': 'Answer not saved: {message}',
    'notice.draftFailed': 'Could not create the draft listing: {message}',
    'notice.titleFailed': 'Title not saved: {message}',
    'notice.publishFailed': 'Publish failed: {message}',
    'notice.publishImageFailed':
      'Listing saved, but image upload failed: {message}',
    'notice.deleted': 'Deleted {title}.',
    'notice.deleteFailed': 'Delete failed: {message}',
    'notice.messageFailed': 'Message not saved to the backend: {message}',
  },

  hr: {
    'common.close': 'Zatvori',
    'common.cancel': 'Odustani',
    'common.done': 'Gotovo',
    'common.ok': 'U redu',

    'direction.buy': 'Tražim',
    'direction.sell': 'Prodaje se',
    'direction.buyAction': 'Kupujem',
    'direction.sellAction': 'Prodajem',

    'topbar.menu': 'Otvori/zatvori popis mojih oglasa',
    'topbar.profile': 'Otvori profil',
    'topbar.language': 'Jezik',
    'topbar.themeLight': 'Prijelaz na svijetli način',
    'topbar.themeDark': 'Prijelaz na tamni način',
    'topbar.actions': 'Radnje u gornjoj traci',
    'topbar.home': 'Idi na pretraživanje',

    'login.aria': 'Prijava',
    'login.title': 'Kiosk',
    'login.email': 'Email',
    'login.password': 'Lozinka',
    'login.signin': 'Prijavi se',
    'login.signingIn': 'Prijava…',
    'login.invalid': 'Neispravan email ili lozinka.',
    'login.failed': 'Prijava nije uspjela.',

    'drawer.aria': 'Moji oglasi',
    'drawer.title': 'Moji oglasi',
    'drawer.empty': 'Još nema oglasa',
    'drawer.delete': 'Obriši oglas',
    'drawer.deleteAria': 'Obriši {title}',
    'drawer.conversations': 'Razgovori za {title}',
    'drawer.chat': 'Razgovor #{id}',
    'drawer.noMessages': 'Još nema poruka',
    'drawer.unread': '{count} nepročitano',
    'drawer.newListing': 'Novi oglas',
    'drawer.messages': 'Poruke',
    'drawer.settings': 'Postavke',
    'drawer.guest': 'Prijavite se da vidite svoje oglase i poruke.',
    'drawer.signIn': 'Prijavi se',
    'drawer.signOut': 'Odjavi se',

    'search.aria': 'Pretraži kiosk',
    'search.title': 'Pretraži kiosk',
    'search.placeholder': 'Pretraži oglase…',
    'search.listingsAria': 'Pretraži oglase',
    'search.categoryAria': 'Kategorija: {category}. Odaberi kategoriju',
    'search.allCategories': 'Sve kategorije',
    'search.filter': 'Filtriraj',
    'search.submit': 'Pretraži',
    'search.commitText':
      'Pretraživati se može samo po filtrima. Odaberi prijedlog za „{text}”.',
    'search.resultCount.one': '{count} odgovarajući oglas',
    'search.resultCount.many': '{count} odgovarajućih oglasa',
    'results.aria': 'Rezultati pretrage',
    'results.title': 'Rezultati pretrage',
    'results.edit': 'Uredi pretragu',
    'results.filters': 'Aktivni filtri',
    'results.open': 'Otvori {title}',
    'listing.aria': 'Detalji oglasa',
    'listing.back': 'Natrag na pretragu',
    'listing.backResults': 'Natrag na rezultate',
    'listing.notFound': 'Ovaj oglas više ne postoji.',
    'listing.noImages': 'Još nema fotografija.',
    'listing.photo': 'Fotografija {number}',
    'listing.category': 'Kategorija',
    'listing.direction': 'Vrsta',
    'listing.seller': 'Prodavač',
    'listing.you': 'Ti',
    'listing.listed': 'Objavljeno',
    'listing.details': 'Detalji',
    'listing.contact': 'Kontaktiraj prodavača',
    'listing.contacting': 'Pokretanje razgovora…',
    'listing.signInToContact': 'Prijavi se za kontakt s prodavačem',
    'listing.yourNote': 'Ovo je tvoj oglas.',
    'listing.draft': 'Skica',

    'facet.placeholder': 'Pretraži po modelu, gorivu, godini…',
    'facet.inputLabel': 'Pretraži filtre',
    'facet.suggestions': 'Prijedlozi filtara',
    'facet.loading': 'Učitavanje prijedloga…',
    'facet.error': 'Prijedlozi se nisu mogli učitati',
    'facet.noMatch': 'Nema filtra koji odgovara „{text}”',
    'facet.remove': 'Ukloni {facetLabel} {label}',
    'facet.resultCount.one': '{count} prijedlog',
    'facet.resultCount.many': '{count} prijedloga',
    'facet.rangeMin': 'Najmanje',
    'facet.rangeMax': 'Najviše',
    'facet.rangeApply': 'Dodaj',
    'facet.rangeUpdate': 'Ažuriraj',
    'facet.rangeClear': 'Očisti',
    'facet.rangeFrom': 'od {value}',
    'facet.rangeUpTo': 'do {value}',
    'facet.rangeAny': 'bilo koje',
    'facet.price': 'Cijena',
    'facet.year': 'Godina',

    'session.aria': '{title} intervju',
    'session.questionsAnswered': 'Odgovorena pitanja',
    'session.answered': '{answered} / {total} odgovoreno',
    'session.empty':
      'Ova kategorija još nema pitanja za intervju. Značajke dodane na poslužitelju pojavit će se ovdje.',
    'session.answeredTitle': 'Odgovoreno',

    'browse.aria': 'Pregledaj tržnicu',
    'browse.title': 'Pregledaj',
    'browse.breadcrumb': 'Putanja',
    'browse.home': 'Početna',
    'browse.open': 'Otvori {title}',
    'browse.subcategory.one': '{count} potkategorija',
    'browse.subcategory.many': '{count} potkategorija',
    'browse.listing.one': '{count} oglas',
    'browse.listing.many': '{count} oglasa',
    'browse.category': 'Kategorija',

    'interview.choose': 'Odaberi jednu od opcija.',
    'interview.next': 'Dalje >',
    'interview.creatingDraft': 'Stvaranje skice…',
    'interview.previous': '< Natrag',
    'interview.signInToPublish': 'Prijavite se za objavu',
    'interview.search': 'Traži',
    'interview.publish': 'Objavi',
    'interview.publishing': 'Objavljivanje…',
    'interview.chooseDirection': 'Prvo odaberi Kupujem ili Prodajem',
    'interview.directionAria': 'Smjer oglasa',

    'wizard.step2': 'Korak 2 od 3 — Uredi',
    'wizard.step3': 'Korak 3 od 3 — Pregled',
    'wizard.editAria': 'Uredi oglas',
    'wizard.previewAria': 'Pregled oglasa',
    'wizard.images': 'Slike',
    'wizard.title': 'Naslov ({language})',
    'wizard.translate': 'Prevedi',
    'wizard.titleHint':
      'Prikazuje se u rezultatima pretrage. Odaberi Prevedi za ostale jezike.',
    'wizard.titleSaving': 'Spremanje naslova…',
    'translate.title': 'Prevedi naslov',
    'translate.hint':
      'Upiši naslov za svaki jezik. Prazni jezici koriste drugi dostupni prijevod.',
    'translate.save': 'Spremi prijevode',
    'translate.saving': 'Spremanje…',
    'wizard.noImages': 'Još nema slika',
    'wizard.imageCount.one': '{count} slika',
    'wizard.imageCount.many': '{count} slika',
    'wizard.primary': 'Glavna',
    'wizard.makePrimary': 'Postavi kao glavnu sliku',
    'wizard.removeImage': 'Ukloni sliku',
    'wizard.removeAria': 'Ukloni {name}',
    'wizard.uploading': 'Prijenos…',
    'wizard.addImages': 'Dodaj slike',
    'wizard.primaryHint':
      'Glavna slika je minijatura prikazana u rezultatima pretrage.',
    'wizard.facets': 'Značajke',
    'wizard.noAnswers': 'Nema odgovorenih pitanja.',
    'wizard.noUploads': 'Nema učitanih slika.',

    'chat.aria': 'Razgovor: {title}',
    'chat.with': 'Razgovor s {name}',
    'chat.otherUser': 'drugi korisnik',
    'chat.live': 'Uživo',
    'chat.connecting': 'Povezivanje…',
    'chat.reconnecting': 'Ponovno povezivanje…',
    'chat.messagesAria': 'Poruke',
    'chat.attach': 'Priloži',
    'chat.attachFile': 'Priloži datoteku',
    'chat.attachmentType': 'Vrsta privitka',
    'chat.image': 'Slika',
    'chat.youtube': 'YouTube video',
    'chat.gps': 'GPS lokacija',
    'chat.placeholder': 'Upiši poruku…',
    'chat.messageText': 'Tekst poruke',
    'chat.send': 'Pošalji poruku',
    'chat.attachmentPlaceholder': '{label} — privitak',

    'facets.aria': 'Filtriraj',
    'facets.title': 'Filtriraj',
    'facets.all': 'Sve',
    'facets.empty': 'Nema značajki za ovu kategoriju.',
    'facets.done': 'Gotovo',

    'listings.empty': 'Nema oglasa koji odgovaraju trenutnim filtrima.',
    'listings.buyTitle': 'Oglasi za kupnju',
    'listings.sellTitle': 'Oglasi za prodaju',
    'listings.searchTitle': 'Rezultati pretrage',
    'listings.your': 'Tvoj oglas: {title}',
    'listings.start': 'Započni razgovor o {title}',
    'listings.yourTitle': 'Ovo je tvoj oglas',
    'listings.startTitle': 'Započni razgovor',

    'messages.aria': 'Poruke',
    'messages.title': 'Poruke',
    'messages.back': 'Natrag na sandučić',
    'messages.empty': 'Još nema razgovora.',
    'messages.inbox': 'Sandučić',

    'delete.title': 'Obriši oglas',
    'delete.message': 'Jeste li sigurni?',
    'delete.detail': '{title} će biti trajno obrisan.',
    'delete.confirm': 'Da',
    'delete.busy': 'Brisanje…',

    'report.title': 'Oglas stvoren',
    'report.body': 'Oglas je stvoren, hvala što koristite kiosk.',

    'settings.title': 'Postavke',
    'settings.body':
      'Ovdje se nalaze izgled, obavijesti i postavke privatnosti. Još ništa nije povezano — ovaj je panel privremen.',

    'profile.title': 'Profil',
    'profile.loading': 'Učitavanje profila…',
    'profile.name': 'Ime',
    'profile.email': 'Email',
    'profile.role': 'Uloga',
    'profile.status': 'Status',
    'profile.active': 'Aktivan',
    'profile.inactive': 'Neaktivan',
    'profile.userId': 'ID korisnika',
    'profile.note': 'Učitano iz tablice korisnika na poslužitelju.',
    'profile.noUsers': 'Poslužitelj još nema korisnika.',
    'profile.guest': 'Prijavite se da vidite svoj profil.',

    'loading.title': 'Učitavanje sesija…',
    'loading.body':
      'Dohvaćanje kategorija, oglasa i razgovora s poslužitelja.',
    'error.title': 'Nije moguće učitati podatke',
    'error.hint': 'Provjerite radi li poslužitelj na http://localhost:3000.',
    'error.retry': 'Pokušaj ponovno',
    'empty.browse': 'Pregledaj',
    'empty.noCategories':
      'Poslužitelj nema kategorija pa još nema što intervjuirati.',

    'notice.imageUploadFailed': 'Prijenos slike nije uspio: {message}',
    'notice.imageDeleteFailed': 'Slika nije obrisana: {message}',
    'notice.primaryFailed': 'Glavna slika nije postavljena: {message}',
    'notice.conversationStarted': 'Razgovor započet za {title}.',
    'notice.conversationFailed': 'Razgovor nije započet: {message}',
    'notice.directionFailed': 'Smjer nije spremljen: {message}',
    'notice.answerFailed': 'Odgovor nije spremljen: {message}',
    'notice.draftFailed': 'Skica oglasa nije stvorena: {message}',
    'notice.titleFailed': 'Naslov nije spremljen: {message}',
    'notice.publishFailed': 'Objava nije uspjela: {message}',
    'notice.publishImageFailed':
      'Oglas je spremljen, ali prijenos slike nije uspio: {message}',
    'notice.deleted': 'Obrisano: {title}.',
    'notice.deleteFailed': 'Brisanje nije uspjelo: {message}',
    'notice.messageFailed': 'Poruka nije spremljena na poslužitelj: {message}',
  },
}

export function translate(language, key, vars) {
  const dict = STRINGS[language] ?? STRINGS[DEFAULT_LANGUAGE]
  let text = dict[key] ?? STRINGS[DEFAULT_LANGUAGE][key] ?? key
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (_, name) =>
      vars[name] == null ? '' : String(vars[name]),
    )
  }
  return text
}

export function pluralKey(count, key) {
  return `${key}.${count === 1 ? 'one' : 'many'}`
}

export function getInitialLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY)
    if (LANGUAGES.some((language) => language.code === stored)) return stored
  } catch {
    // localStorage can be unavailable (private mode, blocked storage).
  }
  return DEFAULT_LANGUAGE
}

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => key,
  languages: LANGUAGES,
})

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(getInitialLanguage)

  // Keep the document language and the stored preference in sync.
  useEffect(() => {
    document.documentElement.lang = language
    try {
      localStorage.setItem(LANGUAGE_KEY, language)
    } catch {
      // Ignore storage failures; the language still applies this session.
    }
  }, [language])

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
      languages: LANGUAGES,
    }),
    [language],
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useI18n() {
  return useContext(LanguageContext)
}
