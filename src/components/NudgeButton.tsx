import { color } from '../lib/tokens'

export function NudgeButton({
  firstName,
  nudged,
  onNudge,
  marginTop = 12,
}: {
  firstName: string
  nudged: boolean
  onNudge: () => void
  marginTop?: number
}) {
  return (
    <button
      onClick={onNudge}
      disabled={nudged}
      style={{
        marginTop,
        width: '100%',
        padding: '10px 16px',
        borderRadius: 9,
        fontSize: 13,
        fontWeight: 600,
        cursor: nudged ? 'default' : 'pointer',
        border: `1px solid ${nudged ? color.greenTintBorder : color.ink}`,
        background: nudged ? color.greenTintBg : color.ink,
        color: nudged ? color.green : '#fff',
      }}
    >
      {nudged ? `✓ Reminder sent to ${firstName}` : `Remind ${firstName} to check in`}
    </button>
  )
}
