import type { ChecksMap, CurrentUser, NudgedMap, Week, WeeklyStatsInput } from '../lib/types'

/**
 * The persistence boundary. Two implementations:
 *   - mockAdapter      → seed data + localStorage (runs with zero setup)
 *   - supabaseAdapter  → shared Postgres via @supabase/supabase-js
 * The app talks only to this interface, so the UI is identical either way.
 */
export interface DataAdapter {
  readonly mode: 'mock' | 'supabase'

  /** Weeks the current user is allowed to see (owner: all trainers; trainer: self). */
  loadWeeks(user: CurrentUser): Promise<Week[]>

  /** Check-in overrides layered on top of loadWeeks (mock only; supabase returns {}). */
  loadChecks(user: CurrentUser): Promise<ChecksMap>

  /** Which `${weekId}:${trainerId}` reminders have already gone out. */
  loadNudged(user: CurrentUser): Promise<NudgedMap>

  /** Persist a single check-in cell toggle. */
  setCheck(
    user: CurrentUser,
    weekId: string,
    trainerId: string,
    clientName: string,
    field: 'water' | 'weekly',
    value: boolean,
  ): Promise<void>

  /** Record + (in production) actually send a reminder to one trainer. */
  sendReminder(user: CurrentUser, weekId: string, trainerId: string): Promise<void>

  /** Save the numbers a trainer reports for their week. */
  saveWeeklyStats(
    user: CurrentUser,
    weekId: string,
    trainerId: string,
    input: WeeklyStatsInput,
  ): Promise<void>

  /** Add a client to a trainer's roster. Names are unique per trainer. */
  addClient(user: CurrentUser, trainerId: string, clientName: string): Promise<void>

  /** Remove a client (and their check-in history) from a trainer's roster. */
  removeClient(user: CurrentUser, trainerId: string, clientName: string): Promise<void>

  /** Set (or clear, with '') a celebrated win for a client this week. */
  setClientWin(
    user: CurrentUser,
    weekId: string,
    trainerId: string,
    clientName: string,
    winText: string,
  ): Promise<void>
}
