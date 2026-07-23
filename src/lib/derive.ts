import { color, statusMeta } from './tokens'
import type { ChecksMap, StatusKey, Week, WeeklyMember } from './types'
import { checkKeyStr } from './types'

// ---------------------------------------------------------------------------
// All derived values + thresholds, ported from the prototype's renderVals()
// and buildDrawer(). Pure functions so both the UI and tests can reuse them.
// ---------------------------------------------------------------------------

/** Show-rate colour thresholds: >=88 green, >=70 amber, else red. */
export function colorForRate(pct: number): string {
  return pct >= 88 ? color.green : pct >= 70 ? color.amber : color.red
}

/** Check-in completion colour: >=80% green, >=50% amber, else red. */
export function colorForCheckin(rate: number): string {
  return rate >= 0.8 ? color.green : rate >= 0.5 ? color.amber : color.red
}

/** No-show number colour: 0 = ink, 1 = amber, >=2 = red. */
export function colorForNoShows(n: number): string {
  return n >= 2 ? color.red : n === 1 ? color.amber : color.ink
}

/** Effective check value: an override in `checks` wins over the seeded base. */
export function effCheck(checks: ChecksMap, key: string, base: boolean): boolean {
  return key in checks ? checks[key] : base
}

/**
 * Status is derived from the reported numbers rather than stored, so it can
 * never drift from the data.
 *
 * Design intent (tuned): attendance is the primary accountability signal and
 * the ONLY thing that can flag a trainer "behind" (red). A week that hasn't
 * been reported yet (scheduled === 0) is never flagged — the weekly summary
 * calls out non-reporters separately. Check-in completion is a softer signal:
 * it can raise "at risk" (amber) but never "behind", so a trainer with a strong
 * show rate isn't buried red just because they added a client they haven't
 * checked in yet.
 */
export function deriveStatus(
  showRate: number,
  checkinRate: number,
  scheduled: number,
  totalClients: number,
): StatusKey {
  // Nothing reported yet → don't flag (no attendance data to judge on).
  if (scheduled === 0) return 'track'

  // Attendance — the only path to "behind".
  if (showRate < 70) return 'behind'
  if (showRate < 88) return 'risk'

  // Check-ins — secondary, capped at "at risk".
  if (totalClients > 0 && checkinRate < 0.5) return 'risk'

  return 'track'
}

/**
 * Build the 46×18 trend polyline from a trainer's real show rate over the last
 * few weeks (oldest → newest). Returns '' when there isn't enough history.
 */
export function sparklineFor(weeks: Week[], weekIdx: number, trainerId: string): string {
  const rates: number[] = []
  for (let i = Math.min(weeks.length - 1, weekIdx + 4); i >= weekIdx; i--) {
    const m = weeks[i]?.members.find((x) => x.id === trainerId)
    if (!m) continue
    const sched = m.showed + m.noShows + m.cancels
    if (sched <= 0) continue
    rates.push(Math.round((m.showed / sched) * 100))
  }
  if (rates.length < 2) return ''
  const W = 46
  const step = W / (rates.length - 1)
  // map 40..100% onto y 16..2 (lower y = better)
  return rates
    .map((r, i) => {
      const clamped = Math.max(40, Math.min(100, r))
      const y = 16 - ((clamped - 40) / 60) * 14
      return `${Math.round(i * step)},${Math.round(y)}`
    })
    .join(' ')
}

export interface DerivedClient {
  name: string
  water: boolean
  weekly: boolean
  win: string
  waterKey: string
  weeklyKey: string
}

export interface DerivedMember {
  raw: WeeklyMember
  id: string
  name: string
  initials: string
  role: string
  avatarBg: string

  sessions: number
  showRate: number // integer percent
  showRatePct: string // '92%'
  attendText: string // '22/24'
  trendColor: string
  points: string

  clients: DerivedClient[]
  checkedIn: number // clients fully checked in (both fields)
  totalClients: number
  checkinText: string // '2/3'
  checkinColor: string
  checkinRate: number // 0..1

