/**
 * Session cards persistence. Supabase when configured, localStorage in demo
 * mode, behind the same four calls so the UI does not care which.
 */
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { CurrentUser, Retention } from '../lib/types'
import type { Grade, Outcome, Pain, SessionCard, SessionCardInput } from './types'
import type { Milestone, MilestoneKind } from './due'
import { WEEKS } from '../data/seed'

export interface ClientRef {
  id: string
  trainerId: string
  name: string
  retention: Retention
  /** When the client started, set by the coach; null until set. */
  startedOn: string | null
}

export interface MilestoneInput {
  clientId: string
  trainerId: string
  kind: MilestoneKind
  dueOn: string | null
  doneOn: string
  note: string
}

export interface CardsApi {
  /** Clients the user may log cards for (owner: all; trainer: own). */
  listClients(user: CurrentUser): Promise<ClientRef[]>
  /** Cards between two ISO dates inclusive, newest first. */
  listCards(user: CurrentUser, fromISO: string, toISO: string): Promise<SessionCard[]>
  /** All cards for one client, newest first. */
  listClientCards(user: CurrentUser, clientId: string): Promise<SessionCard[]>
  /** Create or update a card; uploads the photo when one is attached. */
  saveCard(user: CurrentUser, input: SessionCardInput): Promise<SessionCard>
  /** A short-lived URL for a card photo, or null when it cannot be served. */
  photoUrl(path: string): Promise<string | null>
  /** Check-ins and re-tests already done (owner: all; trainer: own). */
  listMilestones(user: CurrentUser): Promise<Milestone[]>
  /** Record a check-in or re-test as done. */
  markMilestone(user: CurrentUser, input: MilestoneInput): Promise<Milestone>
  /** Set (or clear) a client's start date. */
  setStartedOn(user: CurrentUser, clientId: string, startedOn: string | null): Promise<void>
}

interface CardRow {
  id: string
  trainer_id: string
  client_id: string
  session_date: string
  outcome: Outcome
  on_time: boolean | null
  readiness: number | null
  bodyweight: number | null
  sleep_h: number | null
  pain: Pain
  pain_where: string
  days_since: number | null
  home_days: number | null
  habits: SessionCard['habits']
  weekly: SessionCard['weekly']
  exercises: string
  rpe: number | null
  grade: Grade | null
  win: string
  next_booked: boolean | null
  next_date: string | null
  photo_path: string | null
  notes: string
  created_at: string
}

function fromRow(r: CardRow, names: Map<string, string>): SessionCard {
  return {
    id: r.id,
    trainerId: r.trainer_id,
    clientId: r.client_id,
    clientName: names.get(r.client_id) ?? '',
    sessionDate: r.session_date,
    outcome: r.outcome,
    onTime: r.on_time,
    readiness: r.readiness,
    bodyweight: r.bodyweight === null ? null : Number(r.bodyweight),
    sleepH: r.sleep_h === null ? null : Number(r.sleep_h),
    pain: r.pain,
    painWhere: r.pain_where ?? '',
    daysSince: r.days_since,
    homeDays: r.home_days,
    habits: r.habits ?? {},
    weekly: r.weekly ?? {},
    exercises: r.exercises ?? '',
    rpe: r.rpe,
    grade: r.grade,
    win: r.win ?? '',
    nextBooked: r.next_booked,
    nextDate: r.next_date,
    photoPath: r.photo_path,
    notes: r.notes ?? '',
    createdAt: r.created_at,
  }
}

function toRow(input: SessionCardInput, userId: string): Omit<CardRow, 'id' | 'created_at' | 'photo_path'> & {
  created_by: string
} {
  return {
    trainer_id: input.trainerId,
    client_id: input.clientId,
    session_date: input.sessionDate,
    outcome: input.outcome,
    on_time: input.onTime,
    readiness: input.readiness,
    bodyweight: input.bodyweight,
    sleep_h: input.sleepH,
    pain: input.pain,
    pain_where: input.painWhere,
    days_since: input.daysSince,
    home_days: input.homeDays,
    habits: input.habits,
    weekly: input.weekly,
    exercises: input.exercises,
    rpe: input.rpe,
    grade: input.grade,
    win: input.win,
    next_booked: input.nextBooked,
    next_date: input.nextDate,
    notes: input.notes,
    created_by: userId,
  }
}

