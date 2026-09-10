import { createClient } from '@/utils/supabase/server'
import { getTruthLine } from '@/lib/dashboard/truth'
import { resolveDurationMinutes, countsAsProductive } from '@/lib/entries/summary'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import TimelineList from './TimelineList'

export default async function TodayPage({
  searchParams
}: {
  searchParams: { date?: string }
}) {
  const supabase = createClient()
  
  // Real implementation: get IST date correctly
  const now = new Date()
  const istDateStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).split('/').reverse().join('-')

  // Use searchParams.date if valid, otherwise fallback to IST today
  const targetDateStr = searchParams.date || istDateStr
  const isToday = targetDateStr === istDateStr

  // Calculate previous and next dates for arrows
  const targetDateObj = new Date(targetDateStr)
  targetDateObj.setHours(12, 0, 0, 0) // Avoid timezone shifts when adding/subtracting days
  
  const prevDateObj = new Date(targetDateObj)
  prevDateObj.setDate(prevDateObj.getDate() - 1)
  const prevDateStr = prevDateObj.toISOString().split('T')[0]

  const nextDateObj = new Date(targetDateObj)
  nextDateObj.setDate(nextDateObj.getDate() + 1)
  const nextDateStr = nextDateObj.toISOString().split('T')[0]
  
  const canGoForward = !isToday

  // Compute totals live from entries (source of truth) — daily_summaries is only a cache
  const { data: entries } = await supabase
    .from('time_entries')
    .select('*')
    .eq('date', targetDateStr)
    .order('created_at', { ascending: true })

  let prod = 0, dist = 0, fuel = 0, unclear = 0
  for (const e of (entries || []) as any[]) {
    const mins = resolveDurationMinutes(e.duration_minutes, e.start_time, e.end_time) || 0
    if (countsAsProductive(e.category, e.activity, e.impact_rating)) prod += mins
    else if (e.category === 'Distraction') dist += mins
    else if (e.category === 'Life/Fuel') fuel += mins
    else if (e.category === 'Unclear') unclear += mins
  }
  // Unclear time IS logged — never counted as unlogged
  const totalLogged = prod + dist + fuel + unclear

  const fmt = (mins: number) => `${Math.floor(mins/60)}h ${mins%60}m`

  const istHm = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now).split(':').map(Number)
  const elapsedIstMinutes = istHm[0] * 60 + istHm[1]
  const unlogged = isToday
    ? Math.max(0, elapsedIstMinutes - totalLogged)
    : Math.max(0, 24 * 60 - totalLogged)

  const truthLine = getTruthLine(dist, prod, fuel, isToday)

  const displayTitle = isToday ? "Today's Audit" : `${targetDateStr} Audit`

  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)] py-6">
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Link href={`/today?date=${prevDateStr}`} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors" title="Previous Day">
            <ChevronLeft className="w-5 h-5 text-ink-muted" />
          </Link>
          <h1 className="text-2xl text-ink font-semibold flex-1 text-center">{displayTitle}</h1>
          {canGoForward ? (
            <Link href={`/today?date=${nextDateStr}`} className="p-2 -mr-2 rounded-full hover:bg-surface transition-colors" title="Next Day">
              <ChevronRight className="w-5 h-5 text-ink-muted" />
            </Link>
          ) : (
            <div className="w-9 h-9 -mr-2"></div> // Spacer to keep title centered
          )}
        </div>
        <p className="text-lg font-medium text-[#DC2626] text-center">{truthLine}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-surface border border-border rounded-md">
          <p className="text-sm text-ink-muted mb-1">Productive</p>
          <p className="text-2xl font-mono text-[#16A34A]">{fmt(prod)}</p>
        </div>
        <div className="p-4 bg-surface border border-border rounded-md">
          <p className="text-sm text-ink-muted mb-1">Lost</p>
          <p className="text-2xl font-mono text-[#DC2626]">{fmt(dist)}</p>
        </div>
        <div className="p-4 bg-surface border border-border rounded-md">
          <p className="text-sm text-ink-muted mb-1">Fuel</p>
          <p className="text-2xl font-mono text-[#F59E0B]">{fmt(fuel)}</p>
        </div>
        <div className="p-4 bg-surface border border-border rounded-md">
          <p className="text-sm text-ink-muted mb-1">Unlogged</p>
          <p className="text-2xl font-mono text-[#A1A1AA]">{fmt(unlogged)}</p>
        </div>
      </div>

      {totalLogged > 0 && (
        <div className="mb-8">
          <div className="flex h-6 rounded-full overflow-hidden bg-[#F4F4F5]">
            <div style={{ width: `${(prod/totalLogged)*100}%` }} className="bg-[#16A34A] h-full transition-all"></div>
            <div style={{ width: `${(fuel/totalLogged)*100}%` }} className="bg-[#F59E0B] h-full transition-all"></div>
            <div style={{ width: `${(dist/totalLogged)*100}%` }} className="bg-[#DC2626] h-full transition-all"></div>
          </div>
          <p className="text-xs text-ink-muted mt-2 text-right">
            {Math.round((prod/totalLogged)*100)}% of logged time productive
          </p>
        </div>
      )}

      <div className="mb-12">
        <TimelineList initialEntries={entries || []} />
      </div>
    </div>
  )
}
