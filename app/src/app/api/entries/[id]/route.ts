import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { recomputeDailySummary } from '@/lib/entries/summary'

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
