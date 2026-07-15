import { color } from './lib/tokens'
import { useAuth } from './auth/AuthContext'
import { LoginScreen } from './auth/LoginScreen'
import { DataProvider, useData } from './data/DataContext'
import { OwnerDashboard } from './components/OwnerDashboard'
import { TrainerView } from './components/TrainerView'
import type { CurrentUser } from './lib/types'

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: color.appBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color.muted,
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
      }}
    >
      {children}
    </div>
  )
}

function DemoBadge() {
  const { mode } = useData()
  if (mode !== 'mock') return null
  return (
    <div
      title="Running on local seed data. Add Supabase keys to .env to go live."
      style={{
        position: 'fixed',
        left: 12,
        bottom: 12,
        zIndex: 80,
        background: color.ink,
        color: '#fff',
        fontSize: 11,
        fontWeight: 600,
        padding: '5px 10px',
        borderRadius: 20,
        opacity: 0.85,
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
      }}
    >
      Demo data
    </div>
  )
}

function AuthedApp({ user }: { user: CurrentUser }) {
  const { loading, error } = useData()
  if (loading) return <Centered>Loading…</Centered>
  if (error)
    return (
      <Centered>
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <div style={{ color: color.red, fontWeight: 600, marginBottom: 6 }}>
            Couldn’t load data
          </div>
          <div style={{ fontSize: 13 }}>{error}</div>
        </div>
      </Centered>
    )
  return (
    <>
      {user.role === 'owner' ? <OwnerDashboard user={user} /> : <TrainerView user={user} />}
      <DemoBadge />
    </>
  )
}

export function App() {
  const { ready, user } = useAuth()
  if (!ready) return <Centered>Loading…</Centered>
  if (!user) return <LoginScreen />
  return (
    <DataProvider user={user}>
      <AuthedApp user={user} />
    </DataProvider>
  )
}
