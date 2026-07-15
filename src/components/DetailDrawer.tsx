import type { ReactNode } from 'react'
import { color, font, shadow, winsGradient } from '../lib/tokens'
import type { Week } from '../lib/types'
import {
  buildStatDrawer,
  type DerivedMember,
  type StatId,
  type WeekTotals,
} from '../lib/derive'
import { Avatar, Meter, SectionLabel, StatusPill } from './primitives'
import { ClientCheckinRow } from './ClientCheckinRow'
import { NudgeButton } from './NudgeButton'

export type DrawerState =
  | { kind: 'trainer'; id: string }
  | { kind: 'stat'; id: StatId }
  | { kind: 'win'; id: number }

export function DetailDrawer({
  drawer,
  week,
  weekIdx,
  members,
  totals,
  nudged,
  onClose,
  onToggleCheck,
  onNudge,
}: {
  drawer: DrawerState
  week: Week
  weekIdx: number
  members: DerivedMember[]
  totals: WeekTotals
  nudged: Record<string, boolean>
  onClose: () => void
  onToggleCheck: (
    trainerId: string,
    clientName: string,
    field: 'water' | 'weekly',
    next: boolean,
  ) => void
  onNudge: (trainerId: string) => void
}) {
  let title = ''
  let subtitle = ''
  let body: ReactNode = null

  if (drawer.kind === 'trainer') {
    const m = members.find((x) => x.id === drawer.id)
    if (m) {
      title = m.name
      subtitle = `${m.role} · ${week.short}`
      const isNudged = !!nudged[`${weekIdx}:${m.id}`]
      body = (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
            <Avatar initials={m.initials} bg={m.avatarBg} size={46} fontSize={15} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{m.name}</div>
              <div style={{ fontSize: 12.5, color: color.muted }}>{m.role}</div>
            </div>
            <StatusPill label={m.statusLabel} bg={m.statusBg} fg={m.statusFg} fontSize={12.5} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <Tile label="Sessions done" value={String(m.sessions)} />
            <Tile label="Show rate" value={m.showRatePct} valueColor={m.trendColor} />
            <Tile label="No-shows" value={String(m.noShows)} valueColor={m.noShowColor} />
            <Tile label="Booked next wk" value={String(m.nextWeek)} valueColor={color.green} />
          </div>

          <SectionLabel style={{ marginBottom: 10 }}>
            Client check-ins — {m.checkinText}
          </SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {m.clients.map((c) => (
              <ClientCheckinRow
                key={c.name}
                client={c}
                bg={color.surfaceMuted}
                onToggle={(field, next) => onToggleCheck(m.id, c.name, field, next)}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              background: color.surfaceMuted,
              border: `1px solid ${color.borderSoft}`,
              borderRadius: 11,
              padding: '12px 14px',
              fontSize: 13,
              lineHeight: 1.5,
              color: color.text2,
            }}
          >
            {m.note}
          </div>

          {m.flagged && (
            <NudgeButton
              firstName={m.name.split(' ')[0]}
              nudged={isNudged}
              onNudge={() => onNudge(m.id)}
              marginTop={14}
            />
          )}
        </>
      )
    }
  } else if (drawer.kind === 'stat') {
    const data = buildStatDrawer(drawer.id, members, totals)
    title = data.title
    subtitle =
      drawer.id === 'flagged'
        ? `${week.short} · ${totals.flagged} flagged`
        : `${week.short} · team breakdown`
    body = (
      <>
        <div
          className="sg"
          style={{
            fontWeight: 700,
            fontSize: 40,
            lineHeight: 1,
            marginBottom: 20,
            color: data.totalColor,
          }}
        >
          {data.total}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.rows.map((r) => (
            <div
              key={r.id}
              style={{
                border: `1px solid ${color.borderSoft}`,
                borderRadius: 11,
                padding: '11px 13px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar initials={r.initials} bg={r.avatarBg} size={30} fontSize={11} />
                <span style={{ flex: 1, fontWeight: 500, fontSize: 13.5 }}>{r.name}</span>
                {r.hasStatus && r.statusLabel && (
                  <StatusPill
                    label={r.statusLabel}
                    bg={r.statusBg as string}
                    fg={r.statusFg as string}
                    fontSize={11}
                  />
                )}
              </div>
              <div style={{ fontSize: 12, color: color.muted, margin: '7px 0 6px' }}>
                {r.valueText}
              </div>
              <Meter pct={r.barPct} barColor={r.barColor} />
            </div>
          ))}
        </div>
      </>
    )
  } else {
    const w = week.wins[drawer.id]
    if (w) {
      title = 'Small win'
      subtitle = week.short
      body = (
        <>
          <div
            style={{
              background: winsGradient,
              borderRadius: 15,
              padding: '26px 22px',
              color: '#fff',
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
              🏆 Win worth celebrating
            </div>
            <div
              className="sg"
              style={{ fontWeight: 700, fontSize: 44, lineHeight: 1, marginBottom: 12 }}
            >
              {w.stat}
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.5, opacity: 0.95 }}>{w.text}</div>
          </div>
          <div style={{ marginTop: 14, fontSize: 13, lineHeight: 1.5, color: color.muted }}>
            Share this with the team channel to keep the momentum going.
          </div>
        </>
      )
    }
  }

  return (
    <div
      className="sf-scrim"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(35,32,28,.42)',
        zIndex: 60,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        className="sf-panel sf-scroll"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 440,
          maxWidth: '92vw',
          height: '100%',
          background: '#fff',
          boxShadow: shadow.drawer,
          overflowY: 'auto',
          fontFamily: font.body,
          color: color.ink,
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            background: '#fff',
            borderBottom: `1px solid ${color.borderSoft}`,
            padding: '18px 22px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
            zIndex: 2,
          }}
        >
          <div>
            <div className="sg" style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.15 }}>
              {title}
            </div>
            <div style={{ fontSize: 13, color: color.muted, marginTop: 2 }}>{subtitle}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              border: 'none',
              background: color.divider,
              width: 30,
              height: 30,
              borderRadius: 8,
              fontSize: 14,
              cursor: 'pointer',
              flex: 'none',
            }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: '20px 22px 32px' }}>{body}</div>
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
      style={{
        border: `1px solid ${color.borderSoft}`,
        borderRadius: 11,
        padding: '12px 14px',
      }}
    >
      <div style={{ fontSize: 11.5, color: color.muted, marginBottom: 4 }}>{label}</div>
      <div className="sg" style={{ fontWeight: 700, fontSize: 20, color: valueColor }}>
        {value}
      </div>
    </div>
  )
}
