import type { DerivedMember, WeekTotals } from './derive'
import type { Week } from './types'

/**
 * Build a plain-text weekly recap for pasting into a group chat.
 * Leads with what needs attention, keeps it short, ends on the positives.
 */
export function buildWeeklySummary(
  week: Week,
  members: DerivedMember[],
  totals: WeekTotals,
): string {
  const anyReported = members.some(
    (m) => m.sessions > 0 || m.noShows > 0 || m.cancels > 0 || m.totalClients > 0,
  )
  if (!anyReported) {
    return `📋 Symmetry — ${week.short}\n\nNothing logged yet this week. Reminder to fill in your sessions + client check-ins 🙏`
  }

  const lines: string[] = [`📋 Symmetry — ${week.short}`, '']

  // headline team numbers
  lines.push(
    `Team: ${totals.sessions} sessions · ${totals.showRate}% show rate · ${totals.noShows} no-shows/cancels`,
  )
  lines.push('')

  // who needs attention (behind first, then at-risk)
  const flagged = members
    .filter((m) => m.flagged)
    .sort((a, b) => (a.status === 'behind' ? -1 : 1) - (b.status === 'behind' ? -1 : 1))
  if (flagged.length) {
    lines.push('⚠️ Needs attention:')
    for (const m of flagged) {
      const bits: string[] = [`${m.showRatePct} show`]
      if (m.totalClients > 0) bits.push(`check-ins ${m.checkinText}`)
      if (m.noShows + m.cancels > 0) bits.push(`${m.noShows + m.cancels} no-show/cancel`)
      lines.push(`• ${m.name} — ${bits.join(', ')}`)
    }
    lines.push('')
  }

  // on-track trainers, named briefly
  const onTrack = members.filter((m) => !m.flagged && (m.sessions > 0 || m.totalClients > 0))
  if (onTrack.length) {
    lines.push(`✅ On track: ${onTrack.map((m) => m.name).join(', ')}`)
    lines.push('')
  }

  // wins to celebrate
  if (week.wins.length) {
    lines.push('🏆 Wins:')
    for (const w of week.wins) lines.push(`• ${w.stat} — ${w.text}`)
    lines.push('')
  }

  // trailing nudge if anyone hasn't reported
  const notReported = members.filter(
    (m) => m.sessions === 0 && m.noShows === 0 && m.cancels === 0 && m.totalClients === 0,
  )
  if (notReported.length) {
    lines.push(`Still to report: ${notReported.map((m) => m.name).join(', ')} 🙏`)
  }

  return lines.join('\n').trim()
}
