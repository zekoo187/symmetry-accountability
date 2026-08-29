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
  const growth: string[] = []
  if (totals.newClients > 0) growth.push(`+${totals.newClients} new client${totals.newClients === 1 ? '' : 's'}`)
  if (totals.atRisk > 0) growth.push(`${totals.atRisk} at-risk`)
  if (totals.lost > 0) growth.push(`${totals.lost} lost`)
  if (growth.length) lines.push(growth.join(' · '))
  lines.push('')

  // retention — clients flagged at-risk or lost, grouped by trainer
  const retentionLines = members
    .filter((m) => m.atRisk > 0 || m.lost > 0)
    .map((m) => {
      const parts: string[] = []
      const atRiskNames = m.clients.filter((c) => c.retention === 'at_risk').map((c) => c.name)
      const lostNames = m.clients.filter((c) => c.retention === 'lost').map((c) => c.name)
      if (atRiskNames.length) parts.push(`at-risk: ${atRiskNames.join(', ')}`)
      if (lostNames.length) parts.push(`lost: ${lostNames.join(', ')}`)
      return `• ${m.name} — ${parts.join(' · ')}`
    })
  if (retentionLines.length) {
    lines.push('🔻 Retention watch:')
    lines.push(...retentionLines)
    lines.push('')
  }

  // who needs attention — behind before at-risk, longer streaks first
  const severity = (m: DerivedMember) => (m.status === 'behind' ? 100 : 50) + m.streak
  const flagged = members.filter((m) => m.flagged).sort((a, b) => severity(b) - severity(a))
  if (flagged.length) {
    lines.push('⚠️ Needs attention:')
    for (const m of flagged) {
      const bits: string[] = [`${m.showRatePct} show`]
      if (m.totalClients > 0) bits.push(`check-ins ${m.checkinText}`)
      if (m.noShows + m.cancels > 0) bits.push(`${m.noShows + m.cancels} no-show/cancel`)
      const streak = m.streakLabel ? ` · ${m.streakLabel} running` : ''
      lines.push(`• ${m.name} — ${bits.join(', ')}${streak}`)
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

  // trainers who reported but skipped weekly actions
  const incompleteActions = members.filter(
    (m) => (m.sessions > 0 || m.totalClients > 0) && m.checklistDone < m.checklistTotal,
  )
  if (incompleteActions.length) {
    lines.push(
      `☑️ Actions outstanding: ${incompleteActions
        .map((m) => `${m.name} (${m.checklistDone}/${m.checklistTotal})`)
        .join(', ')}`,
    )
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
