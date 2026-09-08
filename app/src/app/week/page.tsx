import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function WeekPage() {
  const supabase = createClient()
  
  // Get last 7 days of summaries
  const { data: summaries } = await supabase
    .from('daily_summaries')
    .select('*')
    .order('date', { ascending: false })
    .limit(7)
    
  // We want to display them chronologically (oldest to newest)
  const sortedSummaries = [...(summaries || [])].reverse()

  let totalProd = 0
  let totalDist = 0

  if (summaries) {
    summaries.forEach(s => {
      totalProd += s.productive_minutes || 0
      totalDist += s.distraction_minutes || 0
    })
  }

  // Calculate max minutes to scale the bars
  const maxMins = sortedSummaries.reduce((max, s) => {
    const total = (s.productive_minutes || 0) + (s.distraction_minutes || 0) + (s.fuel_minutes || 0)
    return total > max ? total : max
  }, 0) || 600 // fallback to 10 hours if empty

  return (
    <div className="flex flex-col py-6">
      <header className="mb-8">
        <h1 className="text-2xl text-ink font-semibold mb-2">This Week</h1>
        <p className="text-lg font-medium text-ink-muted">
          {totalDist > totalProd ? "Distraction is winning. Time to tighten up." : "A solid week, but distraction creeping up."}
        </p>
      </header>
      
      {/* Real Heatmap */}
      <div className="bg-surface border border-border p-4 rounded-md mb-8">
        <h3 className="text-sm text-ink-muted mb-4">Past 7 Days</h3>
        <div className="flex justify-between items-end h-32 gap-2">
          {sortedSummaries.length === 0 ? (
            <p className="text-sm text-ink-muted italic w-full text-center mt-10">No data for this week yet.</p>
          ) : (
            sortedSummaries.map((s, i) => {
              const prod = s.productive_minutes || 0
              const dist = s.distraction_minutes || 0
              const fuel = s.fuel_minutes || 0
              const total = prod + dist + fuel
              
              // Scale percentages based on the day with the most logged time
              const prodPct = (prod / maxMins) * 100
              const distPct = (dist / maxMins) * 100
              const fuelPct = (fuel / maxMins) * 100

              const dateObj = new Date(s.date)
              const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()]

              return (
                <Link key={s.id} href={`/today?date=${s.date}`} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full flex flex-col gap-0 justify-end h-full hover:opacity-80 transition-opacity cursor-pointer relative rounded-t-sm overflow-hidden bg-surface">
                    {total === 0 ? (
                      <div className="w-full border-2 border-dashed border-border rounded-sm h-full opacity-50"></div>
                    ) : (
                      <>
                        {dist > 0 && <div className="w-full bg-[#DC2626]" style={{ height: `${distPct}%` }}></div>}
                        {fuel > 0 && <div className="w-full bg-[#F59E0B]" style={{ height: `${fuelPct}%` }}></div>}
                        {prod > 0 && <div className="w-full bg-[#16A34A]" style={{ height: `${prodPct}%` }}></div>}
                      </>
                    )}
                  </div>
                  <span className="text-xs text-ink-muted group-hover:text-ink transition-colors">{dayName}</span>
                </Link>
              )
            })
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-surface border border-border rounded-md">
          <p className="text-sm text-ink-muted mb-1">Total Productive</p>
          <p className="text-2xl font-mono text-[#16A34A]">{Math.floor(totalProd/60)}h {totalProd%60}m</p>
        </div>
        <div className="p-4 bg-surface border border-border rounded-md">
          <p className="text-sm text-ink-muted mb-1">Total Distraction</p>
          <p className="text-2xl font-mono text-[#DC2626]">{Math.floor(totalDist/60)}h {totalDist%60}m</p>
        </div>
      </div>
      
    </div>
  )
}
