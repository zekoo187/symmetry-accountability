import { color } from '../lib/tokens'

export function WeekStepper({
  shortLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
  full = false,
}: {
  shortLabel: string
  canPrev: boolean
  canNext: boolean
  onPrev: () => void
  onNext: () => void
  full?: boolean // stretch to fill (mobile)
}) {
  const arrow = (enabled: boolean) =>
    ({
      border: 'none',
      background: 'transparent',
      padding: '6px 9px',
      fontSize: 11,
      cursor: enabled ? 'pointer' : 'default',
      color: enabled ? color.ink : color.arrowDisabled,
    }) as const

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: full ? 'space-between' : undefined,
        gap: 2,
        border: `1px solid ${color.border}`,
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
        padding: full ? '2px 4px' : 0,
        width: full ? '100%' : undefined,
      }}
    >
      <button style={arrow(canPrev)} onClick={() => canPrev && onPrev()} aria-label="Previous week">
        ◀
      </button>
      <span
        style={{ padding: '0 6px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}
      >
        {shortLabel}
      </span>
      <button style={arrow(canNext)} onClick={() => canNext && onNext()} aria-label="Next week">
        ▶
      </button>
    </div>
  )
}
