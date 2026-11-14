// ─────────────────────────────────────────────────────────────
// DATA — static seed content for the Kiosk app
// ─────────────────────────────────────────────────────────────

// Placeholder constant for the chat partner name (per spec, not dynamic).
export const CHAT_PARTNER = 'user XYZ'

export const SESSIONS = [
  {
    id: 's-bike',
    title: 'Bike Fit Studio',
    icon: 'bike',
    questions: [
      {
        id: 'q-bike-1',
        priority: 1,
        text: 'What is your total height?',
        hint: 'Height is the primary driver of frame size.',
        options: ['< 160 cm', '160–170 cm', '171–180 cm', '181–190 cm', '> 190 cm'],
        answered: null,
      },
      {
        id: 'q-bike-2',
        priority: 2,
        text: 'Where will you ride most often?',
        hint: 'Terrain changes geometry, gearing and tire choice.',
        options: ['City streets', 'Gravel paths', 'Forest trails', 'Mountain singletrack'],
        answered: null,
      },
      {
        id: 'q-bike-3',
        priority: 3,
        text: 'Which frame material do you prefer?',
        hint: 'Material affects weight, comfort and price.',
        options: ['Aluminum', 'Steel', 'Carbon', 'Titanium'],
        answered: null,
      },
      {
        id: 'q-bike-4',
        priority: 4,
        text: 'How long are your typical rides?',
        hint: 'Endurance matters for saddle choice and fit.',
        options: ['Under 1 hour', '1–2 hours', '2–4 hours', 'All-day rides'],
        answered: null,
      },
      {
        id: 'q-bike-5',
        priority: 5,
        text: 'Which frame style suits you?',
        hint: 'Step-through frames are easier to mount.',
        options: ['Step-through', 'Crossbar (diamond)', 'No preference'],
        answered: null,
      },
    ],
  },
  {
    id: 's-laptop',
    title: 'Laptop Spec Lab',
    icon: 'laptop',
    questions: [
      {
        id: 'q-lap-1',
        priority: 1,
        text: 'How much RAM do you need?',
        hint: '16 GB handles editing; 8 GB suits browsing and office work.',
        options: ['8 GB', '16 GB', '32 GB', '64 GB'],
        answered: null,
      },
      {
        id: 'q-lap-2',
        priority: 2,
        text: 'Which screen size feels right?',
        hint: 'Larger screens weigh more but are easier on the eyes.',
        options: ['13 inch', '14 inch', '15–16 inch', '17 inch and up'],
        answered: null,
      },
      {
        id: 'q-lap-3',
        priority: 3,
        text: 'What will you use it for most?',
        hint: 'Usage drives CPU and GPU priorities.',
        options: ['Office & browsing', 'Programming', 'Photo & video editing', 'Gaming'],
        answered: null,
      },
      {
        id: 'q-lap-4',
        priority: 4,
        text: 'How much storage do you want?',
        hint: 'SSD space fills up fast with media projects.',
        options: ['256 GB', '512 GB', '1 TB', '2 TB'],
        answered: null,
      },
      {
        id: 'q-lap-5',
        priority: 5,
        text: 'How important is battery life?',
        hint: 'Efficient chips trade raw power for runtime.',
        options: ['Must last all day', 'Half a day is fine', 'Mostly plugged in', 'No preference'],
        answered: null,
      },
    ],
  },
  {
    id: 's-sneaker',
    title: 'Sneaker Fit Check',
    icon: 'sneaker',
    questions: [
      {
        id: 'q-sne-1',
        priority: 1,
        text: 'What is your usual shoe width?',
        hint: 'Width matters as much as length for comfort.',
        options: ['Narrow (AA–B)', 'Regular (B–D)', 'Wide (D–EE)', 'Extra wide (EEE+)'],
        answered: null,
      },
      {
        id: 'q-sne-2',
        priority: 2,
        text: 'What is your typical shoe size?',
        hint: 'Measured on your larger foot.',
        options: ['36–38 (EU)', '39–41 (EU)', '42–44 (EU)', '45+ (EU)'],
        answered: null,
      },
      {
        id: 'q-sne-3',
        priority: 3,
        text: 'How do your arches look?',
        hint: 'Arch type affects cushioning and support.',
        options: ['Flat arches', 'Neutral arches', 'High arches', 'Not sure'],
        answered: null,
      },
      {
        id: 'q-sne-4',
        priority: 4,
        text: 'Where will you wear them most?',
        hint: 'Road, trail and court shoes differ a lot.',
        options: ['Running on road', 'Trail running', 'Gym & court', 'Everyday street'],
        answered: null,
      },
      {
        id: 'q-sne-5',
        priority: 5,
        text: 'How much cushioning do you like?',
        hint: 'Max cushioning protects joints on long runs.',
        options: ['Barely-there', 'Balanced', 'Plush', 'Maximum cushion'],
        answered: null,
      },
    ],
  },
]

