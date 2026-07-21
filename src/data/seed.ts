import type { Trainer, Week, WeeklyMember, ClientCheckin } from '../lib/types'

// ---------------------------------------------------------------------------
// Sample data — ported verbatim from the prototype's getWeeks().
// Trainer names are real; sessions/clients/statuses are illustrative and get
// replaced by the Supabase backend once configured. This same data also seeds
// the database (see supabase/seed.sql), so the two stay in lock-step.
// ---------------------------------------------------------------------------

const cl = (name: string, water: number, weekly: number, win = ''): ClientCheckin => ({
  name,
  water: !!water,
  weekly: !!weekly,
  win,
})

export const ROSTER: Trainer[] = [
  { id: 'PA', name: 'Paola', initials: 'PA', role: 'Strength', avatarBg: '#4C6EF5' },
  { id: 'RO', name: 'Roma', initials: 'RO', role: 'HIIT', avatarBg: '#E2603A' },
  { id: 'NA', name: 'Natalia', initials: 'NA', role: 'Mobility', avatarBg: '#C98A16' },
  { id: 'SA', name: 'Santiago', initials: 'SA', role: 'Strength', avatarBg: '#2E7D5B' },
  { id: 'IV', name: 'Ivan', initials: 'IV', role: 'Boxing', avatarBg: '#B0574A' },
  { id: 'SM', name: 'Simona', initials: 'SM', role: 'Pilates', avatarBg: '#9A6DB8' },
]

type MemberData = Omit<WeeklyMember, keyof Trainer>

function build(data: Record<string, MemberData>): WeeklyMember[] {
  return ROSTER.map((r) => ({ ...r, ...data[r.id] }))
}

