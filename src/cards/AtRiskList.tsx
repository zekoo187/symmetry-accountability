import { useEffect, useMemo, useState } from 'react'
import { color, font, shadow } from '../lib/tokens'
import type { CurrentUser, Trainer } from '../lib/types'
import { cardsApi, daysBefore, todayISO, type ClientRef } from './cardsApi'
import { assessRoster, RISK_WINDOW_DAYS, type RiskLevel, type RiskRow } from './risk'
import type { SessionCard } from './types'
import { shortDate } from './TrainerCards'

/**
 * Who is drifting, worked out from the last 60 days of cards. Owners see
 * every coach's clients; a coach sees their own. Read-only: the point is to
 * see it before the client is gone, not after.
 */
export function AtRiskList({
  user,
  trainers,
  trainerId,
  onOpenClient,
  refreshKey,
}: {
  user: CurrentUser
  trainers: Trainer[]
  /** When set, only this coach's clients (the coach's own view). */
  trainerId?: string
  onOpenClient?: (c: ClientRef) => void
  /** Change to force a reload (e.g. after a card is saved). */
  refreshKey?: number | string
}) {
  const [cards, setCards] = useState<SessionCard[]>([])
  const [clients, setClients] = useState<ClientRef[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [showNoCards, setShowNoCards] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    const today = todayISO()
    Promise.all([cardsApi.listCards(user, daysBefore(today, RISK_WINDOW_DAYS), today), cardsApi.listClients(user)])
      .then(([cs, cl]) => {
        if (cancelled) return
        setCards(trainerId ? cs.filter((c) => c.trainerId === trainerId) : cs)
        setClients(trainerId ? cl.filter((c) => c.trainerId === trainerId) : cl)
        setError(null)
        setLoaded(true)
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load'))
    return () => {
      cancelled = true
    }
  }, [user, trainerId, refreshKey])

  const today = todayISO()
  const result = useMemo(() => assessRoster(clients, cards, today), [clients, cards, today])
  const high = result.atRisk.filter((r) => r.risk.level === 'high').length
  const watch = result.atRisk.length - high
  const checked = clients.length - result.lost.length

  const coachName = (id: string) => trainers.find((t) => t.id === id)?.name ?? id

  const copy = async () => {
    const lines = [
      `At risk · ${today}`,
      ...result.atRisk.map(
        (r) =>
          `${r.risk.level === 'high' ? '!!' : '!'} ${r.client.name}${trainerId ? '' : ` (${coachName(r.client.trainerId)})`} — ${r.risk.signals.map((s) => s.text).join(', ')}`,
      ),
    ]
    if (result.noCards.length) lines.push(`No card in ${RISK_WINDOW_DAYS} days: ${result.noCards.map((c) => c.name).join(', ')}`)
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable: nothing to do */
    }
  }

  if (error) return <div style={{ color: color.red, fontSize: 12.5 }}>{error}</div>
  if (!loaded) return null

  return (
    <div style={{ background: '#fff', border: `1px solid ${color.border}`, borderRadius: 14, boxShadow: shadow.card, overflow: 'hidden', marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${color.borderSoft}` }}>
        <div style={{ flex: 1 }}>
          <div className="sg" style={{ fontWeight: 700, fontSize: 15 }}>
            At risk
            {result.atRisk.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: high ? color.red : color.amber }}>
                {high > 0 ? `${high} urgent` : ''}
                {high > 0 && watch > 0 ? ' · ' : ''}
                {watch > 0 ? `${watch} to watch` : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: color.muted }}>
            {result.atRisk.length === 0
              ? `No one is drifting. ${checked} client${checked === 1 ? '' : 's'} checked against the last ${RISK_WINDOW_DAYS} days of cards.`
              : `Read off the last ${RISK_WINDOW_DAYS} days of cards: gaps, missed sessions, no next booked, pain, habits, grades.`}
          </div>
        </div>
        {!trainerId && result.atRisk.length > 0 && (
          <button type="button" onClick={() => void copy()} style={smallPill}>
            {copied ? 'Copied' : 'Copy for chat'}
          </button>
        )}
      </div>

      {result.atRisk.map((r) => (
        <Row key={r.client.id} row={r} coach={trainerId ? null : coachName(r.client.trainerId)} onOpen={onOpenClient} />
      ))}

      {result.noCards.length > 0 && (
        <div style={{ borderTop: `1px solid ${color.divider}`, padding: '8px 14px', fontSize: 12, color: color.muted }}>
          <button
            type="button"
            onClick={() => setShowNoCards((v) => !v)}
            style={{ background: 'none', border: 'none', padding: 0, color: color.text3, fontFamily: font.body, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {showNoCards ? '▾' : '▸'} {result.noCards.length} client{result.noCards.length === 1 ? '' : 's'} with no card in {RISK_WINDOW_DAYS} days
          </button>
          {showNoCards && (
            <div style={{ marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: '2px 10px' }}>
              {result.noCards.map((c) => (
                <span key={c.id}>
                  {c.name}
                  {trainerId ? '' : <span style={{ color: color.faint }}> · {coachName(c.trainerId)}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ row, coach, onOpen }: { row: RiskRow<ClientRef>; coach: string | null; onOpen?: (c: ClientRef) => void }) {
  const { client, risk } = row
  const tone = risk.level === 'high' ? color.red : color.amber
  const body = (
    <>
      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: tone }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: color.ink }}>
          {client.name}
          {coach && <span style={{ color: color.muted, fontWeight: 400 }}> · {coach}</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
          {risk.signals.map((s) => (
            <Chip key={s.key} level={s.level} text={s.text} />
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: color.text3, marginTop: 4 }}>
          {risk.lastSessionDate ? `Last session ${shortDate(risk.lastSessionDate)}` : 'No completed session in the window'}
          {risk.cadenceDays ? ` · usually every ${risk.cadenceDays} day${risk.cadenceDays === 1 ? '' : 's'}` : ''}
        </div>
      </div>
    </>
  )
  const style: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 14px 9px 10px',
    borderTop: `1px solid ${color.divider}`,
    background: risk.level === 'high' ? color.rowBehindBg : color.rowRiskBg,
    width: '100%',
    textAlign: 'left',
    fontFamily: font.body,
  }
  return onOpen ? (
    <button type="button" onClick={() => onOpen(client)} style={{ ...style, border: 'none', borderTop: style.borderTop, cursor: 'pointer' }}>
      {body}
    </button>
  ) : (
    <div style={style}>{body}</div>
  )
}

function Chip({ level, text }: { level: RiskLevel; text: string }) {
  const bg = level === 'high' ? color.redTintBg : color.amberTintBg
  const fg = level === 'high' ? color.red : color.amber
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: bg, color: fg, fontWeight: 600 }}>{text}</span>
  )
}

const smallPill: React.CSSProperties = {
  padding: '6px 11px',
  borderRadius: 20,
  border: `1px solid ${color.border}`,
  background: '#fff',
  color: color.ink,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: font.body,
}
