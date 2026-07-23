import type {
  ChecksMap,
  ClientCheckin,
  CurrentUser,
  NudgedMap,
  StatusKey,
  Week,
  WeeklyMember,
} from '../lib/types'
import { supabase } from '../lib/supabase'
import { ROSTER } from './seed'
import type { DataAdapter } from './adapter'

// Canonical display order from the design (Paola, Roma, Natalia, …). Trainers
// not in the seed roster (e.g. real ones added later) fall to the end, keeping
// their query order among themselves.
const ROSTER_ORDER = new Map(ROSTER.map((t, i) => [t.id, i]))
const orderOf = (id: string) => ROSTER_ORDER.get(id) ?? Number.MAX_SAFE_INTEGER

/** How many past weeks to load for the stepper + trend lines. */
const WEEK_WINDOW = 12

/** Today as a local-time ISO date (YYYY-MM-DD), not UTC. */
function todayISO(): string {
  const d = new Date()
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 10)
}

// --- row shapes (match supabase/migrations/0001_init.sql) ---
interface TrainerRow {
  id: string
  name: string
  initials: string
  discipline: string
  avatar_color: string
}
interface ClientRow {
  id: string
  trainer_id: string
  name: string
}
interface WeekRow {
  id: string
  idx: number
  label: string
  short_label: string
  start_date: string
}
interface StatRow {
  trainer_id: string
  week_id: string
  sessions: number
  scheduled: number
  showed: number
  no_shows: number
  cancels: number
  next_week_booked: number
  status: StatusKey
  sparkline_points: string
  note: string
}
interface CheckinRow {
  client_id: string
  week_id: string
  hydration_done: boolean
  weighin_done: boolean
  win_text: string | null
}
interface NudgeRow {
  trainer_id: string
  week_id: string
}

function db() {
  if (!supabase) throw new Error('Supabase client not configured')
  return supabase
}