export const CHATS_SEED = [
  {
    id: 'c-bike-1',
    sessionId: 's-bike',
    title: 'Pedal Room',
    unread: 2,
    messages: [
      { id: 'm-b1-1', from: 'received', text: 'Hi! Are you looking for a hardtail or a full-suspension rig?', time: '09:41' },
      { id: 'm-b1-2', from: 'sent', text: 'Honestly not sure yet — mostly forest trails on weekends.', time: '09:42' },
      { id: 'm-b1-3', from: 'received', text: 'Then the Trailblazer 29 is a great fit. Want the spec sheet?', time: '09:43' },
    ],
  },
  {
    id: 'c-bike-2',
    sessionId: 's-bike',
    title: 'Trail Crew',
    unread: 0,
    messages: [
      { id: 'm-b2-1', from: 'sent', text: 'Saturday ride is on — meeting at the north gate.', time: '08:15' },
      { id: 'm-b2-2', from: 'received', text: 'Perfect, I will bring the pump and spare tubes.', time: '08:17' },
      { id: 'm-b2-3', from: 'received', text: 'Route file is shared in the trip folder.', time: '08:20' },
    ],
  },
  {
    id: 'c-lap-1',
    sessionId: 's-laptop',
    title: 'Tech Desk',
    unread: 1,
    messages: [
      { id: 'm-l1-1', from: 'received', text: 'Your spec summary is ready — 16 GB RAM looks like the sweet spot.', time: '11:02' },
      { id: 'm-l1-2', from: 'sent', text: 'Great, can you also compare the 14-inch and 16-inch weights?', time: '11:05' },
    ],
  },
  {
    id: 'c-lap-2',
    sessionId: 's-laptop',
    title: 'Study Group',
    unread: 3,
    messages: [
      { id: 'm-l2-1', from: 'received', text: 'Exam notes are uploaded, chapters 4 to 7.', time: '18:40' },
      { id: 'm-l2-2', from: 'received', text: 'Anyone joining the library session tomorrow?', time: '18:44' },
      { id: 'm-l2-3', from: 'sent', text: 'Count me in — the afternoon slot works best.', time: '18:45' },
      { id: 'm-l2-4', from: 'received', text: 'Cool, booking room B2 for 3 pm.', time: '18:47' },
    ],
  },
  {
    id: 'c-sne-1',
    sessionId: 's-sneaker',
    title: "Runner's Club",
    unread: 0,
    messages: [
      { id: 'm-s1-1', from: 'sent', text: 'Did the width swap fix the toe pinch?', time: '07:30' },
      { id: 'm-s1-2', from: 'received', text: 'Yes — the wide fit is a game changer, zero numbness today.', time: '07:32' },
    ],
  },
  {
    id: 'c-sne-2',
    sessionId: 's-sneaker',
    title: 'Sneaker Swap',
    unread: 4,
    messages: [
      { id: 'm-s2-1', from: 'received', text: 'Fresh drop: Trailblazer and Court Classic, both size 43.', time: '21:02' },
      { id: 'm-s2-2', from: 'received', text: 'Bump — price is negotiable this week only.', time: '21:15' },
      { id: 'm-s2-3', from: 'sent', text: 'Interested in the Trailblazer. Any photos of the sole?', time: '21:20' },
      { id: 'm-s2-4', from: 'received', text: 'Uploading tonight — tread is barely worn.', time: '21:22' },
    ],
  },
]

