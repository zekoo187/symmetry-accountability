import type { ChecksMap, CurrentUser, NudgedMap, Week, WeeklyStatsInput } from '../lib/types'
import { checkKeyStr } from '../lib/types'
import { WEEKS } from './seed'
import type { DataAdapter } from './adapter'

const CHECKS_KEY = 'sf_checks'
const NUDGED_KEY = 'sf_nudged'
const ADDED_KEY = 'sf_added_clients' // { [trainerId]: string[] }
const REMOVED_KEY = 'sf_removed_clients' // { [trainerId]: string[] }
const STATS_KEY = 'sf_weekly_stats' // { [`${weekId}:${trainerId}`]: WeeklyStatsInput }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota / private-mode errors */
  }
}

type NameListMap = Record<string, string[]>

/**
 * Deep clone the seed, then apply the local roster overlay: clients the user
 * removed are dropped, clients they added are appended (unchecked).
 */
function cloneWeeks(): Week[] {
  const added = read<NameListMap>(ADDED_KEY, {})
  const removed = read<NameListMap>(REMOVED_KEY, {})
  const stats = read<Record<string, WeeklyStatsInput>>(STATS_KEY, {})
  return WEEKS.map((w) => ({
    ...w,
    wins: w.wins.map((x) => ({ ...x })),
    members: w.members.map((m) => {
      const gone = new Set(removed[m.id] ?? [])
      const kept = m.clients.filter((c) => !gone.has(c.name)).map((c) => ({ ...c }))
      const extra = (added[m.id] ?? [])
        .filter((n) => !gone.has(n) && !kept.some((c) => c.name === n))
        .map((n) => ({ name: n, water: false, weekly: false, win: '' }))
      const clients = [...kept, ...extra].sort((a, b) => a.name.localeCompare(b.name))
      const s = stats[`${w.id}:${m.id}`]
      if (!s) return { ...m, clients }
      return {
        ...m,
        clients,
        sessions: s.sessions,
        showed: s.sessions,
        noShows: s.noShows,
        cancels: s.cancels,
        sched: s.sessions + s.noShows + s.cancels,
        nextWeek: s.nextWeek,
        note: s.note,
      }
    }),
  }))
}

export const mockAdapter: DataAdapter = {
  mode: 'mock',

  async loadWeeks(user: CurrentUser): Promise<Week[]> {
    const weeks = cloneWeeks()
    // A trainer only ever sees their own row (mirrors what RLS returns in prod).
    if (user.role === 'trainer' && user.trainerId) {
      return weeks.map((w) => ({
        ...w,
        members: w.members.filter((m) => m.id === user.trainerId),
      }))
    }
    return weeks
  },

  async loadChecks(): Promise<ChecksMap> {
    return read<ChecksMap>(CHECKS_KEY, {})
  },

  async loadNudged(): Promise<NudgedMap> {
    return read<NudgedMap>(NUDGED_KEY, {})
  },

  async setCheck(_user, weekId, trainerId, clientName, field, value): Promise<void> {
    const checks = read<ChecksMap>(CHECKS_KEY, {})
    checks[checkKeyStr({ weekId, trainerId, clientName, field })] = value
    write(CHECKS_KEY, checks)
  },

  async sendReminder(_user, weekId, trainerId): Promise<void> {
    const nudged = read<NudgedMap>(NUDGED_KEY, {})
    nudged[`${weekId}:${trainerId}`] = true
    write(NUDGED_KEY, nudged)
  },

  async saveWeeklyStats(_user, weekId, trainerId, input): Promise<void> {
    const stats = read<Record<string, WeeklyStatsInput>>(STATS_KEY, {})
    stats[`${weekId}:${trainerId}`] = input
    write(STATS_KEY, stats)
  },

  async addClient(_user, trainerId, clientName): Promise<void> {
    const name = clientName.trim()
    if (!name) return
    const added = read<NameListMap>(ADDED_KEY, {})
    const removed = read<NameListMap>(REMOVED_KEY, {})
    // un-remove if they'd previously been deleted
    if (removed[trainerId]?.includes(name)) {
      removed[trainerId] = removed[trainerId].filter((n) => n !== name)
      write(REMOVED_KEY, removed)
    }
    const list = added[trainerId] ?? []
    if (!list.includes(name)) {
      added[trainerId] = [...list, name]
      write(ADDED_KEY, added)
    }
  },

  async removeClient(_user, trainerId, clientName): Promise<void> {
    const added = read<NameListMap>(ADDED_KEY, {})
    if (added[trainerId]?.includes(clientName)) {
      added[trainerId] = added[trainerId].filter((n) => n !== clientName)
      write(ADDED_KEY, added)
    }
    const removed = read<NameListMap>(REMOVED_KEY, {})
    const list = removed[trainerId] ?? []
    if (!list.includes(clientName)) {
      removed[trainerId] = [...list, clientName]
      write(REMOVED_KEY, removed)
    }
  },
}
