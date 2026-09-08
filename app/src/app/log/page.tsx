import { Suspense } from 'react'
import LogInput from './LogInput'
import { createClient } from '@/utils/supabase/server'

export default async function LogPage() {
  const supabase = createClient()
  
  // Example server-issued IST date
  // Real implementation: get IST date correctly
  const now = new Date()
  const istDateString = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(now)

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)]">
      <header className="py-4">
        <p className="text-sm font-medium text-ink-muted">{istDateString}</p>
      </header>
      
      <main className="flex-1 flex flex-col pt-4">
        <h1 className="text-lg text-ink font-medium mb-6">What actually happened today?</h1>
        <Suspense fallback={<div className="text-ink-muted">Loading...</div>}>
          <LogInput />
        </Suspense>
      </main>
    </div>
  )
}
