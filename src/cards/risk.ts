/**
 * At-risk detection, read straight off the session cards.
 *
 * Pure: give it a client, that client's cards (newest first, last ~60 days)
 * and today's date, and it says whether the client looks like they are
 * drifting and why. No numbers are invented here: every signal is one of
 * the things a coach already wrote on a card, or a gap between card dates.
 */
import type { Retention } from '../lib/types'
import { DAILY_HABITS, WEEKLY_HABITS, type SessionCard } from './types'

export type RiskLevel = 'high' | 'watch'

export type SignalKey = 'quiet' | 'missed' | 'no_next' | 'pain' | 'habits' | 'low_grades' | 'flagged'

export interface Signal {
  key: SignalKey
  level: RiskLevel
  /** Short, plain-language reason: "14 days since last session". */
  text: string
}

export interface RiskAssessment {
  level: RiskLevel | null
  score: number
  signals: Signal[]
  /** Days since the last completed session, or since the last card of any kind. */
  daysSince: number | null
  lastSessionDate: string | null
  /** Typical days between completed sessions, from the cards themselves. */
  cadenceDays: number | null
}

export const RISK_WINDOW_DAYS = 60

const WEIGHT: Record<RiskLevel, number> = { high: 3, watch: 1 }

/** Days between two ISO dates (b - a). */
export function daysBetween(aISO: string, bISO: string): number {
  const a = Date.UTC(+aISO.slice(0, 4), +aISO.slice(5, 7) - 1, +aISO.slice(8, 10))
  const b = Date.UTC(+bISO.slice(0, 4), +bISO.slice(5, 7) - 1, +bISO.slice(8, 10))
  return Math.round((b - a) / 86_400_000)
}

/** Median gap between completed sessions; null with fewer than three sessions. */
export function cadence(cards: SessionCard[]): number | null {
  const dates = [...new Set(cards.filter((c) => c.outcome === 'completed').map((c) => c.sessionDate))].sort()
  if (dates.length < 3) return null
  const gaps: number[] = []
  for (let i = 1; i < dates.length; i++) gaps.push(daysBetween(dates[i - 1], dates[i]))
  gaps.sort((a, b) => a - b)
  const mid = Math.floor(gaps.length / 2)
  return gaps.length % 2 ? gaps[mid] : Math.round((gaps[mid - 1] + gaps[mid]) / 2)
}

/** Habit days hit over days available, across a set of cards. 0..100, or null. */
export function habitPct(cards: SessionCard[]): number | null {
  const done = cards.filter((c) => c.outcome === 'completed' && (c.daysSince ?? 0) > 0)
  if (done.length === 0) return null
  const total = done.reduce((s, c) => s + (c.daysSince ?? 0), 0)
  const rates: number[] = []
  for (const h of DAILY_HABITS) {
    const hit = done.reduce((s, c) => s + (c.habits[h.key] ?? 0), 0)
    rates.push(Math.min(1, hit / total))
  }
  const weeklyAnswers = done.flatMap((c) => WEEKLY_HABITS.map((h) => c.weekly[h.key]).filter((v) => v !== undefined))
  if (weeklyAnswers.length > 0) rates.push(weeklyAnswers.filter(Boolean).length / weeklyAnswers.length)
  return Math.round((100 * rates.reduce((a, b) => a + b, 0)) / rates.length)
}

/**
 * Assess one client. `cards` must be that client's cards, newest first.
 * A client marked lost by their coach is not assessed (returns level null, no signals).
 */
