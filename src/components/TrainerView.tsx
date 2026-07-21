import { useEffect, useMemo, useState } from 'react'
import { color, font, shadow } from '../lib/tokens'
import type { CurrentUser } from '../lib/types'
import { colorForRate, deriveMember } from '../lib/derive'
import { useData } from '../data/DataContext'
import { useAuth } from '../auth/AuthContext'
import { Avatar, Meter, SectionLabel, StatusPill } from './primitives'
import { WeekStepper } from './WeekStepper'
import { ClientCheckinRow } from './ClientCheckinRow'
import { ChangePasswordLink } from '../account/AccountModal'

export function TrainerView({ user }: { user: CurrentUser }) {
  const { weeks, checks, toggleCheck, addClient, removeClient, saveWeeklyStats } = useData()
  const { signOut } = useAuth()
  const [weekIdx, setWeekIdx] = useState(0)
  const [newClient, setNewClient] = useState('')
  const [busy, setBusy] = useState(false)

  const week = weeks[weekIdx]
  const rawMember = week?.members.find((m) => m.id === user.trainerId) ?? week?.members[0]

  const m = useMemo(
    () => (rawMember ? deriveMember(rawMember, week.id, checks, true) : null),
    [rawMember, week, checks],
  )

  const canPrev = weekIdx < weeks.length - 1
  const canNext = weekIdx > 0

  // --- "report your week" form -------------------------------------------------
  const [form, setForm] = useState({
    sessions: '0',
    noShows: '0',
    cancels: '0',
    nextWeek: '0',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [savedTick, setSavedTick] = useState(false)

  // Reload the form whenever the selected week (or trainer) changes.
  useEffect(() => {
    if (!m) return
    setForm({
      sessions: String(m.sessions),
      noShows: String(m.noShows),
      cancels: String(m.cancels),
      nextWeek: String(m.nextWeek),
      note: m.note ?? '',
    })
    setSavedTick(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week?.id, m?.id])

  const num = (v: string) => {
    const n = parseInt(v, 10)
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const fSessions = num(form.sessions)
  const fNoShows = num(form.noShows)
  const fCancels = num(form.cancels)
  const fScheduled = fSessions + fNoShows + fCancels
  const fShowRate = fScheduled > 0 ? Math.round((fSessions / fScheduled) * 100) : 0

  if (!m) {
    return (
      <Shell onSignOut={signOut}>
        <div style={{ padding: 24, color: color.muted }}>No data for your account yet.</div>
      </Shell>
    )
  }

  return (
    <Shell onSignOut={signOut}>
      <div style={{ padding: '18px 18px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar initials={m.initials} bg={m.avatarBg} size={46} fontSize={15} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{m.name}</div>
            <div style={{ fontSize: 12.5, color: color.muted }}>{m.role} · your clients</div>
          </div>
          <StatusPill label={m.statusLabel} bg={m.statusBg} fg={m.statusFg} fontSize={12.5} />
        </div>

        <div style={{ marginTop: 14 }}>
          <WeekStepper
            shortLabel={week.short}
            canPrev={canPrev}
            canNext={canNext}
            onPrev={() => canPrev && setWeekIdx((i) => i + 1)}
            onNext={() => canNext && setWeekIdx((i) => i - 1)}
            full
          />
        </div>
      </div>

      <div style={{ padding: '10px 18px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Tile label="Sessions done" value={String(m.sessions)} />
          <Tile label="Show rate" value={m.showRatePct} valueColor={m.trendColor} />
          <Tile label="No-shows" value={String(m.noShows)} valueColor={m.noShowColor} />
          <Tile label="Booked next wk" value={String(m.nextWeek)} valueColor={color.green} />
        </div>
      </div>

      {/* report your week */}
      <div style={{ padding: '20px 18px 0' }}>
        <SectionLabel style={{ marginBottom: 10 }}>Report your week</SectionLabel>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (saving) return
            setSaving(true)
            await saveWeeklyStats(week.id, m.id, {
              sessions: fSessions,
              noShows: fNoShows,
              cancels: fCancels,
              nextWeek: num(form.nextWeek),
              note: form.note.trim(),
            })
            setSaving(false)
            setSavedTick(true)
          }}
          style={{
            border: `1px solid ${color.borderSoft}`,
            borderRadius: 12,
            padding: '14px 14px 16px',
            background: color.surfaceMuted,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <NumField
              label="Sessions delivered"
              value={form.sessions}
              onChange={(v) => {
                setForm((f) => ({ ...f, sessions: v }))
                setSavedTick(false)
              }}
            />
            <NumField
              label="Booked next week"
              value={form.nextWeek}
              onChange={(v) => {
                setForm((f) => ({ ...f, nextWeek: v }))
                setSavedTick(false)
              }}
            />
            <NumField
              label="No-shows"
              value={form.noShows}
              onChange={(v) => {
                setForm((f) => ({ ...f, noShows: v }))
                setSavedTick(false)
              }}
            />
            <NumField
              label="Cancellations"
              value={form.cancels}
              onChange={(v) => {
                setForm((f) => ({ ...f, cancels: v }))
                setSavedTick(false)
              }}
            />
          </div>

          {/* live preview of what these numbers produce */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 12,
              padding: '9px 11px',
              background: '#fff',
              border: `1px solid ${color.borderSoft}`,
              borderRadius: 9,
              fontSize: 12.5,
              color: color.text2,
            }}
          >
            <span>
              Scheduled <b style={{ color: color.ink }}>{fScheduled}</b>
            </span>
            <span>
              Show rate{' '}
              <b style={{ color: colorForRate(fShowRate) }}>{fScheduled > 0 ? `${fShowRate}%` : '—'}</b>
            </span>
          </div>

          <textarea
            value={form.note}
            onChange={(e) => {
              setForm((f) => ({ ...f, note: e.target.value }))
              setSavedTick(false)
            }}
            placeholder="Anything worth flagging this week? (optional)"
            rows={2}
            style={{
              width: '100%',
              marginTop: 10,
              padding: '9px 11px',
              borderRadius: 9,
              border: `1px solid ${color.border}`,
              fontSize: 13,
              fontFamily: font.body,
              resize: 'vertical',
              background: '#fff',
            }}
          />

          <button
            type="submit"
            disabled={saving}
            style={{
              marginTop: 10,
              width: '100%',
              padding: '11px 16px',
              borderRadius: 9,
              border: `1px solid ${savedTick ? color.greenTintBorder : color.ink}`,
              background: savedTick ? color.greenTintBg : color.ink,
              color: savedTick ? color.green : '#fff',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving…' : savedTick ? '✓ Week saved' : 'Save my week'}
          </button>
        </form>
      </div>

      <div style={{ padding: '18px 18px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          <SectionLabel>Client check-ins — {m.checkinText}</SectionLabel>
          <span style={{ fontSize: 12, color: color.muted, fontWeight: 600 }}>
            {Math.round(m.checkinRate * 100)}%
          </span>
        </div>
        <div style={{ marginBottom: 12 }}>
          <Meter pct={Math.round(m.checkinRate * 100)} barColor={m.checkinColor} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {m.clients.map((c) => (
            <ClientCheckinRow
              key={c.name}
              client={c}
              bg="#fff"
              showWin
              onToggle={(field, next) => toggleCheck(week.id, m.id, c.name, field, next)}
              onRemove={() => {
                if (confirm(`Remove ${c.name} from your client list?`)) {
                  void removeClient(m.id, c.name)
                }
              }}
            />
          ))}
          {m.clients.length === 0 && (
            <div
              style={{
                border: `1px dashed ${color.border}`,
                borderRadius: 10,
                padding: '16px 14px',
                fontSize: 13,
                color: color.muted,
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              No clients yet — add your first one below.
            </div>
          )}
        </div>

        {/* add a client */}
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            const name = newClient.trim()
            if (!name || busy) return
            setBusy(true)
            await addClient(m.id, name)
            setNewClient('')
            setBusy(false)
          }}
          style={{ display: 'flex', gap: 8, marginTop: 10 }}
        >
          <input
            value={newClient}
            onChange={(e) => setNewClient(e.target.value)}
            placeholder="Add a client's name…"
            style={{
              flex: 1,
              padding: '10px 12px',
              borderRadius: 10,
              border: `1px solid ${color.border}`,
              fontSize: 13.5,
              fontFamily: font.body,
              background: '#fff',
            }}
          />
          <button
            type="submit"
            disabled={!newClient.trim() || busy}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: 'none',
              background: newClient.trim() && !busy ? color.ink : color.borderSoft,
              color: newClient.trim() && !busy ? '#fff' : color.faint,
              fontSize: 13.5,
              fontWeight: 600,
              cursor: newClient.trim() && !busy ? 'pointer' : 'default',
              whiteSpace: 'nowrap',
            }}
          >
            {busy ? 'Adding…' : 'Add'}
          </button>
        </form>
      </div>

      <div style={{ padding: '16px 18px 24px' }}>
        <div
          style={{
            background: color.greenTintBg,
            border: `1px solid ${color.greenTintBorder}`,
            borderRadius: 11,
            padding: '11px 14px',
            fontSize: 12.5,
            lineHeight: 1.5,
            color: color.greenDark,
          }}
        >
          Tapping a client’s hydration or weigh-in updates the owner’s dashboard live. Keep these
          current so the studio sees your week accurately.
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children, onSignOut }: { children: React.ReactNode; onSignOut: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: color.appBg,
        fontFamily: font.body,
        color: color.ink,
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          minHeight: '100vh',
          background: '#fff',
          boxShadow: shadow.card,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: color.surfaceMuted,
            borderBottom: `1px solid ${color.borderSoft}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span
              className="sg"
              style={{
                width: 28,
                height: 28,
                borderRadius: 9,
                background: color.ink,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              SF
            </span>
            <span className="sg" style={{ fontWeight: 700, fontSize: 15 }}>
              Symmetry Fitness
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ChangePasswordLink />
            <button
              onClick={onSignOut}
              style={{
                border: 'none',
                background: 'transparent',
                color: color.muted,
                cursor: 'pointer',
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              Sign out
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11.5, color: color.muted, marginBottom: 4 }}>
        {label}
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '9px 11px',
          borderRadius: 9,
          border: `1px solid ${color.border}`,
          fontSize: 15,
          fontFamily: font.display,
          fontWeight: 700,
          background: '#fff',
        }}
      />
    </label>
  )
}

function Tile({
  label,
  value,
  valueColor = color.ink,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div
      style={{ border: `1px solid ${color.borderSoft}`, borderRadius: 11, padding: '12px 14px' }}
    >
      <div style={{ fontSize: 11.5, color: color.muted, marginBottom: 4 }}>{label}</div>
      <div className="sg" style={{ fontWeight: 700, fontSize: 20, color: valueColor }}>
        {value}
      </div>
    </div>
  )
}
