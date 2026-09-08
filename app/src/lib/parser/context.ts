import { createClient } from '@/utils/supabase/server'

export async function getUserLexicon(userId: string): Promise<string> {
  const supabase = createClient()

  // 1. Check if user has >= 10 corrections
  const { count, error } = await supabase
    .from('ai_feedback')
    .select('*', { count: 'exact', head: true })
    
  if (error || count === null || count < 10) {
    return ''
  }

  // 2. Fetch recent corrections (mocking the join for simplicity)
  // In a real app, this would be a custom RPC or complex join to get corrected activities
  // to their final categories. 
  // For Phase 1 / MVP, we will just return a static mock if they pass the gate,
  // or a basic query if we implement the full schema.
  
  const { data: recentEntries } = await supabase
    .from('time_entries')
    .select('activity, category')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
    
  if (!recentEntries) return ''

  // Aggregate frequencies
  const freq: Record<string, string> = {}
  recentEntries.forEach(e => {
    if (e.activity && e.category) {
       freq[e.activity.toLowerCase()] = e.category
    }
  })
  
  const rules = Object.entries(freq).map(([act, cat]) => `- "${act}" -> ${cat}`).join('\n')
  return rules
}
