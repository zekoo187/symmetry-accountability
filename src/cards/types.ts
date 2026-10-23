/** The per-session card a coach fills at the end of every session. */

export type Outcome = 'completed' | 'no_show' | 'cancelled'
export type Pain = 'none' | 'modified' | 'flag'
export type Grade = 'low' | 'medium' | 'high' | 'mastered'

/** Daily habits: days hit since the last session. Keys are stable ids. */
export const DAILY_HABITS = [
  { key: 'calories', label: 'Calories', target: 'within target' },
  { key: 'protein', label: 'Protein', target: 'daily target' },
  { key: 'fiber', label: 'Fiber', target: 'daily target' },
  { key: 'greens', label: 'Greens & fruit', target: '5 servings' },
  { key: 'hydration', label: 'Hydration', target: '3 L' },
  { key: 'sleep', label: 'Sleep', target: '7 h+' },
  { key: 'steps', label: 'Steps', target: '8,000' },
] as const

/** Weekly habits: on target this week so far, yes or no. */
export const WEEKLY_HABITS = [
  { key: 'eating_out', label: 'Eating out', target: '2 meals/wk or fewer' },
  { key: 'alcohol', label: 'Alcohol', target: '3 drinks/wk or fewer' },
  { key: 'cardio', label: 'Cardio', target: '150 min Zone 2/wk' },
] as const

export type DailyHabitKey = (typeof DAILY_HABITS)[number]['key']
export type WeeklyHabitKey = (typeof WEEKLY_HABITS)[number]['key']

export const GRADES: { key: Grade; label: string; hint: string }[] = [
  { key: 'low', label: 'Low', hint: 'Loads missed or technique broke down' },
  { key: 'medium', label: 'Medium', hint: 'Plan done, nothing to progress' },
  { key: 'high', label: 'High', hint: 'Plan done, ready to progress' },
  { key: 'mastered', label: 'Mastered ★', hint: 'Progressed today' },
]

export interface SessionCard {
  id: string
  trainerId: string
  clientId: string
  clientName: string
  sessionDate: string // ISO date
  outcome: Outcome
  onTime: boolean | null
  readiness: number | null
  bodyweight: number | null
  sleepH: number | null
  pain: Pain
  painWhere: string
  daysSince: number | null
  homeDays: number | null
  habits: Partial<Record<DailyHabitKey, number>>
  weekly: Partial<Record<WeeklyHabitKey, boolean>>
  exercises: string
  rpe: number | null
  grade: Grade | null
  win: string
  nextBooked: boolean | null
  nextDate: string | null
  photoPath: string | null
  notes: string
  createdAt: string
}

/** What the form submits. The id is set when editing an existing card. */
export type SessionCardInput = Omit<SessionCard, 'id' | 'createdAt' | 'clientName' | 'photoPath'> & {
  id?: string
  photoFile?: File | null
}

export const EMPTY_HABITS: Record<DailyHabitKey, number> = {
  calories: 0,
  protein: 0,
  fiber: 0,
  greens: 0,
  hydration: 0,
  sleep: 0,
  steps: 0,
}

export const EMPTY_WEEKLY: Record<WeeklyHabitKey, boolean> = {
  eating_out: false,
  alcohol: false,
  cardio: false,
}
