import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { recomputeDailySummary, resolveDurationMinutes } from '@/lib/entries/summary'

const ALLOWED_CATEGORIES = [
  'Trading/Deep Work',
  'Agency/Business',
  'Life/Fuel',
  'Distraction',
  'Unclear'
]

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    if (!id) {
      return NextResponse.json({ error: 'Missing entry ID' }, { status: 400 })
    }

    // 1. Verify ownership securely using the authenticated client
    const { data: entryData, error: entryError } = await supabase
      .from('time_entries')
      .select('id, date')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (entryError || !entryData) {
      return NextResponse.json({ error: 'Entry not found or unauthorized' }, { status: 404 })
    }

    // 2. Use admin client to bypass RLS for ai_feedback since it lacks a user_id column
    // Now safe because we already verified the entry belongs to the user
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: feedbackError } = await supabaseAdmin
      .from('ai_feedback')
      .delete()
      .eq('entry_id', id)

    // Best-effort: a feedback cleanup failure must not block the entry deletion
    if (feedbackError) {
      console.error('Error deleting ai_feedback (continuing):', feedbackError)
    }

    // 3. Delete the actual entry
    const { error: deleteError } = await supabase
      .from('time_entries')
      .delete()
      .match({ id, user_id: user.id })

    if (deleteError) {
      console.error('Error deleting entry:', deleteError)
      return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
    }

    // 4. Recompute daily_summaries for the date of the deleted entry
    try {
      await recomputeDailySummary(supabase, user.id, entryData.date)
    } catch (e: any) {
      console.error('Error updating daily_summary after deletion:', e.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE entry:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Missing entry ID' }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // Strict whitelist of mutable fields — prevents mass-assignment
    const sanitizedUpdates: Record<string, any> = {}

    if (typeof body.activity === 'string') {
      const trimmed = body.activity.trim()
      if (trimmed.length > 0) {
        sanitizedUpdates.activity = trimmed.slice(0, 500)
      }
    }

    if (typeof body.category === 'string' && ALLOWED_CATEGORIES.includes(body.category)) {
      sanitizedUpdates.category = body.category
    }

    if (body.start_time !== undefined) {
      if (body.start_time === null || body.start_time === '') {
        sanitizedUpdates.start_time = null
      } else if (typeof body.start_time === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(body.start_time)) {
        sanitizedUpdates.start_time = body.start_time.padStart(5, '0')
      }
    }

    if (body.end_time !== undefined) {
      if (body.end_time === null || body.end_time === '') {
        sanitizedUpdates.end_time = null
      } else if (typeof body.end_time === 'string' && /^([01]?\d|2[0-3]):[0-5]\d$/.test(body.end_time)) {
        sanitizedUpdates.end_time = body.end_time.padStart(5, '0')
      }
    }

    if (body.impact_rating !== undefined) {
      if (body.impact_rating === null || body.impact_rating === 'good' || body.impact_rating === 'mid' || body.impact_rating === 'bad') {
        sanitizedUpdates.impact_rating = body.impact_rating
      }
    }

    if (body.duration_minutes !== undefined) {
      if (body.duration_minutes === null) {
        sanitizedUpdates.duration_minutes = null
      } else if (typeof body.duration_minutes === 'number' && !isNaN(body.duration_minutes) && body.duration_minutes >= 0) {
        sanitizedUpdates.duration_minutes = Math.round(body.duration_minutes)
      }
    }

    // Auto-recalculate duration if start and end are provided and duration was not explicitly sent
    if (sanitizedUpdates.start_time && sanitizedUpdates.end_time && sanitizedUpdates.duration_minutes === undefined) {
      sanitizedUpdates.duration_minutes = resolveDurationMinutes(null, sanitizedUpdates.start_time, sanitizedUpdates.end_time)
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided for update' }, { status: 400 })
    }

    const { data: entryData, error: entryError } = await supabase
      .from('time_entries')
      .update(sanitizedUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('date')
      .single()

    if (entryError || !entryData) {
      console.error('Error updating entry:', entryError)
      return NextResponse.json({ error: 'Entry not found, unauthorized, or update failed' }, { status: 404 })
    }

    // Recompute daily_summaries for the date of the updated entry
    try {
      await recomputeDailySummary(supabase, user.id, entryData.date)
    } catch (e: any) {
      console.error('Error updating daily_summary after edit:', e.message)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH entry:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
