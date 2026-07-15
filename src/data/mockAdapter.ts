import type { ChecksMap, CurrentUser, NudgedMap, Week } from '../lib/types'
import { checkKeyStr } from '../lib/types'
import { WEEKS } from './seed'
import type { DataAdapter } from './adapter'

const CHECKS_KEY = 'sf_checks'
const NUDGED_KEY = 'sf_nudged'

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

/** Deep clone the seed so callers never mutate the module-level constant. */
function cloneWeeks(): Week[] {
  return WEEKS.map((w) => ({
    ...w,
    wins: w.wins.map((x) => ({ ...x })),
    members: w.members.map((m) => ({ ...m, clients: m.clients.map((c) => ({ ...c })) })),
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

  async setCheck(_user, weekIdx, trainerId, clientName, field, value): Promise<void> {
    const checks = read<ChecksMap>(CHECKS_KEY, {})
    checks[checkKeyStr({ weekIdx, trainerId, clientName, field })] = value
    write(CHECKS_KEY, checks)
  },

  async sendReminder(_user, weekIdx, trainerId): Promise<void> {
    const nudged = read<NudgedMap>(NUDGED_KEY, {})
    nudged[`${weekIdx}:${trainerId}`] = true
    write(NUDGED_KEY, nudged)
  },
}
