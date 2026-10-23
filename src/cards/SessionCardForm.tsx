import { useEffect, useMemo, useState } from 'react'
import { color, font } from '../lib/tokens'
import type { CurrentUser } from '../lib/types'
import { cardsApi, todayISO, type ClientRef } from './cardsApi'
import { parseExercises } from './parse'
import {
  DAILY_HABITS,
  EMPTY_HABITS,
  EMPTY_WEEKLY,
  GRADES,
  WEEKLY_HABITS,
  type DailyHabitKey,
  type Grade,
  type Outcome,
  type Pain,
  type SessionCard,
  type SessionCardInput,
  type WeeklyHabitKey,
} from './types'

/**
 * The session card, typed in. One card, one client, one session. Mirrors the
 * paper card field for field so a coach can fill it from the card in their hand.
 */
export function SessionCardForm({
  user,
  clients,
  trainerId,
  existing,
  onSaved,
  onClose,
}: {
  user: CurrentUser
  clients: ClientRef[]
  trainerId: string
  existing?: SessionCard | null
  onSaved: (card: SessionCard) => void
  onClose: () => void
}) {
  const myClients = useMemo(() => clients.filter((c) => c.trainerId === trainerId), [clients, trainerId])

  const [clientId, setClientId] = useState(existing?.clientId ?? myClients[0]?.id ?? '')
  const [date, setDate] = useState(existing?.sessionDate ?? todayISO())
  const [outcome, setOutcome] = useState<Outcome>(existing?.outcome ?? 'completed')
  const [onTime, setOnTime] = useState<boolean | null>(existing?.onTime ?? true)
  const [readiness, setReadiness] = useState<number | null>(existing?.readiness ?? null)
  const [bodyweight, setBodyweight] = useState(existing?.bodyweight?.toString() ?? '')
  const [sleepH, setSleepH] = useState(existing?.sleepH?.toString() ?? '')
  const [pain, setPain] = useState<Pain>(existing?.pain ?? 'none')
  const [painWhere, setPainWhere] = useState(existing?.painWhere ?? '')
  const [daysSince, setDaysSince] = useState(existing?.daysSince?.toString() ?? '')
  const [homeDays, setHomeDays] = useState(existing?.homeDays?.toString() ?? '')
  const [habits, setHabits] = useState<Record<DailyHabitKey, number>>({
    ...EMPTY_HABITS,
    ...(existing?.habits ?? {}),
  })
  const [weekly, setWeekly] = useState<Record<WeeklyHabitKey, boolean>>({
    ...EMPTY_WEEKLY,
    ...(existing?.weekly ?? {}),
  })
  const [exercises, setExercises] = useState(existing?.exercises ?? '')
  const [rpe, setRpe] = useState<number | null>(existing?.rpe ?? null)
  const [grade, setGrade] = useState<Grade | null>(existing?.grade ?? null)
  const [win, setWin] = useState(existing?.win ?? '')
  const [nextBooked, setNextBooked] = useState<boolean | null>(existing?.nextBooked ?? null)
  const [nextDate, setNextDate] = useState(existing?.nextDate ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId && myClients[0]) setClientId(myClients[0].id)
  }, [clientId, myClients])

  const completed = outcome === 'completed'
  const days = Math.max(0, Math.min(31, parseInt(daysSince || '0', 10) || 0))
  const parsed = useMemo(() => parseExercises(exercises), [exercises])
  const unreadable = parsed.filter((e) => e.sets === null && e.raw.length > 0)

  const canSave =
    !!clientId && !!date && (!completed || (grade !== null && rpe !== null && nextBooked !== null))

  const submit = async () => {
    if (!canSave || saving) return
    setSaving(true)
    setError(null)
    const input: SessionCardInput = {
      id: existing?.id,
      trainerId,
      clientId,
      sessionDate: date,
      outcome,
      onTime: completed ? onTime : null,
      readiness: completed ? readiness : null,
      bodyweight: completed && bodyweight ? parseFloat(bodyweight) : null,
      sleepH: completed && sleepH ? parseFloat(sleepH) : null,
      pain: completed ? pain : 'none',
      painWhere: completed && pain !== 'none' ? painWhere.trim() : '',
      daysSince: completed ? days : null,
      homeDays: completed ? clamp(homeDays, days) : null,
      habits: completed ? habits : {},
      weekly: completed ? weekly : {},
      exercises: completed ? exercises.trim() : '',
      rpe: completed ? rpe : null,
      grade: completed ? grade : null,
      win: completed ? win.trim() : '',
      nextBooked,
      nextDate: nextDate || null,
      notes: notes.trim(),
      photoFile: photo,
    }
    try {
      const saved = await cardsApi.saveCard(user, input)
      onSaved(saved)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the card')
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Session card"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'rgba(35,32,28,.45)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        overflowY: 'auto',
        padding: '12px 0 40px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: '#fff',
          borderRadius: 16,
          margin: '0 10px',
          fontFamily: font.body,
          color: color.ink,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: `1px solid ${color.borderSoft}`,
          }}
        >
          <div>
            <div className="sg" style={{ fontWeight: 700, fontSize: 16 }}>
              {existing ? 'Edit session card' : 'Session card'}
            </div>
            <div style={{ fontSize: 12, color: color.muted }}>One card, one client, one session</div>
          </div>
          <button type="button" onClick={onClose} style={linkBtn}>
            Close
          </button>
        </div>

        <div style={{ padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Row>
            <Field label="Client">
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={input}>
                {myClients.length === 0 && <option value="">Add a client first</option>}
                {myClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={input} />
            </Field>
          </Row>

          <Field label="Outcome">
            <Segment
              value={outcome}
              options={[
                ['completed', 'Completed'],
                ['no_show', 'No-show'],
                ['cancelled', 'Cancelled'],
              ]}
              onChange={(v) => setOutcome(v as Outcome)}
            />
          </Field>

          {completed && (
            <>
              <Section title="Start of session · ask, then tick">
                <Row>
                  <Field label="On time">
                    <Segment
                      value={onTime === null ? '' : onTime ? 'yes' : 'no'}
                      options={[
                        ['yes', 'Yes'],
                        ['no', 'No'],
                      ]}
                      onChange={(v) => setOnTime(v === 'yes')}
                    />
                  </Field>
                  <Field label="Readiness · 1 wrecked, 5 best day">
                    <Scale value={readiness} min={1} max={5} onChange={setReadiness} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Bodyweight (lb), if measured">
                    <input inputMode="decimal" value={bodyweight} onChange={(e) => setBodyweight(e.target.value)} style={input} placeholder="—" />
                  </Field>
                  <Field label="Sleep last night (h)">
                    <input inputMode="decimal" value={sleepH} onChange={(e) => setSleepH(e.target.value)} style={input} placeholder="—" />
                  </Field>
                </Row>
                <Field label="Pain or injury check">
                  <Segment
                    value={pain}
                    options={[
                      ['none', 'None'],
                      ['modified', 'Something, modified'],
                      ['flag', 'Flag for Ahmed'],
                    ]}
                    onChange={(v) => setPain(v as Pain)}
                  />
                </Field>
                {pain !== 'none' && (
                  <Field label="Where">
                    <input value={painWhere} onChange={(e) => setPainWhere(e.target.value)} style={input} placeholder="e.g. left hip, front" />
                  </Field>
                )}
              </Section>

              <Section title="Habits since last session · ask, then tick days hit">
                <Row>
                  <Field label="Days since last session">
                    <input inputMode="numeric" value={daysSince} onChange={(e) => setDaysSince(e.target.value)} style={input} placeholder="0" />
                  </Field>
                  <Field label="Home routine · days done">
                    <input inputMode="numeric" value={homeDays} onChange={(e) => setHomeDays(e.target.value)} style={input} placeholder="0" />
                  </Field>
                </Row>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {DAILY_HABITS.map((h) => (
                    <div key={h.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, fontSize: 13 }}>
                        {h.label} <span style={{ color: color.muted, fontSize: 11.5 }}>· {h.target}</span>
                      </div>
                      <DayPicker
                        value={habits[h.key]}
                        max={days}
                        onChange={(n) => setHabits((prev) => ({ ...prev, [h.key]: n }))}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                  {WEEKLY_HABITS.map((h) => (
                    <div key={h.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, fontSize: 13 }}>
                        {h.label} <span style={{ color: color.muted, fontSize: 11.5 }}>· {h.target}</span>
                      </div>
                      <Segment
                        value={weekly[h.key] ? 'yes' : 'no'}
                        options={[
                          ['yes', 'On target'],
                          ['no', 'Not yet'],
                        ]}
                        onChange={(v) => setWeekly((prev) => ({ ...prev, [h.key]: v === 'yes' }))}
                        compact
                      />
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="The work · one exercise per line">
                <textarea
                  value={exercises}
                  onChange={(e) => setExercises(e.target.value)}
                  rows={5}
                  placeholder={'Back squat 5x5 185 lb\nSingle arm row 4x8 40 lb\nPlank 3x45 s\nPush up 3x10'}
                  style={{ ...input, fontFamily: 'ui-monospace, Menlo, Consolas, monospace', resize: 'vertical' }}
                />
                <div style={{ fontSize: 11.5, color: color.muted }}>
                  Name, then sets x reps, then the load with its unit.
                  {unreadable.length > 0 && (
                    <span style={{ color: color.amber }}>
                      {' '}
                      {unreadable.length} line{unreadable.length > 1 ? 's' : ''} kept as plain text.
                    </span>
                  )}
                </div>
              </Section>

              <Section title="End of session">
                <Field label="Effort (RPE)">
                  <Scale value={rpe} min={5} max={10} onChange={setRpe} />
                </Field>
                <Field label="Quality grade">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {GRADES.map((g) => {
                      const on = grade === g.key
                      return (
                        <button
                          key={g.key}
                          type="button"
                          onClick={() => setGrade(g.key)}
                          style={{
                            textAlign: 'left',
                            padding: '8px 10px',
                            borderRadius: 9,
                            border: `1px solid ${on ? color.ink : color.border}`,
                            background: on ? color.ink : '#fff',
                            color: on ? '#fff' : color.ink,
                            cursor: 'pointer',
                            fontFamily: font.body,
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{g.label}</div>
                          <div style={{ fontSize: 11, opacity: 0.8 }}>{g.hint}</div>
                        </button>
                      )
                    })}
                  </div>
                </Field>
                <Field label="Win of the day · a number they take home">
                  <input value={win} onChange={(e) => setWin(e.target.value)} style={input} placeholder="Squat 185 for 5" />
                </Field>
              </Section>
            </>
          )}

          <Section title="Next session · booked before they leave">
            <Row>
              <Field label="Booked">
                <Segment
                  value={nextBooked === null ? '' : nextBooked ? 'yes' : 'no'}
                  options={[
                    ['yes', 'Yes'],
                    ['no', 'No'],
                  ]}
                  onChange={(v) => setNextBooked(v === 'yes')}
                />
              </Field>
              <Field label="Date">
                <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} style={input} />
              </Field>
            </Row>
          </Section>

          <Section title="Photo of the card">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              style={{ fontSize: 13 }}
            />
            <div style={{ fontSize: 11.5, color: color.muted }}>
              {existing?.photoPath && !photo ? 'A photo is already attached. Pick a new one to replace it.' : 'Shrunk on your phone before upload.'}
            </div>
          </Section>

          <Field label="Notes (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...input, resize: 'vertical' }} />
          </Field>

          {error && <div style={{ color: color.red, fontSize: 13 }}>{error}</div>}

          <button
            type="button"
            disabled={!canSave || saving}
            onClick={submit}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              background: canSave ? color.ink : color.arrowDisabled,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: canSave && !saving ? 'pointer' : 'default',
              fontFamily: font.body,
            }}
          >
            {saving ? 'Saving…' : existing ? 'Save changes' : 'Upload card'}
          </button>
          {completed && !canSave && (
            <div style={{ fontSize: 11.5, color: color.muted, textAlign: 'center' }}>
              Needs a client, effort, grade, and whether the next session is booked.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function clamp(v: string, max: number): number {
  const n = parseInt(v || '0', 10)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(n, Math.max(max, 0))
}

const input: React.CSSProperties = {
  width: '100%',
  padding: '9px 11px',
  borderRadius: 9,
  border: `1px solid ${color.border}`,
  fontSize: 14,
  fontFamily: font.body,
  background: '#fff',
  boxSizing: 'border-box',
}

const linkBtn: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: color.muted,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: font.body,
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{children}</div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  // A div, not a label: a label wrapping several buttons would make the first
  // button's accessible name the whole label text and steal clicks on the text.
  return (
    <div style={{ minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 11.5, color: color.muted, marginBottom: 4 }}>{label}</span>
      {children}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        border: `1px solid ${color.borderSoft}`,
        borderRadius: 12,
        padding: '10px 12px 12px',
        background: color.surfaceMuted,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: color.text3 }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Segment({
  value,
  options,
  onChange,
  compact,
}: {
  value: string
  options: [string, string][]
  onChange: (v: string) => void
  compact?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {options.map(([v, label]) => {
        const on = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            style={{
              padding: compact ? '5px 9px' : '8px 11px',
              borderRadius: 8,
              border: `1px solid ${on ? color.ink : color.border}`,
              background: on ? color.ink : '#fff',
              color: on ? '#fff' : color.ink,
              fontSize: compact ? 12 : 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: font.body,
              flex: compact ? 'none' : 1,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function Scale({
  value,
  min,
  max,
  onChange,
}: {
  value: number | null
  min: number
  max: number
  onChange: (v: number) => void
}) {
  const vals: number[] = []
  for (let i = min; i <= max; i++) vals.push(i)
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {vals.map((v) => {
        const on = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              border: `1px solid ${on ? color.ink : color.border}`,
              background: on ? color.ink : '#fff',
              color: on ? '#fff' : color.ink,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              fontFamily: font.display,
            }}
          >
            {v}
          </button>
        )
      })}
    </div>
  )
}

/** 0..max day boxes; tapping box n sets n days hit. */
function DayPicker({ value, max, onChange }: { value: number; max: number; onChange: (n: number) => void }) {
  const boxes = Math.max(max, 1)
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {Array.from({ length: Math.min(boxes, 14) }, (_, i) => i + 1).map((n) => {
        const on = n <= value
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} days`}
            onClick={() => onChange(on && n === value ? n - 1 : n)}
            style={{
              width: 20,
              height: 20,
              borderRadius: 5,
              border: `1px solid ${on ? color.green : color.border}`,
              background: on ? color.green : '#fff',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        )
      })}
      <span style={{ fontSize: 12, color: color.muted, minWidth: 34, textAlign: 'right' }}>
        {value}/{max}
      </span>
    </div>
  )
}
