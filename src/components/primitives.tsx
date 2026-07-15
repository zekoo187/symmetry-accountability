import type { CSSProperties, ReactNode } from 'react'
import { color, font } from '../lib/tokens'

export function Avatar({
  initials,
  bg,
  size = 34,
  fontSize,
}: {
  initials: string
  bg: string
  size?: number
  fontSize?: number
}) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: fontSize ?? Math.round(size * 0.35),
        flex: 'none',
      }}
    >
      {initials}
    </span>
  )
}

export function StatusPill({
  label,
  bg,
  fg,
  fontSize = 12,
}: {
  label: string
  bg: string
  fg: string
  fontSize?: number
}) {
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: 20,
        fontSize,
        fontWeight: 600,
        background: bg,
        color: fg,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  )
}

/** 46×18 sparkline matching the roster row trend line. */
export function Sparkline({ points, stroke }: { points: string; stroke: string }) {
  return (
    <svg width="46" height="18" viewBox="0 0 46 18" aria-hidden>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} />
    </svg>
  )
}

/** A togglable check-in chip (hydration or weigh-in). */
export function CheckinChip({
  done,
  doneText,
  pendingText,
  onToggle,
  title,
  fontSize = 11.5,
  padding = '3px 9px',
}: {
  done: boolean
  doneText: string
  pendingText: string
  onToggle: () => void
  title?: string
  fontSize?: number
  padding?: string
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      title={title}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      style={{
        padding,
        borderRadius: 20,
        fontSize,
        fontWeight: 600,
        cursor: 'pointer',
        userSelect: 'none',
        background: done ? color.greenTintBg : color.pendingBg,
        color: done ? color.green : color.pendingFg,
      }}
    >
      {done ? doneText : pendingText}
    </span>
  )
}

export function SectionLabel({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        color: color.faint,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Meter bar used in stat drawer + mobile cards. */
export function Meter({
  pct,
  barColor,
  track = color.borderSoft,
  height = 6,
}: {
  pct: number
  barColor: string
  track?: string
  height?: number
}) {
  return (
    <div style={{ height, background: track, borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: barColor }} />
    </div>
  )
}

export const displayFont = font.display
