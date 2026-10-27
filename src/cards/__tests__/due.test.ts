import { describe, expect, it } from 'vitest'
import { addDays, computeDue, effectiveStart, nextDue, type Milestone } from '../due'
import type { SessionCard } from '../types'

const TODAY = '2026-10-27'

function card(clientId: string, sessionDate: string): SessionCard {
  return {
    id: clientId + sessionDate, trainerId: 'PA', clientId, clientName: '', sessionDate, outcome: 'completed',
    onTime: null, readiness: null, bodyweight: null, sleepH: null, pain: 'none', painWhere: '', daysSince: null,
    homeDays: null, habits: {}, weekly: {}, exercises: '', rpe: null, grade: null, win: '', nextBooked: null,
    nextDate: null, photoPath: null, notes: '', createdAt: sessionDate,
  }
}
function done(clientId: string, kind: Milestone['kind'], doneOn: string): Milestone {
  return { id: clientId + kind + doneOn, clientId, trainerId: 'PA', kind, dueOn: null, doneOn, note: '' }
}

describe('addDays / effectiveStart', () => {
  it('adds calendar days across month ends', () => {
    expect(addDays('2026-10-20', 14)).toBe('2026-11-03')
    expect(addDays('2026-10-01', 56)).toBe('2026-11-26')
  })
  it('prefers the coach start date, else the first card', () => {
    const c = { id: 'a', trainerId: 'PA', name: 'A', startedOn: null }
    expect(effectiveStart(c, [])).toBeNull()
    expect(effectiveStart(c, [card('a', '2026-10-10'), card('a', '2026-10-03'), card('b', '2026-09-01')])).toBe('2026-10-03')
    expect(effectiveStart({ ...c, startedOn: '2026-09-15' }, [card('a', '2026-10-03')])).toBe('2026-09-15')
  })
})

describe('nextDue', () => {
  it('counts from the start when nothing is done, then from the last one done', () => {
    expect(nextDue('checkin', '2026-10-01', [])).toEqual({ dueOn: '2026-10-15', lastDoneOn: null, nth: 1 })
    expect(nextDue('checkin', '2026-10-01', [done('a', 'checkin', '2026-10-16'), done('a', 'retest', '2026-10-20')])).toEqual({
      dueOn: '2026-10-30', lastDoneOn: '2026-10-16', nth: 2,
    })
    expect(nextDue('retest', '2026-08-01', [])).toEqual({ dueOn: '2026-09-26', lastDoneOn: null, nth: 1 })
  })
})

describe('computeDue', () => {
  const clients = [
    { id: 'a', trainerId: 'PA', name: 'Ava', startedOn: '2026-10-06' },   // check-in due Oct 20 (overdue 7), re-test Dec 1 (out of horizon)
    { id: 'b', trainerId: 'PA', name: 'Ben', startedOn: '2026-08-31' },   // re-test due Oct 26 (overdue 1); check-ins done up to Oct 25 → next Nov 8 (upcoming)
    { id: 'c', trainerId: 'RO', name: 'Cal', startedOn: null },           // no start, no cards
    { id: 'd', trainerId: 'RO', name: 'Dee', startedOn: null },           // first card Oct 15 → check-in Oct 29 (due in 2)
    { id: 'e', trainerId: 'RO', name: 'Eve', startedOn: '2026-01-01', retention: 'lost' as const },
  ]
  const milestones = [done('b', 'checkin', '2026-10-25')]
  const cards = [card('d', '2026-10-15'), card('d', '2026-10-22')]

  it('lists overdue first, then due, then upcoming, and separates clients with no start', () => {
    const r = computeDue(clients, milestones, cards, TODAY)
    expect(r.items.map((i) => `${i.client.name}:${i.kind}:${i.status}:${i.daysLeft}`)).toEqual([
      'Ava:checkin:overdue:-7',
      'Ben:retest:overdue:-1',
      'Dee:checkin:due:2',
      'Ben:checkin:upcoming:12',
    ])
    expect(r.noStart.map((c) => c.id)).toEqual(['c'])
  })

  it('records which occurrence it is and the last one done', () => {
    const r = computeDue(clients, milestones, cards, TODAY)
    const ben = r.items.find((i) => i.client.id === 'b' && i.kind === 'checkin')!
    expect(ben.nth).toBe(2)
    expect(ben.lastDoneOn).toBe('2026-10-25')
  })
})
