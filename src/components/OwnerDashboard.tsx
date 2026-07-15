import { useMemo, useState } from 'react'
import { useData } from '../data/DataContext'
import { useAuth } from '../auth/AuthContext'
import { deriveWeek } from '../lib/derive'
import { useIsMobile } from '../lib/useViewport'
import type { CurrentUser } from '../lib/types'
import { DesktopDashboard } from './DesktopDashboard'
import { MobileDashboard } from './MobileDashboard'
import { DetailDrawer, type DrawerState } from './DetailDrawer'

const NAV_TO_DRAWER: Record<string, DrawerState | null> = {
  Overview: null,
  Trainers: { kind: 'stat', id: 'showrate' },
  'Check-ins': { kind: 'stat', id: 'checkins' },
  Sessions: { kind: 'stat', id: 'sessions' },
  Wins: { kind: 'win', id: 0 },
}

export function OwnerDashboard({ user }: { user: CurrentUser }) {
  const { weeks, checks, nudged, toggleCheck, sendReminder, sendReminders } = useData()
  const { signOut } = useAuth()
  const isMobile = useIsMobile()

  const [weekIdx, setWeekIdx] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeNav, setActiveNav] = useState('Overview')
  const [drawer, setDrawer] = useState<DrawerState | null>(null)

  const week = weeks[weekIdx]

  const { members, totals } = useMemo(
    () => deriveWeek(week, weekIdx, checks, expandedId),
    [week, weekIdx, checks, expandedId],
  )

  const canPrev = weekIdx < weeks.length - 1
  const canNext = weekIdx > 0

  const prevWeek = () => {
    if (!canPrev) return
    setWeekIdx((i) => i + 1)
    setExpandedId(null)
  }
  const nextWeek = () => {
    if (!canNext) return
    setWeekIdx((i) => i - 1)
    setExpandedId(null)
  }

  const flaggedIds = members.filter((m) => m.flagged).map((m) => m.id)
  const allFlaggedNudged =
    flaggedIds.length > 0 && flaggedIds.every((id) => nudged[`${weekIdx}:${id}`])
  const nudgeAllLabel =
    totals.flagged === 0
      ? 'All on track 🎉'
      : allFlaggedNudged
        ? '✓ Reminders sent'
        : `Send reminders (${totals.flagged})`

  const onNav = (label: string) => {
    setActiveNav(label)
    const d = NAV_TO_DRAWER[label]
    setDrawer(d ?? null)
  }

  const handleToggleCheck = (
    trainerId: string,
    clientName: string,
    field: 'water' | 'weekly',
    next: boolean,
  ) => toggleCheck(weekIdx, trainerId, clientName, field, next)

  return (
    <>
      {isMobile ? (
        <MobileDashboard
          week={week}
          members={members}
          totals={totals}
          weekIdx={weekIdx}
          expandedId={expandedId}
          nudged={nudged}
          canPrev={canPrev}
          canNext={canNext}
          onPrevWeek={prevWeek}
          onNextWeek={nextWeek}
          onToggleExpand={(id) => setExpandedId((cur) => (cur === id ? null : id))}
          onOpenWin={(i) => setDrawer({ kind: 'win', id: i })}
          onToggleCheck={handleToggleCheck}
          onNudge={(id) => sendReminder(weekIdx, id)}
          onSignOut={signOut}
        />
      ) : (
        <DesktopDashboard
          week={week}
          members={members}
          totals={totals}
          activeNav={activeNav}
          ownerName={user.displayName}
          canPrev={canPrev}
          canNext={canNext}
          nudgeAllLabel={nudgeAllLabel}
          onPrevWeek={prevWeek}
          onNextWeek={nextWeek}
          onNav={onNav}
          onOpenDrawer={setDrawer}
          onNudgeAll={() => sendReminders(weekIdx, flaggedIds)}
          onSignOut={signOut}
        />
      )}

      {drawer && (
        <DetailDrawer
          drawer={drawer}
          week={week}
          weekIdx={weekIdx}
          members={members}
          totals={totals}
          nudged={nudged}
          onClose={() => {
            setDrawer(null)
            setActiveNav('Overview')
          }}
          onToggleCheck={handleToggleCheck}
          onNudge={(id) => sendReminder(weekIdx, id)}
        />
      )}
    </>
  )
}
