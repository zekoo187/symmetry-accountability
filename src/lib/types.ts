import type { StatusKey } from './tokens'

export type { StatusKey }

export type Role = 'owner' | 'trainer'

export interface Trainer {
  id: string // e.g. 'PA'
  name: string // 'Paola'
  initials: string // 'PA'
  role: string // discipline, e.g. 'Strength'
  avatarBg: string
}

export interface ClientCheckin {
  name: string
  water: boolean // daily hydration log done
  weekly: boolean // weekly weigh-in done
  win: string // optional celebrated win, '' if none
}

/** A trainer's stats for one week (mirrors weekly_stats + joined check-ins). */
export interface WeeklyMember extends Trainer {
  sessions: number
  sched: number
  showed: number
  noShows: number
  cancels: number
  nextWeek: number
  status: StatusKey
  points: string // sparkline polyline points
  note: string
  clients: ClientCheckin[]
}

export interface Win {
  stat: string
  text: string
}

export interface Week {
  label: string // 'Week of Jul 6 – Jul 12'
  short: string // 'Jul 6–12'
  wins: Win[]
  members: WeeklyMember[]
}

/** Key identifying a single togglable check-in cell. */
export interface CheckKey {
  weekIdx: number
  trainerId: string
  clientName: string
  field: 'water' | 'weekly'
}

export function checkKeyStr(k: CheckKey): string {
  return `${k.weekIdx}:${k.trainerId}:${k.clientName}:${k.field}`
}

export type ChecksMap = Record<string, boolean>
export type NudgedMap = Record<string, boolean> // key: `${weekIdx}:${trainerId}`

export interface CurrentUser {
  id: string
  email: string
  role: Role
  /** For trainer role: the trainer id they map to (e.g. 'SA'). Null for owner. */
  trainerId: string | null
  displayName: string
}
