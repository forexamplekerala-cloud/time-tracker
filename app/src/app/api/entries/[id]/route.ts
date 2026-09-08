import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

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

    // Use admin client to bypass RLS for ai_feedback since it lacks a user_id column
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // First delete any associated ai_feedback to prevent foreign key errors
    const { error: feedbackError } = await supabaseAdmin
      .from('ai_feedback')
      .delete()
      .eq('entry_id', id)

    if (feedbackError) {
      console.error('Error deleting ai_feedback:', feedbackError)
      return NextResponse.json({ error: 'Failed to delete linked feedback' }, { status: 500 })
    }

    // Then delete the actual entry, ensuring it belongs to the user
    const { error: deleteError } = await supabase
      .from('time_entries')
      .delete()
      .match({ id, user_id: user.id })

    if (deleteError) {
      console.error('Error deleting entry:', deleteError)
      return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE entry:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
