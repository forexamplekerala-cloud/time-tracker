import { countsAsProductive, resolveDurationMinutes } from '@/lib/entries/summary'

function fmt(mins: number): string {
  const hours = Math.floor(mins / 60)
  const m = mins % 60
  return hours > 0 ? `${hours}h ${m}m` : `${m}m`
}

export function getTruthLine(distractionMins: number, productiveMins: number, fuelMins: number = 0, isToday: boolean = true): string {  const todayStr = isToday ? " today" : ""

  if (distractionMins === 0 && productiveMins === 0 && fuelMins === 0) return "No time logged yet."
  if (productiveMins === 0 && distractionMins === 0 && fuelMins > 0) return `Only ${fmt(fuelMins)} of fuel logged${todayStr}. No deep work, no distraction recorded yet — the day is still unwritten.`
  if (productiveMins === 0 && fuelMins > 0 && distractionMins > 0) return `${fmt(distractionMins)} lost${todayStr} against ${fmt(fuelMins)} of fuel and zero deep work.`
  if (distractionMins === 0) return "A rare zero-distraction day. Well executed."
  if (distractionMins > 120) return `You gave distraction ${fmt(distractionMins)}${todayStr} — that's more than a full trading session.`
  if (distractionMins > 60) return `You gave distraction ${fmt(distractionMins)}${todayStr} — almost the client call you skipped.`
  return `You gave distraction ${fmt(distractionMins)}${todayStr} — a small leak, but keep it tight.`
}

type InsightEntry = {
  category: string | null
  activity: string | null
  impact_rating: string | null
  duration_minutes: number | string | null
  start_time: string | null
  end_time: string | null
}

// Deterministic insight "quotes" for the Audit Report.
// NEVER AI-generated — string templates computed from logged data only (hard rule).
// Unlogged time belongs to the verdict (getVoidLine) — never duplicated here.
export function getInsights(entries: InsightEntry[]): string[] {
  const insights: string[] = []

  // 1. Biggest leak — top Distraction activity by total minutes (aggregated)
  const leakTotals = new Map<string, { label: string; minutes: number }>()
  for (const e of entries) {
    if (e.category !== 'Distraction') continue
    const mins = resolveDurationMinutes(e.duration_minutes, e.start_time, e.end_time) || 0
    if (mins <= 0) continue
    const label = (e.activity || 'Unlisted activity').trim()
    const key = label.toLowerCase()
    const prev = leakTotals.get(key)
    leakTotals.set(key, { label, minutes: (prev?.minutes || 0) + mins })
  }
  const topLeak = Array.from(leakTotals.values()).sort((a, b) => b.minutes - a.minutes)[0]
  if (topLeak) {
    insights.push(`Biggest leak: "${topLeak.label}" took ${fmt(topLeak.minutes)}.`)
  }

  // 2. Longest focus block — biggest single productive entry (gym rule respected via countsAsProductive)
  let deepest: { label: string; minutes: number } | null = null
  for (const e of entries) {
    if (!countsAsProductive(e.category, e.activity, e.impact_rating)) continue
    const mins = resolveDurationMinutes(e.duration_minutes, e.start_time, e.end_time) || 0
    if (mins > 0 && (!deepest || mins > deepest.minutes)) {
      deepest = { label: (e.activity || 'Deep work').trim(), minutes: mins }
    }
  }
  if (deepest) {
    insights.push(`Longest focus block: "${deepest.label}" — ${fmt(deepest.minutes)} unbroken.`)
  }

  return insights
}

type VoidBuckets = {
  productive: number
  distraction: number
  fuel: number
  unclear: number
}

export type VoidVerdict = {
  // Main truth line, reads as a continuation of the huge number above it.
  line: string
  // Sub-line (what IS on record). Rendered smaller, stone grey.
  detail: string | null
  // Trigger phrase to render heavy. Null for positive outcomes — never bold those.
  emphasis: string | null
}

// The Void verdict — the gut-punch number on /today.
// Deterministic template (hard rule: never AI-generated).
// Unknown time is a blank, never "wasted".
export function getVoidLine(
  unloggedMins: number,
  buckets: VoidBuckets,
  isToday: boolean = true
): VoidVerdict {
  const totalLogged = buckets.productive + buckets.distraction + buckets.fuel + buckets.unclear
  const scope = isToday ? 'your day so far' : 'the day'

  if (totalLogged === 0) {
    return {
      line: `Nothing written yet. ${isToday ? "Today's" : 'That'} page is completely blank.`,
      detail: null,
      emphasis: 'completely blank',
    }
  }

  // Name the dominant logged bucket (deterministic tie-break: first max in fixed order)
  const named = [
    { label: 'deep work', mins: buckets.productive },
    { label: 'Fuel', mins: buckets.fuel },
    { label: 'Distraction', mins: buckets.distraction },
    { label: 'unclear time', mins: buckets.unclear },
  ].sort((a, b) => b.mins - a.mins)[0]

  const nonZeroBuckets = [buckets.productive, buckets.fuel, buckets.distraction, buckets.unclear].filter(
    (m) => m > 0
  ).length
  const loggedPart =
    nonZeroBuckets === 1
      ? `You logged ${fmt(named.mins)} of ${named.label}.`
      : `You logged ${fmt(totalLogged)} — mostly ${named.label} (${fmt(named.mins)}).`

  if (unloggedMins >= 480) {
    return {
      line: `of ${scope} is a complete blank.`,
      detail: loggedPart,
      emphasis: 'a complete blank',
    }
  }
  if (unloggedMins >= 120) {
    return {
      line: `of ${scope} is still a blank.`,
      detail: loggedPart,
      emphasis: 'still a blank',
    }
  }
  if (unloggedMins > 0) {
    return {
      line: 'is all that remains blank.',
      detail: `You wrote ${fmt(totalLogged)} of ${scope}.`,
      emphasis: 'all that remains blank',
    }
  }
  return {
    line: `Every minute of ${scope} is on record.`,
    detail: 'Nothing hidden, nothing unknown.',
    emphasis: null,
  }
}
