type EntryRow = {
  category: string | null
  activity: string | null
  impact_rating: string | null
  duration_minutes: number | string | null
  start_time: string | null
  end_time: string | null
}

// User rule (2026-09-10): gym — and ONLY gym — counts toward Productive when rated 'Good'.
// Every other Life/Fuel entry stays Fuel regardless of rating.
const GYM_PATTERN = /gym/i

export function countsAsProductive(
  category: string | null | undefined,
  activity: string | null | undefined,
  impactRating: string | null | undefined
): boolean {
  if (category === 'Trading/Deep Work' || category === 'Agency/Business') return true
  if (category === 'Life/Fuel' && impactRating === 'good' && activity && GYM_PATTERN.test(activity)) return true
  return false
}

export function resolveDurationMinutes(
  durationMinutes: number | string | null | undefined,
  startTime: string | null | undefined,
  endTime: string | null | undefined
): number | null {
  if (durationMinutes !== null && durationMinutes !== undefined) {
    const n = typeof durationMinutes === 'number' ? durationMinutes : parseInt(String(durationMinutes), 10)
    if (!isNaN(n) && n > 0) return n
  }
  if (startTime && endTime) {
    const [h1, m1] = startTime.split(':').map(Number)
    const [h2, m2] = endTime.split(':').map(Number)
    if (!isNaN(h1) && !isNaN(m1) && !isNaN(h2) && !isNaN(m2)) {
      let m = (h2 * 60 + m2) - (h1 * 60 + m1)
      if (m < 0) m += 24 * 60
      return m
    }
  }
  return null
}

export async function recomputeDailySummary(supabase: any, userId: string, date: string) {
  const { data: allEntriesForDay, error } = await supabase
    .from('time_entries')
    .select('category, activity, impact_rating, duration_minutes, start_time, end_time')
    .eq('user_id', userId)
    .eq('date', date)

  if (error) throw new Error(error.message)

  let productive = 0, distraction = 0, fuel = 0, unclear = 0
  for (const e of (allEntriesForDay || []) as EntryRow[]) {
    const mins = resolveDurationMinutes(e.duration_minutes, e.start_time, e.end_time) || 0
    if (countsAsProductive(e.category, e.activity, e.impact_rating)) productive += mins
    else if (e.category === 'Distraction') distraction += mins
    else if (e.category === 'Life/Fuel') fuel += mins
    else if (e.category === 'Unclear') unclear += mins
  }
  // Unclear time IS logged (just unknown) — it never counts as unlogged.
  const unlogged = Math.max(0, 24 * 60 - (productive + distraction + fuel + unclear))

  const { error: upsertError } = await supabase
    .from('daily_summaries')
    .upsert(
      {
        user_id: userId,
        date,
        productive_minutes: productive,
        distraction_minutes: distraction,
        fuel_minutes: fuel,
        unlogged_minutes: unlogged,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,date' }
    )

  if (upsertError) throw new Error(upsertError.message)
  return { productive, distraction, fuel, unlogged }
}
