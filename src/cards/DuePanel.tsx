import { useCallback, useEffect, useMemo, useState } from 'react'
import { color, font, shadow } from '../lib/tokens'
import type { CurrentUser, Trainer } from '../lib/types'
import { cardsApi, daysBefore, todayISO, type ClientRef } from './cardsApi'
import { computeDue, MILESTONES, type DueItem, type Milestone } from './due'
import type { SessionCard } from './types'
import { shortDate } from './TrainerCards'

/**
 * What is due: the two-week check-in and the week-8 re-test, per client,
 * from the client's start date and what has already been marked done.
 * Coaches mark them done here; owners see every coach's list.
 */
export function DuePanel({
  user,
  trainers,
  trainerId,
  refreshKey,
}: {
  user: CurrentUser
  trainers: Trainer[]
  trainerId?: string
  refreshKey?: number | string
}) {
  const [clients, setClients] = useState<ClientRef[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [cards, setCards] = useState<SessionCard[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showUpcoming, setShowUpcoming] = useState(false)
  const [showNoStart, setShowNoStart] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const today = todayISO()
    const [cl, ms, cs] = await Promise.all([
      cardsApi.listClients(user),
      cardsApi.listMilestones(user),
      cardsApi.listCards(user, daysBefore(today, 180), today),
    ])
    setClients(trainerId ? cl.filter((c) => c.trainerId === trainerId) : cl)
    setMilestones(trainerId ? ms.filter((m) => m.trainerId === trainerId) : ms)
    setCards(trainerId ? cs.filter((c) => c.trainerId === trainerId) : cs)
    setError(null)
    setLoaded(true)
  }, [user, trainerId])

  useEffect(() => {
    let cancelled = false
    load().catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load'))
    return () => {
      cancelled = true
    }
  }, [load, refreshKey])

  const today = todayISO()
  const due = useMemo(() => computeDue(clients, milestones, cards, today), [clients, milestones, cards, today])
  const overdue = due.items.filter((i) => i.status === 'overdue')
  const thisWeek = due.items.filter((i) => i.status === 'due')
  const upcoming = due.items.filter((i) => i.status === 'upcoming')
  const coachName = (id: string) => trainers.find((t) => t.id === id)?.name ?? id

  const markDone = async (item: DueItem<ClientRef>, doneOn: string) => {
    setBusy(`${item.client.id}:${item.kind}`)
    try {
      await cardsApi.markMilestone(user, {
        clientId: item.client.id,
        trainerId: item.client.trainerId,
        kind: item.kind,
        dueOn: item.dueOn,
        doneOn,
        note: '',
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  const setStart = async (client: ClientRef, iso: string) => {
    if (!iso) return
    setBusy(client.id)
    try {
      await cardsApi.setStartedOn(user, client.id, iso)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(null)
    }
  }

  if (error) return <div style={{ color: color.red, fontSize: 12.5, marginTop: 14 }}>{error}</div>
  if (!loaded) return null

  const shown = [...overdue, ...thisWeek, ...(showUpcoming ? upcoming : [])]

  return (
    <div style={{ background: '#fff', border: `1px solid ${color.border}`, borderRadius: 14, boxShadow: shadow.card, overflow: 'hidden', marginTop: 14 }}>
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${color.borderSoft}` }}>
        <div className="sg" style={{ fontWeight: 700, fontSize: 15 }}>
          Due
          {(overdue.length > 0 || thisWeek.length > 0) && (
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: overdue.length ? color.red : color.amber }}>
              {overdue.length > 0 ? `${overdue.length} overdue` : ''}
              {overdue.length > 0 && thisWeek.length > 0 ? ' · ' : ''}
              {thisWeek.length > 0 ? `${thisWeek.length} this week` : ''}
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: color.muted }}>
          {overdue.length + thisWeek.length === 0
            ? `Nothing due this week. ${MILESTONES.checkin.label} every ${MILESTONES.checkin.everyDays} days, ${MILESTONES.retest.label.toLowerCase()} every ${MILESTONES.retest.everyDays}, from each client's start date.`
            : `${MILESTONES.checkin.label} every ${MILESTONES.checkin.everyDays} days, ${MILESTONES.retest.label.toLowerCase()} every ${MILESTONES.retest.everyDays}, from each client's start date. Tap Done when it has happened.`}
        </div>
      </div>

      {shown.map((item) => {
        const key = `${item.client.id}:${item.kind}`
        const tone = item.status === 'overdue' ? color.red : item.status === 'due' ? color.amber : color.muted
        const when =
          item.daysLeft < 0
            ? `${-item.daysLeft} day${item.daysLeft === -1 ? '' : 's'} overdue`
            : item.daysLeft === 0
              ? 'due today'
              : `due ${shortDate(item.dueOn)}`
        return (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 14px 9px 10px',
              borderTop: `1px solid ${color.divider}`,
              background: item.status === 'overdue' ? color.rowBehindBg : item.status === 'due' ? color.rowRiskBg : '#fff',
            }}
          >
            <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: tone }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: color.ink }}>
                {item.client.name}
                {!trainerId && <span style={{ color: color.muted, fontWeight: 400 }}> · {coachName(item.client.trainerId)}</span>}
              </div>
              <div style={{ fontSize: 12, color: color.text2, marginTop: 2 }}>
                {MILESTONES[item.kind].label}
                {item.nth > 1 ? ` #${item.nth}` : ''} · <span style={{ color: tone, fontWeight: 600 }}>{when}</span>
                {item.lastDoneOn ? <span style={{ color: color.muted }}> · last {shortDate(item.lastDoneOn)}</span> : ''}
              </div>
            </div>
            <DoneButton busy={busy === key} onDone={(d) => void markDone(item, d)} />
          </div>
        )
      })}

      {upcoming.length > 0 && (
        <Toggle on={showUpcoming} onClick={() => setShowUpcoming((v) => !v)}>
          {upcoming.length} coming up in the next two weeks
        </Toggle>
      )}

      {due.noStart.length > 0 && (
        <>
          <Toggle on={showNoStart} onClick={() => setShowNoStart((v) => !v)}>
            {due.noStart.length} client{due.noStart.length === 1 ? '' : 's'} with no start date yet
          </Toggle>
          {showNoStart &&
            due.noStart.map((c) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', fontSize: 12.5 }}>
                <span style={{ flex: 1 }}>
                  {c.name}
                  {!trainerId && <span style={{ color: color.faint }}> · {coachName(c.trainerId)}</span>}
                </span>
                <label style={{ fontSize: 11.5, color: color.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                  started
                  <input
                    type="date"
                    max={today}
                    disabled={busy === c.id}
                    onChange={(e) => void setStart(c, e.target.value)}
                    style={{ fontFamily: font.body, fontSize: 12.5, padding: '4px 6px', border: `1px solid ${color.border}`, borderRadius: 8 }}
                  />
                </label>
              </div>
            ))}
        </>
      )}
    </div>
  )
}

