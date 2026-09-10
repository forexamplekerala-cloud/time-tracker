import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { recomputeDailySummary } from '@/lib/entries/summary'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { date, entries } = await req.json()

    if (!date || !entries || !Array.isArray(entries)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    const entriesToInsert = entries.map((e: any) => ({
      user_id: user.id,
      date,
      start_time: e.start_time || null,
      end_time: e.end_time || null,
      duration_minutes: typeof e.duration_minutes === 'number' ? e.duration_minutes : null,
      category: e.category,
      activity: e.activity,
      source: 'ai',
      confidence: e.confidence,
      needs_review: typeof e.needs_review === 'boolean' ? e.needs_review : null,
      impact_rating: (e.impact_rating === 'good' || e.impact_rating === 'mid' || e.impact_rating === 'bad') ? e.impact_rating : null
    }))

    const { data: insertedEntries, error: insertError } = await supabase
      .from('time_entries')
      .insert(entriesToInsert)
      .select()

    if (insertError) {
      console.error(insertError)
      return NextResponse.json({ error: 'Failed to insert entries' }, { status: 500 })
    }

    // Feedback rows for entries the user corrected or flagged; summary recompute runs in parallel.
    const feedbackEntries = entries.filter((e: any) => e.ai_misread || e.edited)
    const feedbackPromise = feedbackEntries.length > 0
      ? supabase.from('ai_feedback').insert(
          feedbackEntries.map((e: any, index: number) => ({
            entry_id: insertedEntries.find(dbE => dbE.activity === e.activity && dbE.category === e.category)?.id || insertedEntries[index].id,
            accepted: false,
            corrected_fields: {
              note: e.ai_misread ? "Marked as misread by user" : "Edited by user",
              violations: e.violations || [],
              impact_rating: e.impact_rating ?? null
            }
          }))
        )
      : Promise.resolve({ error: null })

    const [feedbackResult, summary] = await Promise.all([
      feedbackPromise,
      recomputeDailySummary(supabase, user.id, date)
    ])

    if (feedbackResult.error) {
      console.error('Error inserting ai_feedback:', feedbackResult.error)
    }

    return NextResponse.json({ success: true, summary })
  } catch (error) {
    console.error('Error saving data:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
