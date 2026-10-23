import { useCallback, useEffect, useState } from 'react'
import { color, font } from '../lib/tokens'
import type { CurrentUser } from '../lib/types'
import { SectionLabel } from '../components/primitives'
import { cardsApi, daysBefore, todayISO, type ClientRef } from './cardsApi'
import { SessionCardForm } from './SessionCardForm'
import { sessionPatterns } from './parse'
import { GRADES, type SessionCard } from './types'

/** The coach's side: a button to log a session and the last 14 days of cards. */
export function TrainerCards({ user, trainerId }: { user: CurrentUser; trainerId: string }) {
  const [clients, setClients] = useState<ClientRef[]>([])
  const [cards, setCards] = useState<SessionCard[]>([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SessionCard | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      const today = todayISO()
      const [cl, cs] = await Promise.all([
        cardsApi.listClients(user),
        cardsApi.listCards(user, daysBefore(today, 14), today),
      ])
      setClients(cl)
      setCards(cs.filter((c) => c.trainerId === trainerId))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load session cards')
    }
  }, [user, trainerId])

  useEffect(() => {
    void reload()
  }, [reload])

  const today = todayISO()
  const todayCount = cards.filter((c) => c.sessionDate === today).length

  return (
    <div style={{ padding: '18px 18px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionLabel>Session cards</SectionLabel>
        <span style={{ fontSize: 12, color: color.muted, fontWeight: 600 }}>
          {todayCount} today · {cards.length} in 14 days
        </span>
      </div>

      <button
        type="button"
        onClick={() => {
          setEditing(null)
          setOpen(true)
        }}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: 10,
          border: 'none',
          background: color.owner,
          color: '#fff',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: font.body,
        }}
      >
        + Log a session
      </button>
      <div style={{ fontSize: 11.5, color: color.muted, marginTop: 6 }}>
        Fill it from the paper card before you leave. Two minutes.
      </div>

      {error && <div style={{ color: color.red, fontSize: 12.5, marginTop: 8 }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {cards.map((c) => (
          <CardRow
            key={c.id}
            card={c}
            onEdit={() => {
              setEditing(c)
              setOpen(true)
            }}
          />
        ))}
        {cards.length === 0 && !error && (
          <div style={{ fontSize: 12.5, color: color.muted }}>No cards in the last 14 days.</div>
        )}
      </div>

      {open && (
        <SessionCardForm
          user={user}
          clients={clients}
          trainerId={trainerId}
          existing={editing}
          onSaved={() => {
            setOpen(false)
            setEditing(null)
            void reload()
          }}
          onClose={() => {
            setOpen(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

export function gradeStyle(grade: SessionCard['grade']): { label: string; bg: string; fg: string } {
  switch (grade) {
    case 'low':
      return { label: 'Low', bg: color.redTintBg, fg: color.red }
    case 'medium':
      return { label: 'Medium', bg: color.amberTintBg, fg: color.amber }
    case 'high':
      return { label: 'High', bg: color.greenTintBg, fg: color.green }
    case 'mastered':
      return { label: GRADES[3].label, bg: color.greenTintBg, fg: color.greenDark }
    default:
      return { label: '—', bg: color.pendingBg, fg: color.pendingFg }
  }
}

export function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function CardRow({ card, onEdit }: { card: SessionCard; onEdit: () => void }) {
  const g = gradeStyle(card.grade)
  const missed = card.outcome !== 'completed'
  return (
    <button
      type="button"
      onClick={onEdit}
      style={{
        textAlign: 'left',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 10,
        border: `1px solid ${color.borderSoft}`,
        background: missed ? color.rowBehindBg : '#fff',
        cursor: 'pointer',
        fontFamily: font.body,
        width: '100%',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: color.ink }}>
          {card.clientName || 'Client'}{' '}
          <span style={{ color: color.muted, fontWeight: 400 }}>· {shortDate(card.sessionDate)}</span>
        </div>
        <div style={{ fontSize: 12, color: color.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {missed ? (card.outcome === 'no_show' ? 'No-show' : 'Cancelled') : sessionPatterns(card.exercises)}
          {card.win ? ` · ${card.win}` : ''}
        </div>
      </div>
      {!missed && (
        <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11.5, fontWeight: 600, background: g.bg, color: g.fg }}>
          {g.label}
        </span>
      )}
      {card.nextBooked === false && (
        <span title="Next session not booked" style={{ fontSize: 11, color: color.red, fontWeight: 700 }}>
          no next
        </span>
      )}
    </button>
  )
}
