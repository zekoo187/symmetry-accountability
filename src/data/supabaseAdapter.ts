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
import type { DataAdapter } from './adapter'

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

    const clientById = new Map(clients.map((c) => [c.id, c]))
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
            const memberClients: ClientCheckin[] = wkCheckins
              .filter((ci) => clientById.get(ci.client_id)?.trainer_id === s.trainer_id)
              .map((ci) => ({
                name: clientById.get(ci.client_id)?.name ?? '—',
                water: ci.hydration_done,
                weekly: ci.weighin_done,
                win: ci.win_text ?? '',
              }))
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
          // keep a stable roster order
          .sort((a, b) => a.name.localeCompare(b.name))

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
    const { error } = await sb
      .from('checkins')
      .update({ [column]: value })
      .eq('week_id', (wk as { id: string }).id)
      .eq('client_id', (cl as { id: string }).id)
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
