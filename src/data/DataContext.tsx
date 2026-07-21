import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ChecksMap, CurrentUser, NudgedMap, Week, WeeklyStatsInput } from '../lib/types'
import { checkKeyStr } from '../lib/types'
import { isSupabaseConfigured } from '../lib/supabase'
import type { DataAdapter } from './adapter'
import { mockAdapter } from './mockAdapter'
import { supabaseAdapter } from './supabaseAdapter'

export const adapter: DataAdapter = isSupabaseConfigured ? supabaseAdapter : mockAdapter

interface DataContextValue {
  loading: boolean
  error: string | null
  mode: DataAdapter['mode']
  weeks: Week[]
  checks: ChecksMap
  nudged: NudgedMap
  toggleCheck: (
    weekId: string,
    trainerId: string,
    clientName: string,
    field: 'water' | 'weekly',
    nextValue: boolean,
  ) => void
  sendReminder: (weekId: string, trainerId: string) => void
  sendReminders: (weekId: string, trainerIds: string[]) => void
  addClient: (trainerId: string, clientName: string) => Promise<void>
  removeClient: (trainerId: string, clientName: string) => Promise<void>
  saveWeeklyStats: (
    weekId: string,
    trainerId: string,
    input: WeeklyStatsInput,
  ) => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [weeks, setWeeks] = useState<Week[]>([])
  const [checks, setChecks] = useState<ChecksMap>({})
  const [nudged, setNudged] = useState<NudgedMap>({})
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([adapter.loadWeeks(user), adapter.loadChecks(user), adapter.loadNudged(user)])
      .then(([w, c, n]) => {
        if (cancelled) return
        setWeeks(w)
        setChecks(c)
        setNudged(n)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load data')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const toggleCheck = useCallback<DataContextValue['toggleCheck']>(
    (weekId, trainerId, clientName, field, nextValue) => {
      const key = checkKeyStr({ weekId, trainerId, clientName, field })
      setChecks((prev) => ({ ...prev, [key]: nextValue })) // optimistic
      adapter.setCheck(user, weekId, trainerId, clientName, field, nextValue).catch((e) => {
        if (mounted.current) setError(e instanceof Error ? e.message : 'Failed to save check-in')
      })
    },
    [user],
  )

  const sendReminder = useCallback<DataContextValue['sendReminder']>(
    (weekId, trainerId) => {
      setNudged((prev) => ({ ...prev, [`${weekId}:${trainerId}`]: true })) // optimistic
      adapter.sendReminder(user, weekId, trainerId).catch((e) => {
        if (mounted.current) setError(e instanceof Error ? e.message : 'Failed to send reminder')
      })
    },
    [user],
  )

  const sendReminders = useCallback<DataContextValue['sendReminders']>(
    (weekId, trainerIds) => {
      setNudged((prev) => {
        const next = { ...prev }
        for (const id of trainerIds) next[`${weekId}:${id}`] = true
        return next
      })
      trainerIds.forEach((id) =>
        adapter.sendReminder(user, weekId, id).catch((e) => {
          if (mounted.current) setError(e instanceof Error ? e.message : 'Failed to send reminder')
        }),
      )
    },
    [user],
  )

  // Re-pull the roster after a client is added/removed.
  const refreshWeeks = useCallback(async () => {
    const w = await adapter.loadWeeks(user)
    if (mounted.current) setWeeks(w)
  }, [user])

  const addClient = useCallback<DataContextValue['addClient']>(
    async (trainerId, clientName) => {
      try {
        await adapter.addClient(user, trainerId, clientName)
        await refreshWeeks()
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : 'Failed to add client')
      }
    },
    [user, refreshWeeks],
  )

  const removeClient = useCallback<DataContextValue['removeClient']>(
    async (trainerId, clientName) => {
      try {
        await adapter.removeClient(user, trainerId, clientName)
        await refreshWeeks()
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : 'Failed to remove client')
      }
    },
    [user, refreshWeeks],
  )

  const saveWeeklyStats = useCallback<DataContextValue['saveWeeklyStats']>(
    async (weekId, trainerId, input) => {
      try {
        await adapter.saveWeeklyStats(user, weekId, trainerId, input)
        await refreshWeeks()
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : 'Failed to save your week')
      }
    },
    [user, refreshWeeks],
  )

  const value = useMemo<DataContextValue>(
    () => ({
      loading,
      error,
      mode: adapter.mode,
      weeks,
      checks,
      nudged,
      toggleCheck,
      sendReminder,
      sendReminders,
      addClient,
      removeClient,
      saveWeeklyStats,
    }),
    [
      loading,
      error,
      weeks,
      checks,
      nudged,
      toggleCheck,
      sendReminder,
      sendReminders,
      addClient,
      removeClient,
      saveWeeklyStats,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