/** Shrink a phone photo to a ~1400px JPEG so the free storage tier lasts. */
export async function compressPhoto(file: File, maxEdge = 1400, quality = 0.72): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', quality),
  )
}

interface MilestoneRow {
  id: string
  client_id: string
  trainer_id: string
  kind: MilestoneKind
  due_on: string | null
  done_on: string
  note: string
}

function milestoneFromRow(r: MilestoneRow): Milestone {
  return { id: r.id, clientId: r.client_id, trainerId: r.trainer_id, kind: r.kind, dueOn: r.due_on, doneOn: r.done_on, note: r.note ?? '' }
}

// ---------------------------------------------------------------- Supabase
const sb = () => {
  if (!supabase) throw new Error('Supabase is not configured')
  return supabase
}

async function clientNames(ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await sb().from('clients').select('id,name').in('id', ids)
  if (error) throw error
  return new Map((data as { id: string; name: string }[]).map((c) => [c.id, c.name]))
}

const supabaseCards: CardsApi = {
  async listClients(): Promise<ClientRef[]> {
    const { data, error } = await sb().from('clients').select('id,trainer_id,name,retention,started_on').order('name')
    if (error) throw error
    return (data as { id: string; trainer_id: string; name: string; retention: Retention | null; started_on: string | null }[]).map((c) => ({
      id: c.id,
      trainerId: c.trainer_id,
      name: c.name,
      retention: c.retention ?? 'active',
      startedOn: c.started_on ?? null,
    }))
  },

  async listMilestones(): Promise<Milestone[]> {
    const { data, error } = await sb().from('client_milestones').select('*').order('done_on', { ascending: false })
    if (error) throw error
    return (data as MilestoneRow[]).map(milestoneFromRow)
  },

  async markMilestone(user, input): Promise<Milestone> {
    const { data, error } = await sb()
      .from('client_milestones')
      .insert({
        client_id: input.clientId,
        trainer_id: input.trainerId,
        kind: input.kind,
        due_on: input.dueOn,
        done_on: input.doneOn,
        note: input.note,
        created_by: user.id,
      })
      .select('*')
      .single()
    if (error) throw error
    return milestoneFromRow(data as MilestoneRow)
  },

  async setStartedOn(_user, clientId, startedOn): Promise<void> {
    const { error } = await sb().from('clients').update({ started_on: startedOn }).eq('id', clientId)
    if (error) throw error
  },

  async listCards(_user, fromISO, toISO): Promise<SessionCard[]> {
    const { data, error } = await sb()
      .from('session_cards')
      .select('*')
      .gte('session_date', fromISO)
      .lte('session_date', toISO)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    const rows = data as CardRow[]
    const names = await clientNames([...new Set(rows.map((r) => r.client_id))])
    return rows.map((r) => fromRow(r, names))
  },

  async listClientCards(_user, clientId): Promise<SessionCard[]> {
    const { data, error } = await sb()
      .from('session_cards')
      .select('*')
      .eq('client_id', clientId)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) throw error
    const rows = data as CardRow[]
    const names = await clientNames([clientId])
    return rows.map((r) => fromRow(r, names))
  },

  async saveCard(user, input): Promise<SessionCard> {
    const row = toRow(input, user.id)
    let saved: CardRow
    if (input.id) {
      const { data, error } = await sb().from('session_cards').update(row).eq('id', input.id).select('*').single()
      if (error) throw error
      saved = data as CardRow
    } else {
      const { data, error } = await sb().from('session_cards').insert(row).select('*').single()
      if (error) throw error
      saved = data as CardRow
    }
    if (input.photoFile) {
      const blob = await compressPhoto(input.photoFile)
      const path = `${saved.trainer_id}/${saved.id}.jpg`
      const { error: upErr } = await sb().storage.from('cards').upload(path, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })
      if (upErr) throw upErr
      const { data, error } = await sb()
        .from('session_cards')
        .update({ photo_path: path })
        .eq('id', saved.id)
        .select('*')
        .single()
      if (error) throw error
      saved = data as CardRow
    }
    const names = await clientNames([saved.client_id])
    return fromRow(saved, names)
  },

  async photoUrl(path): Promise<string | null> {
    const { data, error } = await sb().storage.from('cards').createSignedUrl(path, 60 * 10)
    if (error) return null
    return data.signedUrl
  },
}

