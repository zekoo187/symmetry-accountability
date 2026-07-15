import { useState } from 'react'
import { color, font, shadow } from '../lib/tokens'
import type { CurrentUser } from '../lib/types'
import { ROSTER } from '../data/seed'
import { Avatar } from '../components/primitives'
import { useAuth } from './AuthContext'

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
      <span
        className="sg"
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: color.ink,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        SF
      </span>
      <span className="sg" style={{ fontWeight: 700, fontSize: 20 }}>
        Symmetry Fitness
      </span>
    </div>
  )
}

export function LoginScreen() {
  const { configured, signIn, mockSignIn } = useAuth()

  return (
    <div
      style={{
        minHeight: '100vh',
        background: color.appBg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: font.body,
      }}
    >
      <div
        style={{
          width: 400,
          maxWidth: '100%',
          background: '#fff',
          border: `1px solid ${color.border}`,
          borderRadius: 16,
          boxShadow: shadow.card,
          padding: '30px 28px 26px',
        }}
      >
        <Logo />
        <div
          style={{ textAlign: 'center', color: color.muted, fontSize: 13, margin: '10px 0 22px' }}
        >
          Trainer accountability dashboard
        </div>
        {configured ? <RealLogin signIn={signIn} /> : <MockLogin mockSignIn={mockSignIn} />}
      </div>
    </div>
  )
}

function RealLogin({ signIn }: { signIn: (e: string, p: string) => Promise<string | null> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 9,
    border: `1px solid ${color.border}`,
    fontSize: 14,
    fontFamily: font.body,
    marginBottom: 10,
  } as const

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setErr(null)
        const msg = await signIn(email.trim(), password)
        setBusy(false)
        if (msg) setErr(msg)
      }}
    >
      <input
        style={inputStyle}
        type="email"
        placeholder="Email"
        value={email}
        autoComplete="email"
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        style={inputStyle}
        type="password"
        placeholder="Password"
        value={password}
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
      />
      {err && <div style={{ color: color.red, fontSize: 12.5, marginBottom: 10 }}>{err}</div>}
      <button
        type="submit"
        disabled={busy}
        style={{
          width: '100%',
          padding: '11px 16px',
          borderRadius: 9,
          border: 'none',
          background: color.ink,
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}

function MockLogin({ mockSignIn }: { mockSignIn: (u: CurrentUser) => void }) {
  const owner: CurrentUser = {
    id: 'owner',
    email: 'studio@symmetry.fit',
    role: 'owner',
    trainerId: null,
    displayName: 'Studio',
  }

  const rowBtn = {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    width: '100%',
    textAlign: 'left' as const,
    padding: '10px 12px',
    borderRadius: 11,
    border: `1px solid ${color.borderSoft}`,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    marginBottom: 8,
  }

  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '.05em',
          textTransform: 'uppercase',
          color: color.faint,
          margin: '2px 0 10px',
        }}
      >
        Demo mode · pick a role
      </div>

      <button style={rowBtn} onClick={() => mockSignIn(owner)}>
        <Avatar initials="SF" bg={color.owner} size={34} />
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontWeight: 600 }}>Studio owner</span>
          <span style={{ display: 'block', fontSize: 11.5, color: color.faint }}>
            Sees all trainers
          </span>
        </span>
        <span style={{ color: color.faint }}>▸</span>
      </button>

      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '.05em',
          textTransform: 'uppercase',
          color: color.faint,
          margin: '14px 0 10px',
        }}
      >
        Or sign in as a trainer
      </div>
      {ROSTER.map((t) => (
        <button
          key={t.id}
          style={rowBtn}
          onClick={() =>
            mockSignIn({
              id: t.id,
              email: `${t.name.toLowerCase()}@symmetry.fit`,
              role: 'trainer',
              trainerId: t.id,
              displayName: t.name,
            })
          }
        >
          <Avatar initials={t.initials} bg={t.avatarBg} size={34} />
          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontWeight: 600 }}>{t.name}</span>
            <span style={{ display: 'block', fontSize: 11.5, color: color.faint }}>{t.role}</span>
          </span>
          <span style={{ color: color.faint }}>▸</span>
        </button>
      ))}
    </div>
  )
}
