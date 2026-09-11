import LogInput from './LogInput'
import { createClient } from '@/utils/supabase/server'

export default async function LogPage({
  searchParams
}: {
  searchParams: { reparse?: string }
}) {
  const supabase = createClient()

  const now = new Date()
  const istDateString = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(now)

  // IST date for the query (YYYY-MM-DD) — same pattern as /today
  const istDateStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).split('/').reverse().join('-')

  // "Last logged" stamp: how far today's record reaches.
  // Anchor per entry: end_time -> start_time -> created_at (IST). Max wins.
  // Never a countdown, never a nag — just the fact. Absent when nothing is logged.
  const { data: todayEntries } = await supabase
    .from('time_entries')
    .select('start_time, end_time, created_at')
    .eq('date', istDateStr)

  let lastLoggedLabel: string | null = null
  if (todayEntries && todayEntries.length > 0) {
    const toMins = (t: string | null): number | null => {
      if (!t) return null
      const [h, m] = t.split(':').map(Number)
      if (isNaN(h) || isNaN(m)) return null
      return h * 60 + m
    }
    const createdMins = (iso: string): number | null => {
      const hm = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(new Date(iso)).split(':').map(Number)
      if (isNaN(hm[0]) || isNaN(hm[1])) return null
      return hm[0] * 60 + hm[1]
    }

    let maxMins: number | null = null
    for (const e of todayEntries as any[]) {
      const mins = toMins(e.end_time) ?? toMins(e.start_time) ?? createdMins(e.created_at)
      if (mins !== null && (maxMins === null || mins > maxMins)) maxMins = mins
    }

    if (maxMins !== null) {
      const h24 = Math.floor(maxMins / 60)
      const m = maxMins % 60
      const period = h24 >= 12 ? 'PM' : 'AM'
      const h12 = h24 % 12 || 12
      lastLoggedLabel = `${h12}:${m.toString().padStart(2, '0')} ${period}`
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-120px)]">
      <header className="pb-4 mb-6 border-b border-border">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-[#78716C]">{istDateString}</p>
          {lastLoggedLabel && (
            <p className="flex items-baseline gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.08em] text-[#A8A29E]">Last logged</span>
              <span className="font-mono text-xs text-[#78716C]">{lastLoggedLabel}</span>
            </p>
          )}
        </div>
      </header>

      <h1 className="text-2xl font-semibold text-ink mb-6">What actually happened today?</h1>

      <LogInput initialText={searchParams.reparse || ''} />
    </div>
  )
}
