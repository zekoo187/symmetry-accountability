import { describe, expect, it } from 'vitest'
import { assessClient, assessRoster, cadence, daysBetween, habitPct } from '../risk'
import type { SessionCard } from '../types'

const TODAY = '2026-10-27'

function card(over: Partial<SessionCard> & { sessionDate: string }): SessionCard {
  return {
    id: over.sessionDate + Math.random(),
    trainerId: 'PA',
    clientId: 'c1',
    clientName: 'Test',
    outcome: 'completed',
    onTime: true,
    readiness: 4,
    bodyweight: null,
    sleepH: null,
    pain: 'none',
    painWhere: '',
    daysSince: 3,
    homeDays: null,
    habits: { calories: 3, protein: 3, fiber: 2, greens: 3, hydration: 3, sleep: 2, steps: 3 },
    weekly: {},
    exercises: 'Back squat 5x5 185 lb',
    rpe: 7,
    grade: 'high',
    win: '',
    nextBooked: true,
    nextDate: null,
    photoPath: null,
    notes: '',
    createdAt: over.sessionDate + 'T12:00:00Z',
    ...over,
  }
}

describe('daysBetween / cadence', () => {
  it('counts calendar days', () => {
    expect(daysBetween('2026-10-20', '2026-10-27')).toBe(7)
    expect(daysBetween('2026-09-30', '2026-10-01')).toBe(1)
  })
  it('needs three completed sessions for a cadence and takes the median gap', () => {
    expect(cadence([card({ sessionDate: '2026-10-20' }), card({ sessionDate: '2026-10-24' })])).toBeNull()
    const cs = ['2026-10-01', '2026-10-04', '2026-10-07', '2026-10-21'].map((d) => card({ sessionDate: d }))
    expect(cadence(cs)).toBe(3)
  })
})

describe('assessClient', () => {
  it('is quiet for a client training twice a week who has not been seen in 12 days', () => {
    const cs = ['2026-10-15', '2026-10-12', '2026-10-08', '2026-10-05'].map((d) => card({ sessionDate: d }))
    const r = assessClient(cs, TODAY)
    expect(r.cadenceDays).toBe(3)
    expect(r.daysSince).toBe(12)
    expect(r.signals.map((s) => s.key)).toEqual(['quiet'])
    expect(r.level).toBe('high')
  })

  it('does not flag a once-a-week client seen 8 days ago as high', () => {
    const cs = ['2026-10-19', '2026-10-12', '2026-10-05', '2026-09-28'].map((d) => card({ sessionDate: d }))
    const r = assessClient(cs, TODAY)
    expect(r.cadenceDays).toBe(7)
    expect(r.level).toBeNull()
  })

  it('is clean for a regular client seen three days ago with everything in order', () => {
    const cs = ['2026-10-24', '2026-10-21', '2026-10-17'].map((d) => card({ sessionDate: d }))
    expect(assessClient(cs, TODAY).level).toBeNull()
  })

  it('treats two missed sessions in a row as high', () => {
    const cs = [
      card({ sessionDate: '2026-10-24', outcome: 'no_show' }),
      card({ sessionDate: '2026-10-21', outcome: 'cancelled' }),
      card({ sessionDate: '2026-10-17' }),
    ]
    const r = assessClient(cs, TODAY)
    expect(r.signals.find((s) => s.key === 'missed')).toMatchObject({ level: 'high', text: '2 missed in a row' })
    expect(r.level).toBe('high')
  })

  it('one no-show plus no next booked is a watch, not high', () => {
    const cs = [card({ sessionDate: '2026-10-25', outcome: 'no_show' }), card({ sessionDate: '2026-10-22' })]
    const r = assessClient(cs, TODAY)
    expect(r.level).toBe('watch')
    expect(r.signals.map((s) => s.key)).toEqual(['missed'])
  })

  it('left without next booked becomes high once they go quiet', () => {
    const recent = assessClient([card({ sessionDate: '2026-10-25', nextBooked: false })], TODAY)
    expect(recent.level).toBe('watch')
    const quiet = assessClient([card({ sessionDate: '2026-10-17', nextBooked: false })], TODAY)
    expect(quiet.signals.find((s) => s.key === 'no_next')?.level).toBe('high')
    expect(quiet.level).toBe('high')
  })

  it('a pain flag on the latest card is high on its own', () => {
    const r = assessClient([card({ sessionDate: '2026-10-26', pain: 'flag', painWhere: 'L knee' })], TODAY)
    expect(r.level).toBe('high')
    expect(r.signals[0]).toMatchObject({ key: 'pain', text: 'pain flag: L knee' })
  })

  it('collapsing habits and repeated low grades are watch signals', () => {
    const bad = { calories: 0, protein: 1, fiber: 0, greens: 0, hydration: 1, sleep: 0, steps: 0 }
    const cs = [
      card({ sessionDate: '2026-10-25', habits: bad, grade: 'low' }),
      card({ sessionDate: '2026-10-22', habits: bad, grade: 'low' }),
      card({ sessionDate: '2026-10-19', habits: bad, grade: 'medium' }),
    ]
    const r = assessClient(cs, TODAY)
    expect(r.signals.map((s) => s.key).sort()).toEqual(['habits', 'low_grades'])
    expect(r.level).toBe('watch')
    expect(habitPct(cs)).toBeLessThan(35)
  })

  it('respects the coach flag and skips lost clients', () => {
    const cs = [card({ sessionDate: '2026-10-25' })]
    expect(assessClient(cs, TODAY, 'at_risk').signals.map((s) => s.key)).toEqual(['flagged'])
    expect(assessClient(cs, TODAY, 'lost').level).toBeNull()
  })
})

describe('assessRoster', () => {
  it('sorts worst first and separates clients with no cards and lost clients', () => {
    const clients = [
      { id: 'a', trainerId: 'PA', name: 'A' },
      { id: 'b', trainerId: 'PA', name: 'B' },
      { id: 'c', trainerId: 'PA', name: 'C' },
      { id: 'd', trainerId: 'PA', name: 'D', retention: 'lost' as const },
    ]
    const cards = [
      card({ clientId: 'a', sessionDate: '2026-10-25', nextBooked: false }),
      card({ clientId: 'b', sessionDate: '2026-10-24', outcome: 'no_show' }),
      card({ clientId: 'b', sessionDate: '2026-10-21', outcome: 'no_show' }),
      card({ clientId: 'b', sessionDate: '2026-10-18', pain: 'flag' }),
    ]
    const r = assessRoster(clients, cards, TODAY)
    expect(r.atRisk.map((x) => x.client.id)).toEqual(['b', 'a'])
    expect(r.atRisk[0].risk.level).toBe('high')
    expect(r.noCards.map((c) => c.id)).toEqual(['c'])
    expect(r.lost.map((c) => c.id)).toEqual(['d'])
  })
})
