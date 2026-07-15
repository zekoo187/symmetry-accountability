import { color, font, shadow, winsGradient } from '../lib/tokens'
import type { Week } from '../lib/types'
import type { DerivedMember, WeekTotals } from '../lib/derive'
import type { DrawerState } from './DetailDrawer'
import { Avatar, Sparkline, StatusPill } from './primitives'
import { WeekStepper } from './WeekStepper'

const NAV_ITEMS = ['Overview', 'Trainers', 'Check-ins', 'Sessions', 'Wins'] as const

export function DesktopDashboard(props: {
  week: Week
  members: DerivedMember[]
  totals: WeekTotals
  activeNav: string
  ownerName: string
  canPrev: boolean
  canNext: boolean
  nudgeAllLabel: string
  onPrevWeek: () => void
  onNextWeek: () => void
  onNav: (label: string) => void
  onOpenDrawer: (d: DrawerState) => void
  onNudgeAll: () => void
  onSignOut: () => void
}) {
  const {
    week,
    members,
    totals,
    activeNav,
    ownerName,
    canPrev,
    canNext,
    nudgeAllLabel,
    onPrevWeek,
    onNextWeek,
    onNav,
    onOpenDrawer,
    onNudgeAll,
    onSignOut,
  } = props

  return (
    <div style={{ minHeight: '100vh', background: color.appBg, padding: '26px 20px 60px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div
          style={{
            background: '#fff',
            border: `1px solid ${color.border}`,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: shadow.card,
          }}
        >
          <div style={{ display: 'flex' }}>
            {/* sidebar */}
            <div
              style={{
                width: 210,
                flex: 'none',
                background: color.surfaceMuted,
                borderRight: `1px solid ${color.borderSoft}`,
                padding: '22px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 26,
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
                <span className="sg" style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.1 }}>
                  Symmetry
                  <br />
                  Fitness
                </span>
              </div>

              <nav
                style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 14 }}
              >
                {NAV_ITEMS.map((label) => {
                  const on = activeNav === label
                  return (
                    <span
                      key={label}
                      onClick={() => onNav(label)}
                      style={{
                        padding: '9px 11px',
                        borderRadius: 9,
                        cursor: 'pointer',
                        background: on ? color.ink : 'transparent',
                        color: on ? '#fff' : color.text3,
                        fontWeight: on ? 600 : 400,
                      }}
                    >
                      {label}
                    </span>
                  )
                })}
              </nav>

              <div
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  fontSize: 13,
                  color: color.text3,
                }}
              >
                <Avatar initials="SF" bg={color.owner} size={28} fontSize={12} />
                {ownerName}
                <span style={{ fontSize: 11, color: color.faint }}>· owner</span>
                <button
                  onClick={onSignOut}
                  title="Sign out"
                  style={{
                    marginLeft: 'auto',
                    border: 'none',
                    background: 'transparent',
                    color: color.faint,
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ⎋
                </button>
              </div>
            </div>

            {/* main */}
            <div style={{ flex: 1, padding: '24px 28px 30px', fontFamily: font.body }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  marginBottom: 22,
                }}
              >
                <div>
                  <h1
                    className="sg"
                    style={{ fontWeight: 700, fontSize: 26, margin: '0 0 3px' }}
                  >
                    Symmetry Fitness
                  </h1>
                  <span style={{ fontSize: 13, color: color.muted }}>
                    {week.label} · {members.length} trainers
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <WeekStepper
                    shortLabel={week.short}
                    canPrev={canPrev}
                    canNext={canNext}
                    onPrev={onPrevWeek}
                    onNext={onNextWeek}
                  />
                  <button
                    onClick={onNudgeAll}
                    style={{
                      padding: '8px 14px',
                      background: color.ink,
                      color: '#fff',
                      border: 'none',
                      borderRadius: 9,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {nudgeAllLabel}
                  </button>
                </div>
              </div>

              {/* wins hero */}
              <div
                style={{
                  background: winsGradient,
                  borderRadius: 15,
                  padding: '20px 22px',
                  color: '#fff',
                  marginBottom: 22,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                    opacity: 0.85,
                    marginBottom: 14,
                  }}
                >
                  🏆 Small wins this week
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 14,
                  }}
                >
                  {week.wins.map((w, i) => (
                    <div
                      key={i}
                      onClick={() => onOpenDrawer({ kind: 'win', id: i })}
                      style={{
                        background: 'rgba(255,255,255,.10)',
                        border: '1px solid rgba(255,255,255,.18)',
                        borderRadius: 12,
                        padding: 14,
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        className="sg"
                        style={{ fontWeight: 700, fontSize: 22, marginBottom: 4 }}
                      >
                        {w.stat}
                      </div>
                      <div style={{ fontSize: 13, lineHeight: 1.4, opacity: 0.92 }}>{w.text}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* stat strip */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4,1fr)',
                  gap: 14,
                  marginBottom: 22,
                }}
              >
                <StatCard
                  label="Sessions delivered"
                  value={String(totals.sessions)}
                  onClick={() => onOpenDrawer({ kind: 'stat', id: 'sessions' })}
                />
                <StatCard
                  label="Team show rate"
                  value={`${totals.showRate}%`}
                  suffix={<span style={{ fontSize: 14, color: color.green }}> ▲</span>}
                  onClick={() => onOpenDrawer({ kind: 'stat', id: 'showrate' })}
                />
                <StatCard
                  label="No-shows / cancels"
                  value={String(totals.noShows)}
                  valueColor={color.amber}
                  onClick={() => onOpenDrawer({ kind: 'stat', id: 'noshows' })}
                />
                <StatCard
                  label="Need attention"
                  value={String(totals.flagged)}
                  valueColor={color.red}
                  onClick={() => onOpenDrawer({ kind: 'stat', id: 'flagged' })}
                />
              </div>

              {/* roster */}
              <div
                style={{
                  border: `1px solid ${color.borderSoft}`,
                  borderRadius: 13,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.7fr .7fr 1.2fr 1fr .9fr',
                    gap: 12,
                    padding: '11px 18px',
                    background: color.surfaceMuted,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '.05em',
                    textTransform: 'uppercase',
                    color: color.faint,
                  }}
                >
                  <span>Trainer</span>
                  <span>Sessions</span>
                  <span>Attendance</span>
                  <span>Client check-ins</span>
                  <span>Status</span>
                </div>
                {members.map((m) => (
                  <div key={m.id} style={{ borderTop: `1px solid ${color.divider}` }}>
                    <div
                      onClick={() => onOpenDrawer({ kind: 'trainer', id: m.id })}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.7fr .7fr 1.2fr 1fr .9fr',
                        gap: 12,
                        padding: '14px 18px',
                        alignItems: 'center',
                        fontSize: 14,
                        cursor: 'pointer',
                        background: m.rowBg,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <Avatar initials={m.initials} bg={m.avatarBg} size={34} fontSize={12} />
                        <span style={{ color: color.faint, fontSize: 11, width: 9 }}>▸</span>
                        <span>
                          <span style={{ display: 'block', fontWeight: 500 }}>{m.name}</span>
                          <span
                            style={{ display: 'block', fontSize: 11.5, color: color.faint }}
                          >
                            {m.role}
                          </span>
                        </span>
                      </div>
                      <div className="sg" style={{ fontWeight: 700, fontSize: 17 }}>
                        {m.sessions}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Sparkline points={m.points} stroke={m.trendColor} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: m.trendColor }}>
                          {m.showRatePct}
                        </span>
                        <span style={{ fontSize: 11.5, color: color.faint }}>{m.attendText}</span>
                      </div>
                      <div style={{ fontWeight: 600, color: m.checkinColor }}>
                        {m.checkinText}{' '}
                        <span style={{ fontWeight: 400, fontSize: 11.5, color: color.faint }}>
                          clients
                        </span>
                      </div>
                      <div>
                        <StatusPill label={m.statusLabel} bg={m.statusBg} fg={m.statusFg} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  valueColor = color.ink,
  suffix,
  onClick,
}: {
  label: string
  value: string
  valueColor?: string
  suffix?: React.ReactNode
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${color.borderSoft}`,
        borderRadius: 12,
        padding: '14px 16px',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: 12, color: color.muted, marginBottom: 5 }}>{label}</div>
      <div className="sg" style={{ fontWeight: 700, fontSize: 24, color: valueColor }}>
        {value}
        {suffix}
      </div>
    </div>
  )
}
