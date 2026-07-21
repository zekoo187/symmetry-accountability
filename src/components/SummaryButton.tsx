import { useState } from 'react'
import { color, font, shadow } from '../lib/tokens'
import type { DerivedMember, WeekTotals } from '../lib/derive'
import type { Week } from '../lib/types'
import { buildWeeklySummary } from '../lib/summary'

/**
 * "Copy for chat" — turns the current week into paste-ready text for the group
 * chat. Copies to the clipboard on click and also shows the text in a dialog
 * (with a manual Copy fallback for browsers that block programmatic copy).
 */
export function SummaryButton({
  week,
  members,
  totals,
  compact = false,
}: {
  week: Week
  members: DerivedMember[]
  totals: WeekTotals
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const text = buildWeeklySummary(week, members, totals)

  async function openAndCopy() {
    setOpen(true)
    setCopied(false)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      /* clipboard blocked — the dialog lets them copy manually */
    }
  }

  return (
    <>
      <button
        onClick={openAndCopy}
        style={{
          border: `1px solid ${color.border}`,
          background: '#fff',
          color: color.ink,
          borderRadius: 9,
          padding: compact ? '8px 12px' : '8px 14px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: font.body,
          whiteSpace: 'nowrap',
        }}
      >
        📋 Copy for chat
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
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
              width: 420,
              maxWidth: '100%',
              background: '#fff',
              borderRadius: 16,
              boxShadow: shadow.card,
              padding: '20px 22px 18px',
              fontFamily: font.body,
              color: color.ink,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div className="sg" style={{ fontWeight: 700, fontSize: 18 }}>
                Weekly recap
              </div>
              <button
                onClick={() => setOpen(false)}
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

            <textarea
              readOnly
              value={text}
              onFocus={(e) => e.currentTarget.select()}
              rows={Math.min(16, text.split('\n').length + 1)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 10,
                border: `1px solid ${color.border}`,
                background: color.surfaceMuted,
                fontSize: 13,
                lineHeight: 1.5,
                fontFamily: font.body,
                color: color.ink,
                resize: 'vertical',
              }}
            />

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 12,
              }}
            >
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(text)
                    setCopied(true)
                  } catch {
                    setCopied(false)
                  }
                }}
                style={{
                  flex: 1,
                  padding: '11px 16px',
                  borderRadius: 9,
                  border: `1px solid ${copied ? color.greenTintBorder : color.ink}`,
                  background: copied ? color.greenTintBg : color.ink,
                  color: copied ? color.green : '#fff',
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ Copied' : 'Copy to clipboard'}
              </button>
            </div>
            <div style={{ fontSize: 12, color: color.muted, marginTop: 10, lineHeight: 1.5 }}>
              Paste it straight into your team chat. On iPhone you can also long-press the text
              above → Select All → Copy.
            </div>
          </div>
        </div>
      )}
    </>
  )
}