export const supabaseAdapter: DataAdapter = {
  mode: 'supabase',

  async loadWeeks(_user: CurrentUser): Promise<Week[]> {
    const sb = db()
    // Only weeks that have actually started, newest first — so index 0 is
    // always the current real week and future rows stay hidden until they land.
    const weeksRes = await sb
      .from('weeks')
      .select('*')
      .lte('start_date', todayISO())
      .order('start_date', { ascending: false })
      .limit(WEEK_WINDOW)
    if (weeksRes.error) throw weeksRes.error
    const weeks = (weeksRes.data ?? []) as WeekRow[]
    if (weeks.length === 0) return []
    const weekIds = weeks.map((w) => w.id)

    // RLS scopes each of these to what the signed-in user may read.
    const [trainersRes, clientsRes, statsRes, checkinsRes] = await Promise.all([
      sb.from('trainers').select('*'),
      sb.from('clients').select('*'),
      sb.from('weekly_stats').select('*').in('week_id', weekIds),
      sb.from('checkins').select('*').in('week_id', weekIds),
    ])
    for (const r of [trainersRes, clientsRes, statsRes, checkinsRes]) {
      if (r.error) throw r.error
    }

    const trainers = (trainersRes.data ?? []) as TrainerRow[]
    const clients = (clientsRes.data ?? []) as ClientRow[]
    const stats = (statsRes.data ?? []) as StatRow[]
    const checkins = (checkinsRes.data ?? []) as CheckinRow[]

    // A trainer only sees themselves (RLS already filtered), the owner sees all.
    const visibleTrainers = trainers.slice().sort((a, b) => orderOf(a.id) - orderOf(b.id))

    return weeks.map((wk): Week => {
      const wkCheckins = checkins.filter((c) => c.week_id === wk.id)
      const ciByClient = new Map(wkCheckins.map((ci) => [ci.client_id, ci]))
      const statByTrainer = new Map(
        stats.filter((s) => s.week_id === wk.id).map((s) => [s.trainer_id, s]),
      )

      // Drive rows from the trainer roster so someone with no stats row yet
      // still appears (as zeros) rather than vanishing from the dashboard.
      const members: WeeklyMember[] = visibleTrainers.map((t): WeeklyMember => {
        const s = statByTrainer.get(t.id)
        const memberClients: ClientCheckin[] = clients
          .filter((c) => c.trainer_id === t.id)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => {
            const ci = ciByClient.get(c.id)
            return {
              name: c.name,
              water: ci?.hydration_done ?? false,
              weekly: ci?.weighin_done ?? false,
              win: ci?.win_text ?? '',
            }
          })
        return {
          id: t.id,
          name: t.name,
          initials: t.initials,
          role: t.discipline,
          avatarBg: t.avatar_color,
          sessions: s?.sessions ?? 0,
          sched: s?.scheduled ?? 0,
          showed: s?.showed ?? 0,
          noShows: s?.no_shows ?? 0,
          cancels: s?.cancels ?? 0,
          nextWeek: s?.next_week_booked ?? 0,
          status: s?.status ?? 'track', // recomputed in derive.ts from the numbers
          points: s?.sparkline_points ?? '',
          note: s?.note ?? '',
          clients: memberClients,
        }
      })

      // Wins hero is built from the wins trainers logged on their clients this
      // week, newest-feeling first (owner sees all; a trainer sees their own).
      const winCards = members.flatMap((m) =>
        m.clients
          .filter((c) => c.win)
          .map((c) => ({ stat: c.win, text: `${m.name.split(' ')[0]}’s client ${c.name}` })),
      )

      return {
        id: wk.id,
        label: wk.label,
        short: wk.short_label,
        startDate: wk.start_date,
        wins: winCards,
        members,
      }
    })
  },

  // In production the check-in truth lives in loadWeeks, so no override layer.
  async loadChecks(): Promise<ChecksMap> {
    return {}
  },

  async loadNudged(_user: CurrentUser): Promise<NudgedMap> {
    const sb = db()
    const { data, error } = await sb.from('nudges').select('trainer_id, week_id')
    if (error) throw error
    const out: NudgedMap = {}
    for (const n of (data ?? []) as NudgeRow[]) out[`${n.week_id}:${n.trainer_id}`] = true
    return out
  },

  async setCheck(_user, weekId, trainerId, clientName, field, value): Promise<void> {
    const sb = db()
    const { data: cl, error: clErr } = await sb
      .from('clients')
      .select('id')
      .eq('trainer_id', trainerId)
      .eq('name', clientName)
      .single()
    if (clErr) throw clErr

    const column = field === 'water' ? 'hydration_done' : 'weighin_done'
    // Upsert: a client added mid-week has no check-in row yet.
    const { error } = await sb.from('checkins').upsert(
      { client_id: (cl as { id: string }).id, week_id: weekId, [column]: value },
      { onConflict: 'client_id,week_id' },
    )
    if (error) throw error
  },

  async sendReminder(_user, weekId, trainerId): Promise<void> {
    const sb = db()
    // Record the nudge directly so it works whether or not the optional
    // email Edge Function has been deployed.
    const { error } = await sb.from('nudges').insert({ trainer_id: trainerId, week_id: weekId })
    // 23505 = already nudged this week, which is fine.
    if (error && error.code !== '23505') throw error
    // Best-effort email dispatch; absence of the function must not fail the nudge.
    try {
      await sb.functions.invoke('send-reminder', { body: { weekId, trainerId } })
    } catch {
      /* function not deployed — the nudge is still recorded */
    }
  },

  async addClient(_user, trainerId, clientName): Promise<void> {
    const sb = db()
    const name = clientName.trim()
    if (!name) return
    const { error } = await sb.from('clients').insert({ trainer_id: trainerId, name })
    if (error) throw error
  },

  async removeClient(_user, trainerId, clientName): Promise<void> {
    const sb = db()
    // check-in rows cascade via the FK
    const { error } = await sb
      .from('clients')
      .delete()
      .eq('trainer_id', trainerId)
      .eq('name', clientName)
    if (error) throw error
  },

  async setClientWin(_user, weekId, trainerId, clientName, winText): Promise<void> {
    const sb = db()
    const { data: cl, error: clErr } = await sb
      .from('clients')
      .select('id')
      .eq('trainer_id', trainerId)
      .eq('name', clientName)
      .single()
    if (clErr) throw clErr
    const text = winText.trim()
    const { error } = await sb.from('checkins').upsert(
      { client_id: (cl as { id: string }).id, week_id: weekId, win_text: text || null },
      { onConflict: 'client_id,week_id' },
    )
    if (error) throw error
  },

  async saveWeeklyStats(_user, weekId, trainerId, input): Promise<void> {
    const sb = db()
    const sessions = Math.max(0, Math.round(input.sessions))
    const noShows = Math.max(0, Math.round(input.noShows))
    const cancels = Math.max(0, Math.round(input.cancels))
    const { error } = await sb.from('weekly_stats').upsert(
      {
        trainer_id: trainerId,
        week_id: weekId,
        sessions,
        showed: sessions, // a delivered session is one the client showed for
        scheduled: sessions + noShows + cancels,
        no_shows: noShows,
        cancels,
        next_week_booked: Math.max(0, Math.round(input.nextWeek)),
        note: input.note,
      },
      { onConflict: 'trainer_id,week_id' },
    )
    if (error) throw error
  },
}
