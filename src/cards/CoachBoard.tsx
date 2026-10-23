import { useEffect, useMemo, useState } from 'react'
import { color, font, shadow } from '../lib/tokens'
import type { CurrentUser, Trainer } from '../lib/types'
import { Avatar } from '../components/primitives'
import { cardsApi, daysBefore, todayISO, type ClientRef } from './cardsApi'
import { progressions, sessionPatterns, type Progression } from './parse'
import { DAILY_HABITS, WEEKLY_HABITS, type SessionCard } from './types'
import { gradeStyle, shortDate } from './TrainerCards'

/**
 * The owner's board: what is going on with every coach's clients, read off
 * the session cards, without asking anyone. Two levels: coach, then client.
 */
export function CoachBoard({
  user,
  trainers,
  onClose,
}: {
  user: CurrentUser
  trainers: Trainer[]
  onClose: () => void
}) {
  const [days, setDays] = useState(7)
  const [cards, setCards] = useState<SessionCard[]>([])
  const [clients, setClients] = useState<ClientRef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openClient, setOpenClient] = useState<ClientRef | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const today = todayISO()
    Promise.all([cardsApi.listCards(user, daysBefore(today, days - 1), today), cardsApi.listClients(user)])
      .then(([cs, cl]) => {
        if (cancelled) return
        setCards(cs)
        setClients(cl)
        setError(null)
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load cards'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [user, days])

  const byTrainer = useMemo(() => {
    const m = new Map<string, SessionCard[]>()
    for (const c of cards) m.set(c.trainerId, [...(m.get(c.trainerId) ?? []), c])
    return m
  }, [cards])

  const flags = cards.filter((c) => c.pain === 'flag')
  const noNext = cards.filter((c) => c.outcome === 'completed' && c.nextBooked === false)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: color.appBg,
        overflowY: 'auto',
        fontFamily: font.body,
        color: color.ink,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '18px 16px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="sg" style={{ fontWeight: 700, fontSize: 20 }}>
              Session cards
            </div>
            <div style={{ fontSize: 12.5, color: color.muted }}>
              What the coaches logged, client by client. {cards.length} cards in the last {days} days.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                style={pill(days === d)}
              >
                {d} days
              </button>
            ))}
            <button type="button" onClick={onClose} style={{ ...pill(false), marginLeft: 8 }}>
              Close
            </button>
          </div>
        </div>

        {(flags.length > 0 || noNext.length > 0) && (
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            {flags.length > 0 && (
              <Callout tone="red" title={`${flags.length} pain flag${flags.length > 1 ? 's' : ''} for you`}>
                {flags.map((c) => (
                  <div key={c.id}>
                    {c.clientName} · {shortDate(c.sessionDate)} · {c.painWhere || 'no detail'} ({trainerName(trainers, c.trainerId)})
                  </div>
                ))}
              </Callout>
            )}
            {noNext.length > 0 && (
              <Callout tone="amber" title={`${noNext.length} left without the next session booked`}>
                {noNext.map((c) => (
                  <div key={c.id}>
                    {c.clientName} · {shortDate(c.sessionDate)} ({trainerName(trainers, c.trainerId)})
                  </div>
                ))}
              </Callout>
            )}
          </div>
        )}

        {error && <div style={{ color: color.red, marginTop: 14 }}>{error}</div>}
        {loading && <div style={{ color: color.muted, marginTop: 14 }}>Loading…</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12, marginTop: 16 }}>
          {trainers.map((t) => (
            <TrainerPanel
              key={t.id}
              trainer={t}
              cards={byTrainer.get(t.id) ?? []}
              clients={clients.filter((c) => c.trainerId === t.id)}
              onOpenClient={setOpenClient}
            />
          ))}
        </div>
      </div>

      {openClient && (
        <ClientTimeline user={user} client={openClient} trainers={trainers} onClose={() => setOpenClient(null)} />
      )}
    </div>
  )
}

function trainerName(trainers: Trainer[], id: string): string {
  return trainers.find((t) => t.id === id)?.name ?? id
}

function pill(on: boolean): React.CSSProperties {
  return {
    padding: '7px 12px',
    borderRadius: 20,
    border: `1px solid ${on ? color.ink : color.border}`,
    background: on ? color.ink : '#fff',
    color: on ? '#fff' : color.ink,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: font.body,
  }
}