// -------------------------------------------------------------------- Demo
const LS_KEY = 'symmetry.sessionCards.v1'

function lsRead(): SessionCard[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as SessionCard[]
  } catch {
    return []
  }
}
function lsWrite(cards: SessionCard[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(cards))
}
const MS_KEY = 'symmetry.milestones.v1'
const START_KEY = 'symmetry.clientStart.v1'
function lsGet<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T
  } catch {
    return fallback
  }
}

const mockCards: CardsApi = {
  async listClients(user): Promise<ClientRef[]> {
    // The demo roster lives in the seed; mirror it from the weeks the app
    // already loaded by reading the mock adapter's seed indirectly.
    const out: ClientRef[] = []
    const starts = lsGet<Record<string, string | null>>(START_KEY, {})
    for (const m of WEEKS[0].members) {
      if (user.role === 'trainer' && m.id !== user.trainerId) continue
      for (const c of m.clients) {
        const id = `${m.id}:${c.name}`
        out.push({ id, trainerId: m.id, name: c.name, retention: c.retention, startedOn: starts[id] ?? null })
      }
    }
    return out
  },
  async listMilestones(user) {
    return lsGet<Milestone[]>(MS_KEY, []).filter((m) => user.role === 'owner' || m.trainerId === user.trainerId)
  },
  async markMilestone(_user, input) {
    const all = lsGet<Milestone[]>(MS_KEY, [])
    const m: Milestone = { id: `ms-${Date.now()}`, ...input }
    localStorage.setItem(MS_KEY, JSON.stringify([...all, m]))
    return m
  },
  async setStartedOn(_user, clientId, startedOn) {
    const starts = lsGet<Record<string, string | null>>(START_KEY, {})
    starts[clientId] = startedOn
    localStorage.setItem(START_KEY, JSON.stringify(starts))
  },
  async listCards(user, fromISO, toISO) {
    return lsRead()
      .filter((c) => c.sessionDate >= fromISO && c.sessionDate <= toISO)
      .filter((c) => user.role === 'owner' || c.trainerId === user.trainerId)
      .sort((a, b) => (a.sessionDate < b.sessionDate ? 1 : -1))
  },
  async listClientCards(_user, clientId) {
    return lsRead()
      .filter((c) => c.clientId === clientId)
      .sort((a, b) => (a.sessionDate < b.sessionDate ? 1 : -1))
  },
  async saveCard(_user, input) {
    const all = lsRead()
    const id = input.id ?? `card-${Date.now()}`
    const existing = all.find((c) => c.id === id)
    const card: SessionCard = {
      ...(existing ?? { id, createdAt: new Date().toISOString(), photoPath: null, clientName: '' }),
      ...input,
      id,
      clientName: input.clientId.split(':')[1] ?? '',
      photoPath: input.photoFile ? 'demo' : (existing?.photoPath ?? null),
    }
    delete (card as unknown as { photoFile?: File }).photoFile
    lsWrite([...all.filter((c) => c.id !== id), card])
    return card
  },
  async photoUrl() {
    return null
  },
}

export const cardsApi: CardsApi = isSupabaseConfigured ? supabaseCards : mockCards

/** ISO date for today in the browser's time zone. */
export function todayISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** ISO date n days before an ISO date. */
export function daysBefore(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - n)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