function DoneButton({ busy, onDone }: { busy: boolean; onDone: (doneOn: string) => void }) {
  const [pick, setPick] = useState(false)
  if (pick) {
    return (
      <input
        type="date"
        autoFocus
        max={todayISO()}
        defaultValue={todayISO()}
        onBlur={() => setPick(false)}
        onChange={(e) => {
          if (e.target.value) onDone(e.target.value)
          setPick(false)
        }}
        style={{ fontFamily: font.body, fontSize: 12.5, padding: '4px 6px', border: `1px solid ${color.border}`, borderRadius: 8 }}
      />
    )
  }
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      <button type="button" disabled={busy} onClick={() => onDone(todayISO())} style={doneStyle}>
        {busy ? '…' : 'Done today'}
      </button>
      <button type="button" disabled={busy} onClick={() => setPick(true)} title="Done on another date" style={{ ...doneStyle, padding: '6px 8px' }}>
        ⋯
      </button>
    </div>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${color.divider}`, padding: '8px 14px' }}>
      <button
        type="button"
        onClick={onClick}
        style={{ background: 'none', border: 'none', padding: 0, color: color.text3, fontFamily: font.body, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
      >
        {on ? '▾' : '▸'} {children}
      </button>
    </div>
  )
}

const doneStyle: React.CSSProperties = {
  padding: '6px 11px',
  borderRadius: 20,
  border: `1px solid ${color.border}`,
  background: '#fff',
  color: color.ink,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: font.body,
  whiteSpace: 'nowrap',
}
