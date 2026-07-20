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
interface WinRow {
  week_id: string
  position: number
  stat: string
  text: string
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
    // RLS scopes each of these to what the signed-in user may read.
    const [weeksRes, trainersRes, clientsRes, statsRes, checkinsRes, winsRes] = await Promise.all([
      sb.from('weeks').select('*').order('idx', { ascending: true }),
      sb.from('trainers').select('*'),
      sb.from('clients').select('*'),
      sb.from('weekly_stats').select('*'),
      sb.from('checkins').select('*'),
      sb.from('wins').select('*').order('position', { ascending: true }),
    ])
    for (const r of [weeksRes, trainersRes, clientsRes, statsRes, checkinsRes, winsRes]) {
      if (r.error) throw r.error
    }

    const weeks = (weeksRes.data ?? []) as WeekRow[]
    const trainers = (trainersRes.data ?? []) as TrainerRow[]
    const clients = (clientsRes.data ?? []) as ClientRow[]
    const stats = (statsRes.data ?? []) as StatRow[]
    const checkins = (checkinsRes.data ?? []) as CheckinRow[]
    const wins = (winsRes.data ?? []) as WinRow[]

    const trainerById = new Map(trainers.map((t) => [t.id, t]))

    return weeks
      .sort((a, b) => a.idx - b.idx)
      .map((wk): Week => {
        const wkCheckins = checkins.filter((c) => c.week_id === wk.id)
        const members: WeeklyMember[] = stats
          .filter((s) => s.week_id === wk.id)
          .map((s): WeeklyMember | null => {
            const t = trainerById.get(s.trainer_id)
            if (!t) return null
            // Drive the list from the trainer's roster, not from check-in rows,
            // so a newly added client appears immediately (unchecked) before
            // they have any check-in record for this week.
            const ciByClient = new Map(wkCheckins.map((ci) => [ci.client_id, ci]))
            const memberClients: ClientCheckin[] = clients
              .filter((c) => c.trainer_id === s.trainer_id)
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
              sessions: s.sessions,
              sched: s.scheduled,
              showed: s.showed,
              noShows: s.no_shows,
              cancels: s.cancels,
              nextWeek: s.next_week_booked,
              status: s.status,
              points: s.sparkline_points,
              note: s.note,
              clients: memberClients,
            }
          })
          .filter((m): m is WeeklyMember => m !== null)
          // preserve the design's fixed roster order (not alphabetical)
          .sort((a, b) => orderOf(a.id) - orderOf(b.id))

        return {
          label: wk.label,
          short: wk.short_label,
          wins: wins.filter((w) => w.week_id === wk.id).map((w) => ({ stat: w.stat, text: w.text })),
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
    const [nudgesRes, weeksRes] = await Promise.all([
      sb.from('nudges').select('trainer_id, week_id'),
      sb.from('weeks').select('id, idx'),
    ])
    if (nudgesRes.error) throw nudgesRes.error
    if (weeksRes.error) throw weeksRes.error
    const idxByWeekId = new Map((weeksRes.data as WeekRow[]).map((w) => [w.id, w.idx]))
    const out: NudgedMap = {}
    for (const n of nudgesRes.data as NudgeRow[]) {
      const idx = idxByWeekId.get(n.week_id)
      if (idx !== undefined) out[`${idx}:${n.trainer_id}`] = true
    }
    return out
  },

  async setCheck(_user, weekIdx, trainerId, clientName, field, value): Promise<void> {
    const sb = db()
    const { data: wk, error: wkErr } = await sb
      .from('weeks')
      .select('id')
      .eq('idx', weekIdx)
      .single()
    if (wkErr) throw wkErr
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
      {
        client_id: (cl as { id: string }).id,
        week_id: (wk as { id: string }).id,
        [column]: value,
      },
      { onConflict: 'client_id,week_id' },
    )
    if (error) throw error
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

  async sendReminder(_user, weekIdx, trainerId): Promise<void> {
    const sb = db()
    // Edge Function records the nudge AND dispatches the email/SMS/push.
    const { error } = await sb.functions.invoke('send-reminder', {
      body: { weekIdx, trainerId },
    })
    if (error) throw error
  },
}
