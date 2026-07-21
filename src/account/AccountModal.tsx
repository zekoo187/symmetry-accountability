import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { color, font, shadow } from '../lib/tokens'
import { useAuth } from '../auth/AuthContext'

interface AccountCtx {
  /** Open the change-password dialog. No-op in demo mode. */
  openChangePassword: () => void
  /** Whether the change-password affordance should be shown at all. */
  available: boolean
}

const Ctx = createContext<AccountCtx | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
  const { configured } = useAuth()
  const [open, setOpen] = useState(false)

  const value = useMemo<AccountCtx>(
    () => ({ openChangePassword: () => setOpen(true), available: configured }),
    [configured],
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      {open && <ChangePasswordDialog onClose={() => setOpen(false)} />}
    </Ctx.Provider>
  )
}

export function useAccount(): AccountCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAccount must be used within an AccountProvider')
  return ctx
}

/** A compact "Change password" text button. Renders nothing in demo mode. */
export function ChangePasswordLink({ style }: { style?: React.CSSProperties }) {
  const { openChangePassword, available } = useAccount()
  if (!available) return null
  return (
    <button
      onClick={openChangePassword}
      style={{
        border: 'none',
        background: 'transparent',
        color: color.muted,
        cursor: 'pointer',
        fontSize: 12.5,
        fontWeight: 600,
        padding: 0,
        fontFamily: font.body,
        ...style,
      }}
    >
      Change password
    </button>
  )
}

function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const { user, changePassword } = useAuth()
  const [pw, setPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 9,
    border: `1px solid ${color.border}`,
    fontSize: 14,
    fontFamily: font.body,
    marginBottom: 10,
    background: '#fff',
  } as const

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    if (pw.length < 6) {
      setErr('Use at least 6 characters.')
      return
    }
    if (pw !== confirm) {
      setErr('The two passwords don’t match.')
      return
    }
    setBusy(true)
    const msg = await changePassword(pw)
    setBusy(false)
    if (msg) setErr(msg)
    else setDone(true)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(35,32,28,.42)',
        zIndex: 90,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          maxWidth: '100%',
          background: '#fff',
          borderRadius: 16,
          boxShadow: shadow.card,
          padding: '22px 22px 20px',
          fontFamily: font.body,
          color: color.ink,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <div className="sg" style={{ fontWeight: 700, fontSize: 18 }}>
            Change password
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 'none',
              background: color.divider,
              width: 28,
              height: 28,
              borderRadius: 8,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: color.muted, marginBottom: 16 }}>
          {user?.email}
        </div>

        {done ? (
          <>
            <div
              style={{
                background: color.greenTintBg,
                border: `1px solid ${color.greenTintBorder}`,
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 13.5,
                color: color.greenDark,
                lineHeight: 1.5,
              }}
            >
              ✓ Password updated. Use your new password next time you sign in.
            </div>
            <button
              onClick={onClose}
              style={{
                marginTop: 14,
                width: '100%',
                padding: '11px 16px',
                borderRadius: 9,
                border: 'none',
                background: color.ink,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <input
              style={inputStyle}
              type="password"
              placeholder="New password"
              value={pw}
              autoComplete="new-password"
              onChange={(e) => setPw(e.target.value)}
            />
            <input
              style={inputStyle}
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
            />
            {err && (
              <div style={{ color: color.red, fontSize: 12.5, marginBottom: 10 }}>{err}</div>
            )}
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
              {busy ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