  status: StatusKey
  statusLabel: string
  statusBg: string
  statusFg: string
  flagged: boolean

  noShows: number
  cancels: number
  nextWeek: number
  noShowColor: string
  cancelColor: string

  rowBg: string
  cardBorder: string
  note: string
}

export function deriveMember(
  m: WeeklyMember,
  weekId: string,
  checks: ChecksMap,
  expanded: boolean,
  points?: string,
): DerivedMember {
  // scheduled is the sum of what happened, so it can't disagree with the parts
  const sched = m.showed + m.noShows + m.cancels
  const showRate = sched > 0 ? Math.round((m.showed / sched) * 100) : 0

  const clients: DerivedClient[] = m.clients.map((c) => {
    const waterKey = checkKeyStr({ weekId, trainerId: m.id, clientName: c.name, field: 'water' })
    const weeklyKey = checkKeyStr({ weekId, trainerId: m.id, clientName: c.name, field: 'weekly' })
    return {
      name: c.name,
      win: c.win,
      water: effCheck(checks, waterKey, c.water),
      weekly: effCheck(checks, weeklyKey, c.weekly),
      waterKey,
      weeklyKey,
    }
  })

  const totalClients = clients.length
  const checkedIn = clients.filter((c) => c.water && c.weekly).length
  const checkinRate = totalClients ? checkedIn / totalClients : 1
  const status = deriveStatus(showRate, checkinRate, sched, totalClients)
  const s = statusMeta[status]
  const flagged = status !== 'track'

  return {
    raw: m,
    id: m.id,
    name: m.name,
    initials: m.initials,
    role: m.role,
    avatarBg: m.avatarBg,

    sessions: m.sessions,
    showRate,
    showRatePct: `${showRate}%`,
    attendText: `${m.showed}/${sched}`,
    trendColor: colorForRate(showRate),
    points: points ?? m.points,

    clients,
    checkedIn,
    totalClients,
    checkinText: `${checkedIn}/${totalClients}`,
    checkinColor: colorForCheckin(checkinRate),
    checkinRate,

    status,
    statusLabel: s.label,
    statusBg: s.bg,
    statusFg: s.fg,
    flagged,

    noShows: m.noShows,
    cancels: m.cancels,
    nextWeek: m.nextWeek,
    noShowColor: colorForNoShows(m.noShows),
    cancelColor: m.cancels > 0 ? color.amber : color.ink,

    rowBg:
      status === 'behind'
        ? color.rowBehindBg
        : status === 'risk'
          ? color.rowRiskBg
          : expanded
            ? color.surfaceMuted
            : color.surface,
    cardBorder:
      status === 'behind'
        ? color.cardBehindBorder
        : status === 'risk'
          ? color.cardRiskBorder
          : color.borderSoft,
    note: m.note,
  }
}

export interface WeekTotals {
  sessions: number
  showRate: number // percent
  noShows: number // no-shows + cancels
  flagged: number
}

export function deriveTotals(members: DerivedMember[]): WeekTotals {
  const sessions = members.reduce((a, m) => a + m.sessions, 0)
  const showedSum = members.reduce((a, m) => a + m.raw.showed, 0)
  const schedSum = members.reduce((a, m) => a + m.raw.showed + m.noShows + m.cancels, 0)
  const noShows = members.reduce((a, m) => a + m.noShows + m.cancels, 0)
  const flagged = members.filter((m) => m.flagged).length
  return {
    sessions,
    showRate: schedSum ? Math.round((showedSum / schedSum) * 100) : 0,
    noShows,
    flagged,
  }
}

// ---- stat drawer configuration ----

export type StatId = 'sessions' | 'showrate' | 'noshows' | 'checkins' | 'flagged'

export interface StatRow {
  id: string
  name: string
  initials: string
  avatarBg: string
  valueText: string
  barPct: number // 0..100
  barColor: string
  hasStatus: boolean
  statusLabel?: string
  statusBg?: string
  statusFg?: string
}

