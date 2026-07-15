import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { CurrentUser, Role } from '../lib/types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const MOCK_KEY = 'sf_mock_user'

interface AuthContextValue {
  ready: boolean
  user: CurrentUser | null
  configured: boolean
  /** Supabase email/password sign-in. Returns an error message or null. */
  signIn: (email: string, password: string) => Promise<string | null>
  /** Mock sign-in used when Supabase isn't configured. */
  mockSignIn: (user: CurrentUser) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadProfile(userId: string, email: string): Promise<CurrentUser | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('role, trainer_id, display_name')
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return {
    id: userId,
    email,
    role: data.role as Role,
    trainerId: (data.trainer_id as string | null) ?? null,
    displayName: (data.display_name as string | null) ?? email,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<CurrentUser | null>(null)

  // Bootstrap: restore an existing session (supabase) or mock user (localStorage).
  useEffect(() => {
    let cancelled = false
    async function boot() {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession()
        const session = data.session
        if (session?.user) {
          const profile = await loadProfile(session.user.id, session.user.email ?? '')
          if (!cancelled) setUser(profile)
        }
        supabase.auth.onAuthStateChange(async (_evt, sess) => {
          if (sess?.user) {
            const profile = await loadProfile(sess.user.id, sess.user.email ?? '')
            setUser(profile)
          } else {
            setUser(null)
          }
        })
      } else {
        try {
          const raw = localStorage.getItem(MOCK_KEY)
          if (raw && !cancelled) setUser(JSON.parse(raw) as CurrentUser)
        } catch {
          /* ignore */
        }
      }
      if (!cancelled) setReady(true)
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback<AuthContextValue['signIn']>(async (email, password) => {
    if (!supabase) return 'Supabase is not configured.'
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error.message
    if (data.user) {
      const profile = await loadProfile(data.user.id, data.user.email ?? '')
      if (!profile) return 'No profile found for this account. Ask the owner to invite you.'
      setUser(profile)
    }
    return null
  }, [])

  const mockSignIn = useCallback<AuthContextValue['mockSignIn']>((u) => {
    try {
      localStorage.setItem(MOCK_KEY, JSON.stringify(u))
    } catch {
      /* ignore */
    }
    setUser(u)
  }, [])

  const signOut = useCallback<AuthContextValue['signOut']>(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut()
    } else {
      try {
        localStorage.removeItem(MOCK_KEY)
      } catch {
        /* ignore */
      }
    }
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ ready, user, configured: isSupabaseConfigured, signIn, mockSignIn, signOut }),
    [ready, user, signIn, mockSignIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
