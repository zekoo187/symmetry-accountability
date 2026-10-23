/**
 * Exercise lines and movement patterns.
 *
 * A coach types one exercise per line: "Back squat 5x5 185 lb". This module
 * reads those lines, maps each exercise to a movement pattern, and compares a
 * session against the client's previous session so the owner can see which
 * movements went up in load and which did not.
 */

export type Pattern = 'Squat' | 'Hinge' | 'Upper push' | 'Upper pull' | 'Core' | 'Conditioning' | 'Other'

export interface ExerciseLine {
  name: string
  sets: number | null
  reps: number | null
  load: number | null
  unit: string
  pattern: Pattern
  raw: string
}

const LINE_RE =
  /^(?<name>.+?)\s+(?<sets>\d+)\s*[x×]\s*(?<reps>\d+)(?:\s*(?<unit1>s|sec|m|min))?(?:\s*@?\s*(?<load>\d+(?:\.\d+)?)\s*(?<unit>lb|lbs|kg|s|sec|m)?)?\s*$/i

// Longest key wins; matched as a substring of the normalised exercise name.
const PATTERNS: [string, Pattern][] = [
  ['bulgarian split squat', 'Squat'],
  ['chest supported row', 'Upper pull'],
  ['romanian deadlift', 'Hinge'],
  ['single leg rdl', 'Hinge'],
  ['trap bar deadlift', 'Hinge'],
  ['hanging leg raise', 'Core'],
  ['single arm row', 'Upper pull'],
  ['overhead press', 'Upper push'],
  ['shoulder press', 'Upper push'],
  ['landmine press', 'Upper push'],
  ['dumbbell bench', 'Upper push'],
  ['incline bench', 'Upper push'],
  ['back extension', 'Hinge'],
  ['kettlebell swing', 'Hinge'],
  ['walking lunge', 'Squat'],
  ['reverse lunge', 'Squat'],
  ['suitcase carry', 'Core'],
  ['farmer carry', 'Core'],
  ['pallof press', 'Core'],
  ['lat pulldown', 'Upper pull'],
  ['dumbbell row', 'Upper pull'],
  ['glute bridge', 'Hinge'],
  ['good morning', 'Hinge'],
  ['goblet squat', 'Squat'],
  ['front squat', 'Squat'],
  ['split squat', 'Squat'],
  ['back squat', 'Squat'],
  ['hack squat', 'Squat'],
  ['box squat', 'Squat'],
  ['leg press', 'Squat'],
  ['bench press', 'Upper push'],
  ['cable chop', 'Core'],
  ['cable row', 'Upper pull'],
  ['seated row', 'Upper pull'],
  ['face pull', 'Upper pull'],
  ['hip thrust', 'Hinge'],
  ['side plank', 'Core'],
  ['dead bug', 'Core'],
  ['ab wheel', 'Core'],
  ['sled push', 'Conditioning'],
  ['sled pull', 'Conditioning'],
  ['intervals', 'Conditioning'],
  ['skillrun', 'Conditioning'],
  ['step up', 'Squat'],
  ['deadlift', 'Hinge'],
  ['pull up', 'Upper pull'],
  ['chin up', 'Upper pull'],
  ['push up', 'Upper push'],
  ['lunge', 'Squat'],
  ['squat', 'Squat'],
  ['plank', 'Core'],
  ['rower', 'Conditioning'],
  ['bike', 'Conditioning'],
  ['row', 'Upper pull'],
  ['dip', 'Upper push'],
  ['rdl', 'Hinge'],
]

export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function patternOf(name: string): Pattern {
  const n = normaliseName(name)
  for (const [key, p] of PATTERNS) {
    if (n.includes(key) || n.includes(key.replace(/s$/, '')) || n.includes(key + 's')) return p
  }
  return 'Other'
}

export function parseExercises(text: string): ExerciseLine[] {
  const out: ExerciseLine[] = []
  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.replace(/^[\s\-•]+/, '').trim()
    if (!line) continue
    const m = LINE_RE.exec(line)
    if (!m || !m.groups) {
      out.push({ name: line, sets: null, reps: null, load: null, unit: '', pattern: patternOf(line), raw: line })
      continue
    }
    const g = m.groups
    let load = g.load ? parseFloat(g.load) : null
    let unit = (g.unit || g.unit1 || '').toLowerCase().replace('lbs', 'lb').replace('sec', 's')
    // "Plank 3x45 s": the reps are the load, in seconds
    if (load === null && g.unit1) {
      load = parseInt(g.reps, 10)
      unit = g.unit1.toLowerCase().replace('sec', 's')
    }
    if (load !== null && !unit) unit = 'lb'
    out.push({
      name: g.name.trim(),
      sets: parseInt(g.sets, 10),
      reps: parseInt(g.reps, 10),
      load,
      unit,
      pattern: patternOf(g.name),
      raw: line,
    })
  }
  return out
}

export interface Progression {
  name: string
  pattern: Pattern
  from: number | null
  to: number | null
  unit: string
  change: 'up' | 'same' | 'down' | 'new'
}

/** Compare this session's loaded exercises with the previous session's. */
export function progressions(current: string, previous: string | null): Progression[] {
  const now = parseExercises(current).filter((e) => e.load !== null)
  const before = previous ? parseExercises(previous) : []
  const prevByName = new Map<string, ExerciseLine>()
  for (const e of before) if (e.load !== null) prevByName.set(normaliseName(e.name), e)
  return now.map((e) => {
    const p = prevByName.get(normaliseName(e.name))
    if (!p || p.load === null)
      return { name: e.name, pattern: e.pattern, from: null, to: e.load, unit: e.unit, change: 'new' }
    const change = e.load! > p.load ? 'up' : e.load! < p.load ? 'down' : 'same'
    return { name: e.name, pattern: e.pattern, from: p.load, to: e.load, unit: e.unit, change }
  })
}

/** "Squat + hinge" from the two most common patterns in a session. */
export function sessionPatterns(text: string): string {
  const counts = new Map<Pattern, number>()
  for (const e of parseExercises(text)) {
    if (e.pattern === 'Other') continue
    counts.set(e.pattern, (counts.get(e.pattern) ?? 0) + 1)
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([p]) => p)
  if (top.length === 0) return 'Session'
  return [top[0], ...top.slice(1).map((t) => t.toLowerCase())].join(' + ')
}