export function assessClient(
  cards: SessionCard[],
  todayISO: string,
  retention: Retention = 'active',
): RiskAssessment {
  const empty: RiskAssessment = { level: null, score: 0, signals: [], daysSince: null, lastSessionDate: null, cadenceDays: null }
  if (retention === 'lost' || cards.length === 0) return empty

  const sorted = [...cards].sort((a, b) => (a.sessionDate < b.sessionDate ? 1 : a.sessionDate > b.sessionDate ? -1 : 0))
  const completed = sorted.filter((c) => c.outcome === 'completed')
  const lastDone = completed[0] ?? null
  const lastAny = sorted[0]
  const cadenceDays = cadence(sorted)
  const typical = cadenceDays ?? 7
  const signals: Signal[] = []

  // 1. Quiet: too long since the last completed session for this client's own rhythm.
  const ref = lastDone ?? lastAny
  const daysSince = daysBetween(ref.sessionDate, todayISO)
  const watchAt = Math.max(7, Math.round(typical * 1.4))
  const highAt = Math.max(10, typical * 2)
  if (daysSince >= highAt) signals.push({ key: 'quiet', level: 'high', text: `${daysSince} days since last session` })
  else if (daysSince >= watchAt) signals.push({ key: 'quiet', level: 'watch', text: `${daysSince} days since last session` })

  // 2. Missed: the most recent cards were no-shows or cancellations.
  let streak = 0
  for (const c of sorted) {
    if (c.outcome === 'completed') break
    streak++
  }
  if (streak >= 2) signals.push({ key: 'missed', level: 'high', text: `${streak} missed in a row` })
  else if (streak === 1) signals.push({ key: 'missed', level: 'watch', text: lastAny.outcome === 'no_show' ? 'no-show last time' : 'cancelled last time' })

  // 3. Left without the next session booked.
  if (lastDone && lastDone.nextBooked === false && sorted[0] === lastDone) {
    signals.push({ key: 'no_next', level: daysSince >= watchAt ? 'high' : 'watch', text: 'left without next session booked' })
  }

  // 4. Pain flag on the most recent card.
  if (lastAny.pain === 'flag') {
    signals.push({ key: 'pain', level: 'high', text: `pain flag${lastAny.painWhere ? ': ' + lastAny.painWhere : ''}` })
  }

  // 5. Habits collapsing over the last three sessions (needs at least two with days counted).
  const recent = completed.slice(0, 3)
  const withDays = recent.filter((c) => (c.daysSince ?? 0) > 0)
  const h = habitPct(recent)
  if (withDays.length >= 2 && h !== null && h < 35) {
    signals.push({ key: 'habits', level: 'watch', text: `habits ${h}% over last ${recent.length} sessions` })
  }

  // 6. Two of the last three sessions graded low.
  const lows = recent.filter((c) => c.grade === 'low').length
  if (recent.length >= 3 && lows >= 2) {
    signals.push({ key: 'low_grades', level: 'watch', text: `${lows} of last 3 sessions graded low` })
  }

  // 7. Coach already flagged them in the weekly check-in.
  if (retention === 'at_risk') signals.push({ key: 'flagged', level: 'watch', text: 'flagged at-risk by coach' })

  const score = signals.reduce((s, x) => s + WEIGHT[x.level], 0)
  const level: RiskLevel | null = score >= 3 ? 'high' : score >= 1 ? 'watch' : null
  return { level, score, signals, daysSince, lastSessionDate: lastDone?.sessionDate ?? null, cadenceDays }
}

export interface ClientLike {
  id: string
  trainerId: string
  name: string
  retention?: Retention
}

export interface RiskRow<C extends ClientLike = ClientLike> {
  client: C
  risk: RiskAssessment
}

/**
 * Assess a roster against a pile of cards (any order). Returns the at-risk
 * clients sorted worst first, plus the clients with no card in the window
 * (not training, or not being logged: either way worth a look).
 */
export function assessRoster<C extends ClientLike>(
  clients: C[],
  cards: SessionCard[],
  todayISO: string,
): { atRisk: RiskRow<C>[]; noCards: C[]; lost: C[] } {
  const byClient = new Map<string, SessionCard[]>()
  for (const c of cards) byClient.set(c.clientId, [...(byClient.get(c.clientId) ?? []), c])
  const atRisk: RiskRow<C>[] = []
  const noCards: C[] = []
  const lost: C[] = []
  for (const client of clients) {
    if (client.retention === 'lost') {
      lost.push(client)
      continue
    }
    const cs = byClient.get(client.id)
    if (!cs || cs.length === 0) {
      noCards.push(client)
      continue
    }
    const risk = assessClient(cs, todayISO, client.retention ?? 'active')
    if (risk.level) atRisk.push({ client, risk })
  }
  atRisk.sort((a, b) => b.risk.score - a.risk.score || (b.risk.daysSince ?? 0) - (a.risk.daysSince ?? 0))
  return { atRisk, noCards, lost }
}