// Nested marketplace data, keyed by category id.
// Each entry: { path: [...breadcrumbs], items: [{ type, id, title, desc, thumb }] }
export const BROWSE_DATA = {
  root: {
    path: ['Home'],
    items: [
      { type: 'category', id: 'bikes', title: 'Bikes', desc: 'Mountain, road and city bikes for every kind of rider, from first laps to race day.', thumb: 'bike' },
      { type: 'category', id: 'laptops', title: 'Laptops', desc: 'Ultrabooks, workhorses and gaming rigs, fresh or refurbished.', thumb: 'laptop' },
      { type: 'category', id: 'sneakers', title: 'Sneakers', desc: 'Running, court and everyday pairs in all widths and sizes.', thumb: 'sneaker' },
      { type: 'listing', id: 'gift-card', title: 'Kiosk Gift Card', desc: 'Flexible store credit the recipient can spend on any session, chat or listing in the marketplace.', thumb: 'tag' },
    ],
  },
  bikes: {
    path: ['Home', 'Bikes'],
    items: [
      { type: 'category', id: 'mountain-bikes', title: 'Mountain Bikes', desc: 'Full-suspension and hardtail machines built for rough singletrack.', thumb: 'bike' },
      { type: 'category', id: 'road-bikes', title: 'Road Bikes', desc: 'Aero, endurance and gravel frames for tarmac and mixed surfaces.', thumb: 'bike' },
      { type: 'listing', id: 'bike-city-cruiser', title: 'City Cruiser 7', desc: 'Relaxed steel cruiser with swept bars, plush saddle and a 7-speed hub — ideal for boardwalk laps and short commutes.', thumb: 'bike' },
    ],
  },
  'mountain-bikes': {
    path: ['Home', 'Bikes', 'Mountain Bikes'],
    items: [
      { type: 'listing', id: 'bike-trailblazer-29', title: 'Trailblazer 29', desc: '29-inch hardtail with 120 mm air fork, 1×12 drivetrain and dropper post — confident on rooty climbs and flow descents.', thumb: 'bike' },
      { type: 'listing', id: 'bike-ridge-pro-fs', title: 'Ridge Pro FS', desc: 'Full-suspension enduro rig with 150 mm front and 140 mm rear travel, plus an alloy frame that shrugs off rock gardens.', thumb: 'bike' },
      { type: 'listing', id: 'bike-kid-trail-24', title: 'Trail Kid 24', desc: "Lightweight 24-inch kids' mountain bike with kid-tuned brakes and low standover — built for first singletrack laps.", thumb: 'bike' },
    ],
  },
  'road-bikes': {
    path: ['Home', 'Bikes', 'Road Bikes'],
    items: [
      { type: 'listing', id: 'bike-aero-sprint', title: 'Aero Sprint 105', desc: 'Wind-tunnel shaped carbon frameset with electronic shifting and deep-section wheels for fast club races.', thumb: 'bike' },
      { type: 'listing', id: 'bike-endure-gravel', title: 'Endure Gravel', desc: 'Endurance geometry with clearance for 45 mm tires and mounts for bags — happy on tarmac, gravel and mud.', thumb: 'bike' },
      { type: 'listing', id: 'bike-club-fixie', title: 'Club Fixie', desc: 'Minimal single-speed with flip-flop hub and chromoly frame — the low-maintenance city weapon.', thumb: 'bike' },
    ],
  },
  laptops: {
    path: ['Home', 'Laptops'],
    items: [
      { type: 'listing', id: 'laptop-ultra-14', title: 'UltraBook 14', desc: '1.2 kg magnesium chassis, 14-inch OLED and an 18-hour battery — the travel-first daily driver.', thumb: 'laptop' },
      { type: 'listing', id: 'laptop-studio-16', title: 'Creator Studio 16', desc: '16-inch mini-LED, 32 GB RAM and a studio-calibrated display for photo and video work.', thumb: 'laptop' },
      { type: 'listing', id: 'laptop-rig-15', title: 'Gaming Rig 15', desc: '144 Hz panel, vapor-chamber cooling and upgradeable RAM and storage for serious play.', thumb: 'laptop' },
    ],
  },
  sneakers: {
    path: ['Home', 'Sneakers'],
    items: [
      { type: 'listing', id: 'sneaker-cloud-runner', title: 'Cloud Runner 4', desc: 'Neutral daily trainer with nitrogen-infused foam and a wide, stable base for long easy miles.', thumb: 'sneaker' },
      { type: 'listing', id: 'sneaker-court-classic', title: 'Court Classic', desc: 'Low-profile leather upper with cupsole grip — dresses up or down and lasts for years.', thumb: 'sneaker' },
      { type: 'listing', id: 'sneaker-trail-grip', title: 'Trail Grip GTX', desc: 'Aggressive 4 mm lugs, a rock plate and waterproof membrane for wet, technical trails.', thumb: 'sneaker' },
    ],
  },
}
