import { createClient } from '@/utils/supabase/server'
import { getInsights, getVoidLine } from '@/lib/dashboard/truth'
import { getMirrorState, getMirrorQuoteIndex } from '@/lib/dashboard/quotes'
import { resolveDurationMinutes, countsAsProductive } from '@/lib/entries/summary'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import TimelineList from './TimelineList'
import AuditReport from './AuditReport'
import MirrorQuote from './MirrorQuote'

export default async function TodayPage({
  searchParams
}: {
  searchParams: { date?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Real implementation: get IST date correctly
  const now = new Date()
  const istDateStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).split('/').reverse().join('-')

  // Validate searchParams.date (must be YYYY-MM-DD and not in the future)
  let targetDateStr = istDateStr
  if (searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date)) {
    const testDate = new Date(searchParams.date + 'T12:00:00Z')
    if (!isNaN(testDate.getTime())) {
      // Future dates are unwritten, not a 24h void — clamp to today
      targetDateStr = searchParams.date <= istDateStr ? searchParams.date : istDateStr
    }
  }
  const isToday = targetDateStr === istDateStr

  // Calculate previous and next dates for arrows safely
  const targetDateObj = new Date(targetDateStr + 'T12:00:00Z')
  
  const prevDateObj = new Date(targetDateObj)
  prevDateObj.setUTCDate(prevDateObj.getUTCDate() - 1)
  const prevDateStr = prevDateObj.toISOString().split('T')[0]

  const nextDateObj = new Date(targetDateObj)
  nextDateObj.setUTCDate(nextDateObj.getUTCDate() + 1)
  const nextDateStr = nextDateObj.toISOString().split('T')[0]
  
  const canGoForward = !isToday && nextDateStr <= istDateStr

  // Compute totals live from entries (source of truth) — scoped to user
  let query = supabase
    .from('time_entries')
    .select('*')
    .eq('date', targetDateStr)

  if (user) {
    query = query.eq('user_id', user.id)
  }

  const { data: entries } = await query.order('start_time', { ascending: true, nullsFirst: false })

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

  const voidVerdict = getVoidLine(unlogged, { productive: prod, distraction: dist, fuel, unclear }, isToday)
  const insights = getInsights(entries || [])

  const writtenPct = Math.min(
    100,
    Math.round((totalLogged / (isToday ? Math.max(elapsedIstMinutes, 1) : 1440)) * 100)
  )
  const mirrorState = getMirrorState(prod, dist, totalLogged)
  const quoteIndex = getMirrorQuoteIndex(targetDateStr, mirrorState)

  const prettyDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(targetDateObj)
  const displayTitle = isToday ? "Today's Audit" : `${prettyDate} Audit`

  // Single time source for verdict, dial void, and receipts ledger — all three reconcile.
  const nowMinutes = isToday ? elapsedIstMinutes : null
  const boundaryMinutes = isToday ? elapsedIstMinutes : 24 * 60
  const boundaryLabel = isToday ? 'now' : '24:00'

  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)] py-6">
      {/* First read: the title. Second sight: the dial. Nothing in between. */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <Link href={`/today?date=${prevDateStr}`} className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors" title="Previous Day">
            <ChevronLeft className="w-4 h-4 text-ink-muted" />
          </Link>
          <h1 className="font-mono text-lg font-semibold uppercase tracking-[0.1em] text-ink">{displayTitle}</h1>
          {canGoForward ? (
            <Link href={`/today?date=${nextDateStr}`} className="p-2 -mr-2 rounded-full hover:bg-surface transition-colors" title="Next Day">
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </Link>
          ) : (
            <div className="w-8 h-8 -mr-2"></div> // Spacer to keep title centered
          )}
        </div>
      </header>

      <AuditReport
        entries={entries || []}
        productive={prod}
        distraction={dist}
        fuel={fuel}
        unclear={unclear}
        unlogged={unlogged}
        writtenPct={writtenPct}
        voidVerdict={voidVerdict}
        insights={insights}
        nowMinutes={nowMinutes}
      />

      <div className="mt-6">
        <TimelineList
          initialEntries={entries || []}
          boundaryMinutes={boundaryMinutes}
          boundaryLabel={boundaryLabel}
        />
      </div>

      {/* Close the loop: realization -> immediate logging action (today only — logging is today-only in Phase 1) */}
      {isToday && (
        <Link
          href="/log"
          className="mt-6 flex items-center justify-center w-full min-h-[48px] py-3 border border-ink rounded-md text-sm font-semibold text-ink hover:bg-ink hover:text-[var(--background)] transition-colors"
        >
          → Log the missing hours
        </Link>
      )}

      {/* Afterthought footnote, right above the nav */}
      <MirrorQuote initialIndex={quoteIndex} />
    </div>
  )
}
