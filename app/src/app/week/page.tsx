import { createClient } from '@/utils/supabase/server'

export default async function WeekPage() {
  const supabase = createClient()
  
  const now = new Date()
  const dates: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d).split('/').reverse().join('-')
    dates.push(dateStr)
  }
  const minDate = dates[6]
  
  const { data: entries } = await supabase
    .from('time_entries')
    .select('*')
    .gte('date', minDate)
    
  let totalProd = 0
  let totalDist = 0
  const dailyData = dates.map(d => ({ date: d, prod: 0, dist: 0 }))
  
  if (entries) {
    entries.forEach(e => {
      let mins = e.duration_minutes || 0
      if (!mins && e.start_time && e.end_time) {
        const [h1, m1] = e.start_time.split(':').map(Number)
        const [h2, m2] = e.end_time.split(':').map(Number)
        mins = (h2 * 60 + m2) - (h1 * 60 + m1)
        if (mins < 0) mins += 24 * 60 
      }
      
      const dayData = dailyData.find(d => d.date === e.date)
      if (dayData) {
        if (e.category === 'Trading/Deep Work' || e.category === 'Agency/Business') {
          dayData.prod += mins
          totalProd += mins
        }
        if (e.category === 'Distraction') {
          dayData.dist += mins
          totalDist += mins
        }
      }
    })
  }

  // Reverse dailyData for chronological order in heatmap
  dailyData.reverse()
  const maxMins = Math.max(...dailyData.map(d => d.prod + d.dist), 1)

  return (
    <div className="flex flex-col py-6">
      <header className="mb-8">
        <h1 className="text-2xl text-ink font-semibold mb-2">This Week</h1>
        <p className="text-lg font-medium text-ink-muted">
          {totalProd > totalDist * 2 ? "A solid week." : "Distraction creeping up."}
        </p>
      </header>
      
      <div className="bg-surface border border-border p-4 rounded-md mb-8">
        <h3 className="text-sm text-ink-muted mb-4">Past 7 Days</h3>
        <div className="flex justify-between items-end h-32 gap-1">
          {dailyData.map((d, i) => {
            const total = d.prod + d.dist
            const pPct = total > 0 ? (d.prod / maxMins) * 100 : 0
            const dPct = total > 0 ? (d.dist / maxMins) * 100 : 0
            return (
              <div key={i} className="flex-1 flex flex-col gap-1 justify-end h-full">
                {dPct > 0 && <div className="w-full bg-[#DC2626] rounded-t-sm" style={{ height: `${dPct}%` }}></div>}
                {pPct > 0 && <div className={`w-full bg-[#16A34A] ${dPct === 0 ? 'rounded-t-sm' : ''} rounded-b-sm`} style={{ height: `${pPct}%` }}></div>}
                {total === 0 && <div className="w-full border-2 border-dashed border-border rounded-sm h-full opacity-50"></div>}
                <div className="text-[10px] text-center text-ink-muted mt-2">{d.date.slice(8, 10)}</div>
              </div>
            )
          })}
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
