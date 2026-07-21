import { color, font, winsGradient } from '../lib/tokens'
import type { Week } from '../lib/types'
import type { DerivedMember, WeekTotals } from '../lib/derive'
import { Avatar, Meter, SectionLabel, StatusPill } from './primitives'
import { WeekStepper } from './WeekStepper'
import { ClientCheckinRow } from './ClientCheckinRow'
import { NudgeButton } from './NudgeButton'
import { ChangePasswordLink } from '../account/AccountModal'

export function MobileDashboard(props: {
  week: Week
  members: DerivedMember[]
  totals: WeekTotals
  weekId: string
  expandedId: string | null
  nudged: Record<string, boolean>
  canPrev: boolean
  canNext: boolean
  onPrevWeek: () => void
  onNextWeek: () => void
  onToggleExpand: (id: string) => void
  onOpenWin: (i: number) => void
  onToggleCheck: (trainerId: string, clientName: string, field: 'water' | 'weekly', next: boolean) => void
  onNudge: (trainerId: string) => void
  onSignOut: () => void
}) {
  const {
    week,
    members,
    totals,
    weekId,
    expandedId,
    nudged,
    canPrev,
    canNext,
    onPrevWeek,
    onNextWeek,
    onToggleExpand,
    onOpenWin,
    onToggleCheck,
    onNudge,
    onSignOut,
  } = props



  return (
    <div style={{ minHeight: '100vh', background: color.appBg, fontFamily: font.body }}>
      <div style={{ maxWidth: 460, margin: '0 auto', background: '#fff', minHeight: '100vh' }}>
        {/* header */}
        <div
          style={{
            padding: '16px 18px 12px',
            background: color.surfaceMuted,
            borderBottom: `1px solid ${color.borderSoft}`,
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div>
              <div className="sg" style={{ fontWeight: 700, fontSize: 18 }}>
                Symmetry Fitness
              </div>
              <div style={{ fontSize: 12, color: color.muted }}>{members.length} trainers</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <button
                onClick={onSignOut}
                aria-label="Sign out"
                style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer' }}
              >
                <Avatar initials="SF" bg={color.owner} size={34} fontSize={12} />
              </button>
              <ChangePasswordLink style={{ fontSize: 11 }} />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <WeekStepper
              shortLabel={week.short}
              canPrev={canPrev}
              canNext={canNext}
              onPrev={onPrevWeek}
              onNext={onNextWeek}
              full
            />
          </div>
        </div>

        {/* wins */}
        <div
          style={{
            margin: '14px 14px 0',
            background: winsGradient,
            borderRadius: 14,
            padding: '15px 16px',
            color: '#fff',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '.07em',
              textTransform: 'uppercase',
              opacity: 0.85,
              marginBottom: 11,
            }}
          >
            🏆 Small wins this week
          </div>
          {week.wins.length === 0 && (
            <div style={{ fontSize: 12.5, lineHeight: 1.45, opacity: 0.85 }}>
              Nothing logged yet this week.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {week.wins.map((w, i) => (
              <div
                key={i}
                onClick={() => onOpenWin(i)}
                style={{
                  display: 'flex',
                  gap: 11,
                  alignItems: 'baseline',
                  cursor: 'pointer',
                }}
              >
                <span
                  className="sg"
                  style={{ fontWeight: 700, fontSize: 16, minWidth: 46 }}
                >
                  {w.stat}
                </span>
                <span style={{ fontSize: 13, lineHeight: 1.35, opacity: 0.93 }}>{w.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* stat chips */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 14px 4px' }}>
          <StatChip label="Sessions" value={String(totals.sessions)} />
          <StatChip label="Show rate" value={`${totals.showRate}%`} />
          <StatChip label="No-shows" value={String(totals.noShows)} valueColor={color.amber} />
        </div>

        {/* trainer cards */}
        <div
          style={{
            padding: '8px 14px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          {members.map((m) => {
            const expanded = expandedId === m.id
            const isNudged = !!nudged[`${weekId}:${m.id}`]
            return (
              <div
                key={m.id}
                style={{
                  border: `1px solid ${m.cardBorder}`,
                  borderRadius: 13,
                  overflow: 'hidden',
                  background: '#fff',
                }}
              >
                <div
                  onClick={() => onToggleExpand(m.id)}
                  style={{ padding: '13px 14px', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar initials={m.initials} bg={m.avatarBg} size={34} fontSize={12} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{m.name}</div>
                      <div style={{ fontSize: 11.5, color: color.muted }}>{m.role}</div>
                    </div>
                    <StatusPill label={m.statusLabel} bg={m.statusBg} fg={m.statusFg} fontSize={11} />
                  </div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
                    <div>
                      <span className="sg" style={{ fontWeight: 700, fontSize: 16 }}>
                        {m.sessions}
                      </span>
                      <span style={{ fontSize: 11, color: color.muted }}> sessions</span>
                    </div>
                    <div>
                      <span
                        className="sg"
                        style={{ fontWeight: 700, fontSize: 16, color: m.trendColor }}
                      >
                        {m.showRatePct}
                      </span>
                      <span style={{ fontSize: 11, color: color.muted }}> show</span>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 12, color: color.muted }}>
                      Check-ins {m.checkinText}
                    </div>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Meter pct={m.showRate} barColor={m.trendColor} />
                  </div>
                </div>

                {expanded && (
                  <div
                    style={{
                      padding: '2px 14px 14px',
                      borderTop: `1px solid ${color.divider}`,
                      background: color.surfaceMuted,
                    }}
                  >
                    <SectionLabel style={{ fontSize: 10.5, margin: '11px 0 8px' }}>
                      Client check-ins
                    </SectionLabel>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {m.clients.map((c) => (
                        <ClientCheckinRow
                          key={c.name}
                          client={c}
                          compact
                          onToggle={(field, next) => onToggleCheck(m.id, c.name, field, next)}
                        />
                      ))}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        color: color.text2,
                        marginTop: 11,
                        padding: '0 2px',
                      }}
                    >
                      <span>
                        No-shows <b style={{ color: m.noShowColor }}>{m.noShows}</b>
                      </span>
                      <span>
                        Cancels <b style={{ color: m.cancelColor }}>{m.cancels}</b>
                      </span>
                      <span>
                        Next wk <b style={{ color: color.green }}>{m.nextWeek}</b>
                      </span>
                    </div>
                    {m.flagged && (
                      <NudgeButton
                        firstName={m.name.split(' ')[0]}
                        nudged={isNudged}
                        onNudge={() => onNudge(m.id)}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatChip({
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
      style={{
        flex: 1,
        border: `1px solid ${color.borderSoft}`,
        borderRadius: 11,
        padding: '10px 11px',
      }}
    >
      <div style={{ fontSize: 10.5, color: color.muted }}>{label}</div>
      <div className="sg" style={{ fontWeight: 700, fontSize: 17, color: valueColor }}>
        {value}
      </div>
    </div>
  )
}