export const WEEKS: Week[] = [
  {
    id: 'w0',
    label: 'Week of Jul 6 – Jul 12',
    short: 'Jul 6–12',
    startDate: '2026-07-06',
    wins: [
      { stat: '−4 lb', text: 'Santiago’s client Ana hit a 4 lb loss 🎉' },
      { stat: '100%', text: 'Paola: every client logged their weekly weigh-in' },
      { stat: '26', text: 'Santiago fully booked for next week' },
    ],
    members: build({
      PA: {
        sessions: 22, sched: 24, showed: 22, noShows: 0, cancels: 2, nextWeek: 24,
        status: 'track', points: '0,13 11,10 23,8 34,5 46,3',
        clients: [cl('Mia R.', 1, 1), cl('Tom B.', 1, 1, '−2 lb'), cl('Dana K.', 1, 1)],
        note: 'Every client hydrated and weighed in. Model week.',
      },
      RO: {
        sessions: 18, sched: 20, showed: 18, noShows: 1, cancels: 1, nextWeek: 20,
        status: 'track', points: '0,11 11,10 23,9 34,7 46,6',
        clients: [cl('Kim S.', 1, 1), cl('Val D.', 1, 0), cl('Otis P.', 1, 1)],
        note: 'Solid. Nudge Val on the weekly weigh-in.',
      },
      NA: {
        sessions: 12, sched: 18, showed: 12, noShows: 4, cancels: 2, nextWeek: 15,
        status: 'risk', points: '0,7 11,8 23,9 34,11 46,13',
        clients: [cl('Leo P.', 0, 0), cl('Sara M.', 1, 0), cl('Nia F.', 0, 0)],
        note: 'Show rate dropped to 67% and most check-ins are missing. Check in with her.',
      },
      SA: {
        sessions: 25, sched: 26, showed: 25, noShows: 0, cancels: 1, nextWeek: 26,
        status: 'track', points: '0,15 11,11 23,8 34,5 46,1',
        clients: [cl('Ana G.', 1, 1, '−4 lb'), cl('Ben H.', 1, 1), cl('Ced L.', 1, 1)],
        note: 'Top performer this week — fully booked ahead.',
      },
      IV: {
        sessions: 8, sched: 16, showed: 8, noShows: 5, cancels: 3, nextWeek: 10,
        status: 'behind', points: '0,4 11,7 23,10 34,13 46,16',
        clients: [cl('Jay T.', 0, 0), cl('Ella V.', 1, 0), cl('Rob C.', 0, 0)],
        note: 'Half of sessions were no-shows or cancels and check-ins are stalled. Needs a reminder today.',
      },
      SM: {
        sessions: 20, sched: 21, showed: 20, noShows: 1, cancels: 0, nextWeek: 21,
        status: 'track', points: '0,12 11,10 23,9 34,7 46,6',
        clients: [cl('Pia N.', 1, 1), cl('Gus A.', 1, 1, 'PR deadlift'), cl('Ivy R.', 1, 1)],
        note: 'Consistent, clients all logging.',
      },
    }),
  },
  {
    id: 'w1',
    label: 'Week of Jun 29 – Jul 5',
    short: 'Jun 29–Jul 5',
    startDate: '2026-06-29',
    wins: [
      { stat: '−3 lb', text: 'Simona’s client Gus down 3 lb before his meet' },
      { stat: '92%', text: 'Team show rate up 6 points on last week' },
    ],
    members: build({
      PA: {
        sessions: 20, sched: 22, showed: 20, noShows: 1, cancels: 1, nextWeek: 24,
        status: 'track', points: '0,12 11,10 23,9 34,7 46,5',
        clients: [cl('Mia R.', 1, 1), cl('Tom B.', 1, 1), cl('Dana K.', 1, 0)], note: 'Strong.',
      },
      RO: {
        sessions: 17, sched: 18, showed: 17, noShows: 1, cancels: 0, nextWeek: 20,
        status: 'track', points: '0,11 11,10 23,10 34,8 46,7',
        clients: [cl('Kim S.', 1, 1), cl('Val D.', 1, 1), cl('Otis P.', 1, 1)], note: 'Clean week.',
      },
      NA: {
        sessions: 15, sched: 17, showed: 15, noShows: 1, cancels: 1, nextWeek: 16,
        status: 'track', points: '0,10 11,9 23,9 34,8 46,7',
        clients: [cl('Leo P.', 1, 1), cl('Sara M.', 1, 0), cl('Nia F.', 1, 1)],
        note: 'Was steady — watch this week’s dip.',
      },
      SA: {
        sessions: 24, sched: 25, showed: 24, noShows: 0, cancels: 1, nextWeek: 26,
        status: 'track', points: '0,13 11,10 23,8 34,5 46,3',
        clients: [cl('Ana G.', 1, 1), cl('Ben H.', 1, 1), cl('Ced L.', 1, 1)], note: 'Reliable.',
      },
      IV: {
        sessions: 12, sched: 15, showed: 12, noShows: 2, cancels: 1, nextWeek: 14,
        status: 'risk', points: '0,8 11,8 23,9 34,10 46,11',
        clients: [cl('Jay T.', 1, 0), cl('Ella V.', 1, 1), cl('Rob C.', 0, 0)], note: 'Slipping — flag early.',
      },
      SM: {
        sessions: 19, sched: 20, showed: 19, noShows: 1, cancels: 0, nextWeek: 21,
        status: 'track', points: '0,11 11,10 23,9 34,8 46,7',
        clients: [cl('Pia N.', 1, 1), cl('Gus A.', 1, 1, '−3 lb'), cl('Ivy R.', 1, 1)], note: 'Great.',
      },
    }),
  },
  {
    id: 'w2',
    label: 'Week of Jun 22 – Jun 28',
    short: 'Jun 22–28',
    startDate: '2026-06-22',
    wins: [{ stat: '✓', text: 'First week every trainer sent all daily check-ins' }],
    members: build({
      PA: {
        sessions: 18, sched: 20, showed: 18, noShows: 1, cancels: 1, nextWeek: 22,
        status: 'track', points: '0,12 11,11 23,10 34,8 46,7',
        clients: [cl('Mia R.', 1, 1), cl('Tom B.', 1, 1)], note: 'Ramping up.',
      },
      RO: {
        sessions: 16, sched: 17, showed: 16, noShows: 1, cancels: 0, nextWeek: 18,
        status: 'track', points: '0,11 11,11 23,9 34,9 46,8',
        clients: [cl('Kim S.', 1, 1), cl('Otis P.', 1, 1)], note: 'Good.',
      },
      NA: {
        sessions: 14, sched: 15, showed: 14, noShows: 1, cancels: 0, nextWeek: 17,
        status: 'track', points: '0,10 11,10 23,9 34,9 46,8',
        clients: [cl('Leo P.', 1, 1), cl('Nia F.', 1, 1)], note: 'Solid start.',
      },
      SA: {
        sessions: 22, sched: 23, showed: 22, noShows: 0, cancels: 1, nextWeek: 25,
        status: 'track', points: '0,12 11,10 23,9 34,7 46,5',
        clients: [cl('Ana G.', 1, 1), cl('Ben H.', 1, 1)], note: 'Ahead of plan.',
      },
      IV: {
        sessions: 13, sched: 14, showed: 13, noShows: 1, cancels: 0, nextWeek: 15,
        status: 'track', points: '0,10 11,10 23,9 34,9 46,8',
        clients: [cl('Ella V.', 1, 1), cl('Rob C.', 1, 1)], note: 'Doing fine here.',
      },
      SM: {
        sessions: 18, sched: 19, showed: 18, noShows: 1, cancels: 0, nextWeek: 20,
        status: 'track', points: '0,11 11,10 23,9 34,9 46,8',
        clients: [cl('Pia N.', 1, 1), cl('Ivy R.', 1, 1)], note: 'Consistent.',
      },
    }),
  },
]
