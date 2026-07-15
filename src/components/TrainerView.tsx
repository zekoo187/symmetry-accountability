import { useMemo, useState } from 'react'
import { color, font, shadow } from '../lib/tokens'
import type { CurrentUser } from '../lib/types'
import { deriveMember } from '../lib/derive'
import { useData } from '../data/DataContext'
import { useAuth } from '../auth/AuthContext'
import { Avatar, Meter, SectionLabel, StatusPill } from './primitives'
import { WeekStepper } from './WeekStepper'
import { ClientCheckinRow } from './ClientCheckinRow'

export function TrainerView({ user }: { user: CurrentUser }) {
  const { weeks, checks, toggleCheck } = useData()
  const { signOut } = useAuth()
  const [weekIdx, setWeekIdx] = useState(0)

  const week = weeks[weekIdx]
  const rawMember = week?.members.find((m) => m.id === user.trainerId) ?? week?.members[0]

  const m = useMemo(
    () => (rawMember ? deriveMember(rawMember, weekIdx, checks, true) : null),
    [rawMember, weekIdx, checks],
  )

  const canPrev = weekIdx < weeks.length - 1
  const canNext = weekIdx > 0

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
              onToggle={(field, next) => toggleCheck(weekIdx, m.id, c.name, field, next)}
            />
          ))}
        </div>
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
        {children}
      </div>
    </div>
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
