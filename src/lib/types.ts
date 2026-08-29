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

/** Client retention status — a persistent per-client attribute the trainer sets. */
export type Retention = 'active' | 'at_risk' | 'lost'

export interface ClientCheckin {
  name: string
  water: boolean // daily hydration log done
  weekly: boolean // weekly weigh-in done
  win: string // optional celebrated win, '' if none
  retention: Retention // active by default
}

/** The weekly accountability checklist a trainer ticks off. */
export interface Checklist {
  rebooked: boolean // rebooked active clients
  followedUp: boolean // followed up with no-shows
  loggedCheckins: boolean // logged all client check-ins
}

export const EMPTY_CHECKLIST: Checklist = {
  rebooked: false,
  followedUp: false,
  loggedCheckins: false,
}

export const CHECKLIST_ITEMS: { key: keyof Checklist; label: string }[] = [
  { key: 'rebooked', label: 'Rebooked my active clients' },
  { key: 'followedUp', label: 'Followed up with no-shows' },
  { key: 'loggedCheckins', label: 'Logged all client check-ins' },
]

/** A trainer's stats for one week (mirrors weekly_stats + joined check-ins). */
export interface WeeklyMember extends Trainer {
  sessions: number
  sched: number
  showed: number
  noShows: number
  cancels: number
  nextWeek: number
  newClients: number // new clients / consults brought in this week
  checklist: Checklist
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
  /** Stable identifier (DB uuid). Positions shift as weeks roll, ids don't. */
  id: string
  label: string // 'Week of Jul 6 – Jul 12'
  short: string // 'Jul 6–12'
  startDate: string // ISO date of the Monday
  wins: Win[]
  members: WeeklyMember[]
}

/** What a trainer reports for their week. */
export interface WeeklyStatsInput {
  sessions: number // sessions actually delivered
  noShows: number
  cancels: number
  nextWeek: number // sessions booked for next week
  newClients: number // new clients / consults this week
  checklist: Checklist
  note: string
}

/** Key identifying a single togglable check-in cell. */
export interface CheckKey {
  weekId: string
  trainerId: string
  clientName: string
  field: 'water' | 'weekly'
}

export function checkKeyStr(k: CheckKey): string {
  return `${k.weekId}:${k.trainerId}:${k.clientName}:${k.field}`
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
