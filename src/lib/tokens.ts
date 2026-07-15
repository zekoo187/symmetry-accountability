// Design tokens — lifted verbatim from the handoff spec (README "Design Tokens").
// Keep this the single source of truth for colour/typography so the UI stays on-brand.

export const font = {
  display: "'Space Grotesk', 'Instrument Sans', system-ui, sans-serif", // numbers, headings, logo
  body: "'Instrument Sans', system-ui, sans-serif", // body / UI
}

export const color = {
  // surfaces
  appBg: '#EFEAE1',
  surface: '#FFFFFF',
  surfaceMuted: '#FBF9F4',

  // borders / dividers
  border: '#E1DACE',
  borderSoft: '#EFE9DE',
  divider: '#F1ECE3',

  // ink / text
  ink: '#23201c',
  text2: '#5C564B',
  text3: '#6F685C',
  muted: '#8A8377',
  faint: '#A79F91',
  arrowDisabled: '#CFC8BC',

  // success
  green: '#2E7D5B',
  greenDark: '#23604a',
  greenTintBg: '#E3F1E9',
  greenTintBorder: '#BEE0CC',

  // warning / at-risk
  amber: '#B9861A',
  amberTintBg: '#F7ECD3',

  // danger / behind
  red: '#C0492E',
  redTintBg: '#F7DDD6',

  // flagged row/card treatments
  rowBehindBg: '#FDF4F1',
  rowRiskBg: '#FEFBF4',
  cardBehindBorder: '#F0D9CF',
  cardRiskBorder: '#EFE4CC',

  // pending check-in chip
  pendingBg: '#EFE9DE',
  pendingFg: '#9A9384',

  // owner chip
  owner: '#E2603A',
} as const

export const winsGradient = 'linear-gradient(135deg,#233B2E,#2E7D5B)'

export const shadow = {
  card: '0 12px 40px rgba(35,32,28,.10)',
  drawer: '-14px 0 44px rgba(35,32,28,.22)',
  phone: '0 20px 50px rgba(35,32,28,.22)',
}

// Avatar colours keyed by trainer name (matches the prototype roster).
export const avatarColor: Record<string, string> = {
  Paola: '#4C6EF5',
  Roma: '#E2603A',
  Natalia: '#C98A16',
  Santiago: '#2E7D5B',
  Ivan: '#B0574A',
  Simona: '#9A6DB8',
}

export type StatusKey = 'track' | 'risk' | 'behind'

export const statusMeta: Record<StatusKey, { label: string; bg: string; fg: string }> = {
  track: { label: 'On track', bg: color.greenTintBg, fg: color.green },
  risk: { label: 'At risk', bg: color.amberTintBg, fg: color.amber },
  behind: { label: 'Behind', bg: color.redTintBg, fg: color.red },
}
