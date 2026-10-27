/**
 * Due tracking: the two-week check-in and the week-8 re-test.
 *
 * Pure. A client has a start date (set by the coach, or failing that the
 * date of their first card). Check-ins are due every 14 days from the start
 * or from the last check-in done; re-tests every 56 days from the start or
 * the last re-test done. Nothing is pre-generated.
 */
import { daysBetween } from './risk'
import type { SessionCard } from './types'

export type MilestoneKind = 'checkin' | 'retest'

export const MILESTONES: Record<MilestoneKind, { label: string; everyDays: number }> = {
  checkin: { label: '2-week check-in', everyDays: 14 },
  retest: { label: 'Week-8 re-test', everyDays: 56 },
}

export interface Milestone {
  id: string
  clientId: string
  trainerId: string
  kind: MilestoneKind
  dueOn: string | null
  doneOn: string
  note: string
}

export interface DueClient {
  id: string
  trainerId: string
  name: string
  startedOn: string | null
  retention?: 'active' | 'at_risk' | 'lost'
}

export type DueStatus = 'overdue' | 'due' | 'upcoming'

export interface DueItem<C extends DueClient = DueClient> {
  client: C
  kind: MilestoneKind
  dueOn: string
  /** Negative when overdue. */
  daysLeft: number
  status: DueStatus
  lastDoneOn: string | null
  /** Which occurrence this is: 1 = the first check-in / re-test. */
  nth: number
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** The start date to use: the coach's, else the earliest card on file. */
export function effectiveStart(client: DueClient, cards: SessionCard[]): string | null {
  if (client.startedOn) return client.startedOn
  let first: string | null = null
  for (const c of cards) if (c.clientId === client.id && (first === null || c.sessionDate < first)) first = c.sessionDate
  return first
}

/** The next due date of one kind for one client. */
export function nextDue(
  kind: MilestoneKind,
  start: string,
  done: Milestone[],
): { dueOn: string; lastDoneOn: string | null; nth: number } {
  const mine = done.filter((m) => m.kind === kind).sort((a, b) => (a.doneOn < b.doneOn ? 1 : a.doneOn > b.doneOn ? -1 : 0))
  const last = mine[0] ?? null
  const from = last ? last.doneOn : start
  return { dueOn: addDays(from, MILESTONES[kind].everyDays), lastDoneOn: last?.doneOn ?? null, nth: mine.length + 1 }
}

/**
 * Everything due across a roster. `dueWithinDays` controls what counts as
 * "due" (default: the next 7 days); anything later but within `horizonDays`
 * is "upcoming"; later still is left out. Lost clients are skipped.
 */
export function computeDue<C extends DueClient>(
  clients: C[],
  milestones: Milestone[],
  cards: SessionCard[],
  todayISO: string,
  opts: { dueWithinDays?: number; horizonDays?: number } = {},
): { items: DueItem<C>[]; noStart: C[] } {
  const dueWithin = opts.dueWithinDays ?? 7
  const horizon = opts.horizonDays ?? 14
  const byClient = new Map<string, Milestone[]>()
  for (const m of milestones) byClient.set(m.clientId, [...(byClient.get(m.clientId) ?? []), m])
  const items: DueItem<C>[] = []
  const noStart: C[] = []
  for (const client of clients) {
    if (client.retention === 'lost') continue
    const start = effectiveStart(client, cards)
    if (!start) {
      noStart.push(client)
      continue
    }
    for (const kind of Object.keys(MILESTONES) as MilestoneKind[]) {
      const n = nextDue(kind, start, byClient.get(client.id) ?? [])
      const daysLeft = daysBetween(todayISO, n.dueOn)
      if (daysLeft > horizon) continue
      const status: DueStatus = daysLeft < 0 ? 'overdue' : daysLeft <= dueWithin ? 'due' : 'upcoming'
      items.push({ client, kind, dueOn: n.dueOn, daysLeft, status, lastDoneOn: n.lastDoneOn, nth: n.nth })
    }
  }
  items.sort((a, b) => a.daysLeft - b.daysLeft || a.client.name.localeCompare(b.client.name))
  return { items, noStart }
}
