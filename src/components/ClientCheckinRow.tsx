import { color } from '../lib/tokens'
import type { DerivedClient } from '../lib/derive'
import { CheckinChip } from './primitives'

export function ClientCheckinRow({
  client,
  onToggle,
  onRemove,
  onSetWin,
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
  bg?: string
  showWin?: boolean
  compact?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 7 : 10,
        fontSize: compact ? 12.5 : 13.5,
        background: bg,
        border: `1px solid ${color.borderSoft}`,
        borderRadius: compact ? 9 : 10,
        padding: compact ? '7px 10px' : '9px 12px',
      }}
    >
      <span style={{ flex: 1, fontWeight: 500 }}>{client.name}</span>
      <CheckinChip
        done={client.water}
        doneText="💧 Hydrated"
        pendingText="💧 No log"
        title="Toggle daily hydration log"
        onToggle={() => onToggle('water', !client.water)}
        fontSize={compact ? 10.5 : 11.5}
        padding={compact ? '2px 7px' : '3px 9px'}
      />
      <CheckinChip
        done={client.weekly}
        doneText="⚖ Weigh-in"
        pendingText="⚖ Due"
        title="Toggle weekly weigh-in"
        onToggle={() => onToggle('weekly', !client.weekly)}
        fontSize={compact ? 10.5 : 11.5}
        padding={compact ? '2px 7px' : '3px 9px'}
      />
      {showWin && client.win && !onSetWin && (
        <span
          style={{
            padding: '3px 9px',
            borderRadius: 20,
            fontSize: 11.5,
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
            fontSize: 11.5,
            fontWeight: 600,
            cursor: 'pointer',
            padding: client.win ? '3px 9px' : '3px 6px',
            flex: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {client.win ? `🏆 ${client.win}` : '🏆 +'}
        </button>
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
            fontSize: 15,
            lineHeight: 1,
            padding: '2px 4px',
            flex: 'none',
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