function Callout({ tone, title, children }: { tone: 'red' | 'amber'; title: string; children: React.ReactNode }) {
  const bg = tone === 'red' ? color.redTintBg : color.amberTintBg
  const fg = tone === 'red' ? color.red : color.amber
  return (
    <div style={{ flex: 1, minWidth: 260, background: bg, borderRadius: 12, padding: '10px 14px', fontSize: 12.5 }}>
      <div style={{ fontWeight: 700, color: fg, marginBottom: 4 }}>{title}</div>
      <div style={{ color: color.text2, display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>
    </div>
  )
}

/** Habit days hit over days available, across a set of cards. 0..100, or null. */
export function habitPct(cards: SessionCard[]): number | null {
  const done = cards.filter((c) => c.outcome === 'completed' && (c.daysSince ?? 0) > 0)
  if (done.length === 0) return null
  const total = done.reduce((s, c) => s + (c.daysSince ?? 0), 0)
  const rates: number[] = []
  for (const h of DAILY_HABITS) {
    const hit = done.reduce((s, c) => s + (c.habits[h.key] ?? 0), 0)
    rates.push(Math.min(1, hit / total))
  }
  const weeklyAnswers = done.flatMap((c) => WEEKLY_HABITS.map((h) => c.weekly[h.key]).filter((v) => v !== undefined))
  if (weeklyAnswers.length > 0) rates.push(weeklyAnswers.filter(Boolean).length / weeklyAnswers.length)
  return Math.round((100 * rates.reduce((a, b) => a + b, 0)) / rates.length)
}

function TrainerPanel({
  trainer,
  cards,
  clients,
  onOpenClient,
}: {
  trainer: Trainer
  cards: SessionCard[]
  clients: ClientRef[]
  onOpenClient: (c: ClientRef) => void
}) {
  const done = cards.filter((c) => c.outcome === 'completed')
  const missed = cards.length - done.length
  const grades = { low: 0, medium: 0, high: 0, mastered: 0 }
  for (const c of done) if (c.grade) grades[c.grade] += 1
  const onTime = done.filter((c) => c.onTime !== null)
  const onTimePct = onTime.length ? Math.round((100 * onTime.filter((c) => c.onTime).length) / onTime.length) : null
  const habits = habitPct(cards)
  const rpes = done.map((c) => c.rpe).filter((r): r is number => r !== null)
  const avgRpe = rpes.length ? (rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1) : '—'

  // clients with cards in the window, then the rest of the roster
  const byClient = new Map<string, SessionCard[]>()
  for (const c of cards) byClient.set(c.clientId, [...(byClient.get(c.clientId) ?? []), c])
  const rows = [
    ...clients.filter((c) => byClient.has(c.id)),
    ...clients.filter((c) => !byClient.has(c.id)),
  ]

  return (
    <div style={{ background: '#fff', border: `1px solid ${color.border}`, borderRadius: 14, boxShadow: shadow.card, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderBottom: `1px solid ${color.borderSoft}` }}>
        <Avatar initials={trainer.initials} bg={trainer.avatarBg} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{trainer.name}</div>
          <div style={{ fontSize: 12, color: color.muted }}>
            {done.length} card{done.length === 1 ? '' : 's'}
            {missed > 0 ? ` · ${missed} missed` : ''} · {clients.length} client{clients.length === 1 ? '' : 's'}
          </div>
        </div>
        {cards.length === 0 && (
          <span style={{ fontSize: 11.5, color: color.pendingFg, background: color.pendingBg, padding: '3px 9px', borderRadius: 20, fontWeight: 600 }}>
            no cards
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0, borderBottom: `1px solid ${color.borderSoft}` }}>
        <Stat label="On time" value={onTimePct === null ? '—' : `${onTimePct}%`} />
        <Stat label="Habits" value={habits === null ? '—' : `${habits}%`} />
        <Stat label="Avg RPE" value={avgRpe} />
        <Stat
          label="Grades"
          value={done.length ? `${grades.high + grades.mastered}/${done.length} high+` : '—'}
          hint={done.length ? `${grades.low} low · ${grades.medium} med · ${grades.high} high · ${grades.mastered} mastered` : undefined}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((cl) => {
          const cs = byClient.get(cl.id) ?? []
          const last = cs[0]
          const prev = cs[1]
          const prog = last && last.outcome === 'completed' ? progressions(last.exercises, prev?.exercises ?? null) : []
          const up = prog.filter((p) => p.change === 'up').length
          const flat = prog.filter((p) => p.change === 'same' || p.change === 'down').length
          const g = gradeStyle(last?.grade ?? null)
          const h = habitPct(cs)
          return (
            <button
              key={cl.id}
              type="button"
              onClick={() => onOpenClient(cl)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 14px',
                borderTop: `1px solid ${color.divider}`,
                background: last && last.nextBooked === false ? color.rowRiskBg : '#fff',
                border: 'none',
                borderBottom: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: font.body,
                width: '100%',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: color.ink }}>{cl.name}</div>
                <div style={{ fontSize: 11.5, color: color.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {last
                    ? `${cs.length} session${cs.length === 1 ? '' : 's'} · last ${shortDate(last.sessionDate)}` +
                      (prog.length ? ` · ${up} up, ${flat} held` : '') +
                      (h !== null ? ` · habits ${h}%` : '')
                    : 'no card in this window'}
                </div>
              </div>
              {last && last.outcome === 'completed' && (
                <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: g.bg, color: g.fg }}>
                  {g.label}
                </span>
              )}
              {last && last.nextBooked === false && (
                <span style={{ fontSize: 11, color: color.red, fontWeight: 700 }}>no next</span>
              )}
              {last && last.pain === 'flag' && (
                <span style={{ fontSize: 11, color: color.red, fontWeight: 700 }}>pain</span>
              )}
            </button>
          )
        })}
        {rows.length === 0 && <div style={{ padding: '10px 14px', fontSize: 12.5, color: color.muted }}>No clients on the roster.</div>}
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div title={hint} style={{ padding: '10px 12px', borderRight: `1px solid ${color.borderSoft}` }}>
      <div style={{ fontSize: 10.5, color: color.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div className="sg" style={{ fontWeight: 700, fontSize: 16 }}>
        {value}
      </div>
    </div>
  )
}

/** One client's cards, newest first, with what moved between sessions. */
function ClientTimeline({
  user,
  client,
  trainers,
  onClose,
}: {
  user: CurrentUser
  client: ClientRef
  trainers: Trainer[]
  onClose: () => void
}) {
  const [cards, setCards] = useState<SessionCard[] | null>(null)
  const [photo, setPhoto] = useState<{ id: string; url: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    cardsApi
      .listClientCards(user, client.id)
      .then((cs) => !cancelled && setCards(cs))
      .catch(() => !cancelled && setCards([]))
    return () => {
      cancelled = true
    }
  }, [user, client.id])

  const openPhoto = async (c: SessionCard) => {
    if (!c.photoPath) return
    const url = await cardsApi.photoUrl(c.photoPath)
    if (url) setPhoto({ id: c.id, url })
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(35,32,28,.45)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: '100%', maxWidth: 560, background: '#fff', height: '100%', overflowY: 'auto', boxShadow: shadow.drawer }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${color.borderSoft}` }}>
          <div>
            <div className="sg" style={{ fontWeight: 700, fontSize: 17 }}>
              {client.name}
            </div>
            <div style={{ fontSize: 12, color: color.muted }}>
              with {trainerName(trainers, client.trainerId)} · {cards?.length ?? '…'} cards on file
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ ...pill(false) }}>
            Close
          </button>
        </div>

        <div style={{ padding: '12px 16px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cards === null && <div style={{ color: color.muted }}>Loading…</div>}
          {cards && cards.length === 0 && <div style={{ color: color.muted }}>No cards yet.</div>}
          {cards?.map((c, i) => {
            const prev = cards[i + 1]
            const prog = c.outcome === 'completed' ? progressions(c.exercises, prev?.exercises ?? null) : []
            const g = gradeStyle(c.grade)
            return (
              <div key={c.id} style={{ border: `1px solid ${color.borderSoft}`, borderRadius: 12, padding: '10px 12px', background: c.outcome === 'completed' ? '#fff' : color.rowBehindBg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>
                    {shortDate(c.sessionDate)}{' '}
                    <span style={{ color: color.muted, fontWeight: 400 }}>
                      · {c.outcome === 'completed' ? sessionPatterns(c.exercises) : c.outcome === 'no_show' ? 'No-show' : 'Cancelled'}
                    </span>
                  </div>
                  {c.outcome === 'completed' && (
                    <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: g.bg, color: g.fg }}>{g.label}</span>
                  )}
                  {c.photoPath && (
                    <button type="button" onClick={() => void openPhoto(c)} style={{ ...pill(false), padding: '4px 9px', fontSize: 11.5 }}>
                      card photo
                    </button>
                  )}
                </div>
                {photo?.id === c.id && (
                  <img src={photo.url} alt="Session card" style={{ width: '100%', borderRadius: 8, marginTop: 8, border: `1px solid ${color.borderSoft}` }} />
                )}
                {c.outcome === 'completed' && (
                  <>
                    <div style={{ fontSize: 12, color: color.text2, marginTop: 6, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span>RPE {c.rpe ?? '—'}</span>
                      <span>Ready {c.readiness ?? '—'}/5</span>
                      <span>{c.onTime === null ? '' : c.onTime ? 'On time' : 'Late'}</span>
                      {c.bodyweight !== null && <span>{c.bodyweight} lb</span>}
                      {c.sleepH !== null && <span>Sleep {c.sleepH} h</span>}
                      <span style={{ color: c.nextBooked === false ? color.red : color.green, fontWeight: 600 }}>
                        {c.nextBooked === null ? '' : c.nextBooked ? `Next booked${c.nextDate ? ' ' + shortDate(c.nextDate) : ''}` : 'Next not booked'}
                      </span>
                      {c.pain !== 'none' && (
                        <span style={{ color: color.red, fontWeight: 600 }}>
                          Pain: {c.painWhere || 'noted'}{c.pain === 'flag' ? ' (flagged)' : ''}
                        </span>
                      )}
                    </div>
                    {prog.length > 0 && <ProgressList items={prog} />}
                    {c.daysSince !== null && c.daysSince > 0 && <HabitLine card={c} />}
                    {c.win && <div style={{ fontSize: 12.5, marginTop: 6 }}>Win: <b>{c.win}</b></div>}
                  </>
                )}
                {c.notes && <div style={{ fontSize: 12, color: color.muted, marginTop: 6 }}>{c.notes}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ProgressList({ items }: { items: Progression[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 8 }}>
      {items.map((p, i) => {
        const fg =
          p.change === 'up' ? color.green : p.change === 'down' ? color.red : p.change === 'new' ? color.muted : color.amber
        const txt =
          p.change === 'new'
            ? `${p.to} ${p.unit} · first time logged`
            : `${p.from} → ${p.to} ${p.unit} · ${p.change === 'up' ? 'up' : p.change === 'down' ? 'down' : 'held'}`
        return (
          <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5 }}>
            <span style={{ flex: 1 }}>
              {p.name} <span style={{ color: color.muted, fontSize: 11 }}>· {p.pattern}</span>
            </span>
            <span style={{ color: fg, fontWeight: 600 }}>{txt}</span>
          </div>
        )
      })}
    </div>
  )
}

function HabitLine({ card }: { card: SessionCard }) {
  const d = card.daysSince ?? 0
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {DAILY_HABITS.map((h) => {
        const v = card.habits[h.key] ?? 0
        const ok = d > 0 && v / d >= 0.7
        return (
          <span key={h.key} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 12, background: ok ? color.greenTintBg : color.pendingBg, color: ok ? color.greenDark : color.pendingFg, fontWeight: 600 }}>
            {h.label} {v}/{d}
          </span>
        )
      })}
      {WEEKLY_HABITS.map((h) => {
        const v = card.weekly[h.key]
        if (v === undefined) return null
        return (
          <span key={h.key} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 12, background: v ? color.greenTintBg : color.pendingBg, color: v ? color.greenDark : color.pendingFg, fontWeight: 600 }}>
            {h.label} {v ? 'on target' : 'not yet'}
          </span>
        )
      })}
      {card.homeDays !== null && (
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 12, background: color.pendingBg, color: color.text3, fontWeight: 600 }}>
          Home routine {card.homeDays}/{d}
        </span>
      )}
    </div>
  )
}
