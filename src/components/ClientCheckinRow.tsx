import { color } from '../lib/tokens'
import type { DerivedClient } from '../lib/derive'
import type { Retention } from '../lib/types'
import { CheckinChip } from './primitives'

const RETENTION_META: Record<Retention, { label: string; bg: string; fg: string }> = {
  active: { label: 'Active', bg: color.borderSoft, fg: color.muted },
  at_risk: { label: 'At risk', bg: color.amberTintBg, fg: color.amber },
  lost: { label: 'Lost', bg: color.redTintBg, fg: color.red },
}

const nextRetention: Record<Retention, Retention> = {
  active: 'at_risk',
  at_risk: 'lost',
  lost: 'active',
}

export function ClientCheckinRow({
  client,
  onToggle,
  onRemove,
  onSetWin,
  onSetRetention,
  bg = '#fff',
  showWin = false,
  compact = false,
}: {
  client: DerivedClient
  onToggle: (field: 'water' | 'weekly', next: boolean) => void
  /** When provided, shows a small remove (×) control for this client. */
  onRemove?: () => void
  /** When provided, shows a control to add/edit this client's win. */
  onSetWin?: () => void
  /** When provided, the retention chip cycles active → at-risk → lost on tap. */
  onSetRetention?: (next: Retention) => void
  bg?: string
  showWin?: boolean
  compact?: boolean
}) {
  const ret = RETENTION_META[client.retention]
  const cs = compact ? 10.5 : 11.5
  const cp = compact ? '2px 7px' : '3px 9px'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 7 : 8,
        background: bg,
        border: `1px solid ${color.borderSoft}`,
        borderRadius: compact ? 9 : 10,
        padding: compact ? '7px 10px' : '9px 12px',
      }}
    >
      {/* name + retention status + remove */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ flex: 1, fontWeight: 500, fontSize: compact ? 12.5 : 13.5 }}>
          {client.name}
        </span>
        {onSetRetention ? (
          <button
            onClick={() => onSetRetention(nextRetention[client.retention])}
            title="Tap to change: Active → At risk → Lost"
            style={{
              border: 'none',
              background: ret.bg,
              color: ret.fg,
              borderRadius: 20,
              fontSize: cs,
              fontWeight: 600,
              cursor: 'pointer',
              padding: cp,
              flex: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {ret.label}
          </button>
        ) : (
          client.retention !== 'active' && (
            <span
              style={{
                background: ret.bg,
                color: ret.fg,
                borderRadius: 20,
                fontSize: cs,
                fontWeight: 600,
                padding: cp,
                flex: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {ret.label}
            </span>
          )
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            title={`Remove ${client.name}`}
            aria-label={`Remove ${client.name}`}
            style={{
              border: 'none',
              background: 'transparent',
              color: color.faint,
              cursor: 'pointer',
              fontSize: 16,
              lineHeight: 1,
              padding: '0 2px',
              flex: 'none',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* check-in chips + win */}
      <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 6 : 8, flexWrap: 'wrap' }}>
        <CheckinChip
          done={client.water}
          doneText="💧 Hydrated"
          pendingText="💧 No log"
          title="Toggle daily hydration log"
          onToggle={() => onToggle('water', !client.water)}
          fontSize={cs}
          padding={cp}
        />
        <CheckinChip
          done={client.weekly}
          doneText="⚖ Weigh-in"
          pendingText="⚖ Due"
          title="Toggle weekly weigh-in"
          onToggle={() => onToggle('weekly', !client.weekly)}
          fontSize={cs}
          padding={cp}
        />
        {showWin && client.win && !onSetWin && (
          <span
            style={{
              padding: cp,
              borderRadius: 20,
              fontSize: cs,
              fontWeight: 600,
              background: color.greenTintBg,
              color: color.green,
            }}
          >
            🏆 {client.win}
          </span>
        )}
        {onSetWin && (
          <button
            onClick={onSetWin}
            title={client.win ? `Edit win: ${client.win}` : `Log a win for ${client.name}`}
            style={{
              border: 'none',
              background: client.win ? color.greenTintBg : 'transparent',
              color: client.win ? color.green : color.faint,
              borderRadius: 20,
              fontSize: cs,
              fontWeight: 600,
              cursor: 'pointer',
              padding: client.win ? cp : '3px 6px',
              flex: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {client.win ? `🏆 ${client.win}` : '🏆 Add win'}
          </button>
        )}
      </div>
    </div>
  )
}