export interface StatDrawerData {
  title: string
  total: string
  totalColor: string
  rows: StatRow[]
}

const STAT_LABELS: Record<Exclude<StatId, 'flagged'>, string> = {
  sessions: 'Sessions delivered',
  showrate: 'Show rate',
  noshows: 'No-shows / cancels',
  checkins: 'Client check-ins',
}

export function buildStatDrawer(
  id: StatId,
  members: DerivedMember[],
  totals: WeekTotals,
): StatDrawerData {
  if (id === 'flagged') {
    const rows: StatRow[] = members
      .filter((m) => m.flagged)
      .map((m) => ({
        id: m.id,
        name: m.name,
        initials: m.initials,
        avatarBg: m.avatarBg,
        valueText: m.note,
        barPct: m.showRate,
        barColor: m.statusFg,
        hasStatus: true,
        statusLabel: m.statusLabel,
        statusBg: m.statusBg,
        statusFg: m.statusFg,
      }))
    return { title: 'Needs attention', total: String(totals.flagged), totalColor: color.red, rows }
  }

  const get = (m: DerivedMember): number => {
    switch (id) {
      case 'sessions':
        return m.sessions
      case 'showrate':
        return m.showRate
      case 'noshows':
        return m.noShows + m.cancels
      case 'checkins':
        return m.checkinRate
    }
  }
  const text = (m: DerivedMember): string => {
    switch (id) {
      case 'sessions':
        return `${m.sessions} sessions`
      case 'showrate':
        return `${m.showRate}% · ${m.attendText}`
      case 'noshows':
        return `${m.noShows + m.cancels} (${m.noShows} no-show, ${m.cancels} cancel)`
      case 'checkins':
        return `${m.checkedIn}/${m.totalClients} clients fully checked in`
    }
  }
  const barColor = (m: DerivedMember): string => {
    switch (id) {
      case 'sessions':
        return color.ink
      case 'showrate':
        return m.trendColor
      case 'noshows': {
        const n = m.noShows + m.cancels
        return n >= 3 ? color.red : n >= 1 ? color.amber : color.arrowDisabled
      }
      case 'checkins':
        return m.checkinColor
    }
  }
  const totalColor: Record<Exclude<StatId, 'flagged'>, string> = {
    sessions: color.ink,
    showrate: color.green,
    noshows: color.amber,
    checkins: color.green,
  }
  const totalText: Record<Exclude<StatId, 'flagged'>, string> = {
    sessions: String(totals.sessions),
    showrate: `${totals.showRate}%`,
    noshows: String(totals.noShows),
    checkins: `${members.reduce((a, m) => a + m.checkedIn, 0)}/${members.reduce((a, m) => a + m.totalClients, 0)}`,
  }

  const mx = Math.max(1, ...members.map(get))
  const rows: StatRow[] = members
    .slice()
    .sort((a, b) => get(b) - get(a))
    .map((m) => {
      const pct =
        id === 'showrate' || id === 'checkins'
          ? id === 'checkins'
            ? Math.round(m.checkinRate * 100)
            : m.showRate
          : Math.round((get(m) / mx) * 100)
      return {
        id: m.id,
        name: m.name,
        initials: m.initials,
        avatarBg: m.avatarBg,
        valueText: text(m),
        barPct: pct,
        barColor: barColor(m),
        hasStatus: false,
      }
    })

  return { title: STAT_LABELS[id], total: totalText[id], totalColor: totalColor[id], rows }
}

/**
 * Full derived view for one week. Takes the whole `weeks` list so trend lines
 * can be built from real history rather than stored placeholder points.
 */
export function deriveWeek(
  weeks: Week[],
  weekIdx: number,
  checks: ChecksMap,
  expandedId: string | null,
) {
  const week = weeks[weekIdx]
  const members = week.members.map((m) =>
    deriveMember(m, week.id, checks, expandedId === m.id, sparklineFor(weeks, weekIdx, m.id)),
  )
  const totals = deriveTotals(members)
  return { members, totals }
}
