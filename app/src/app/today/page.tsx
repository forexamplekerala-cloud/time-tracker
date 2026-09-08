import { createClient } from '@/utils/supabase/server'
import { getTruthLine, getProcrastinationLine } from '@/lib/dashboard/truth'
import TimelineList from './TimelineList'

export default async function TodayPage() {
  const supabase = createClient()
  
  // Real implementation: get IST date correctly
  const now = new Date()
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now).split('/').reverse().join('-')

  const { data: entries } = await supabase
    .from('time_entries')
    .select('*')
    .eq('date', dateStr)
    .order('created_at', { ascending: true })

  let prod = 0
  let dist = 0
  let fuel = 0
  let unclear = 0
  let badImpact = 0

  if (entries) {
    entries.forEach(e => {
      let mins = e.duration_minutes || 0
      
      // Calculate from start/end if duration is missing
      if (!mins && e.start_time && e.end_time) {
        const [h1, m1] = e.start_time.split(':').map(Number)
        const [h2, m2] = e.end_time.split(':').map(Number)
        mins = (h2 * 60 + m2) - (h1 * 60 + m1)
        if (mins < 0) mins += 24 * 60 // Handle cross-midnight if any
      }

      if (e.category === 'Trading/Deep Work' || e.category === 'Agency/Business') prod += mins
      if (e.category === 'Distraction') dist += mins
      if (e.category === 'Life/Fuel') fuel += mins
      if (e.category === 'Unclear') unclear += mins
      if (e.impact_rating === 'bad') badImpact += mins
    })
  }

  const totalLogged = prod + dist + fuel + unclear
  
  const truthLine = getTruthLine(dist, prod)
  const procLine = getProcrastinationLine(badImpact)

  return (
    <div className="flex flex-col min-h-[calc(100vh-3rem)] py-6">
      <header className="mb-8">
        <h1 className="text-2xl text-ink font-semibold mb-2">Today's Audit</h1>
        <p className="text-lg font-medium text-[#DC2626]">{truthLine}</p>
        {procLine && (
          <p className="text-sm font-medium text-amber-700 mt-2">{procLine}</p>
        )}
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-surface border border-border rounded-md">
          <p className="text-sm text-ink-muted mb-1">Productive</p>
          <p className="text-2xl font-mono text-[#16A34A]">{Math.floor(prod/60)}h {prod%60}m</p>
        </div>
        <div className="p-4 bg-surface border border-border rounded-md">
          <p className="text-sm text-ink-muted mb-1">Distraction</p>
          <p className="text-2xl font-mono text-[#DC2626]">{Math.floor(dist/60)}h {dist%60}m</p>
        </div>
        {(fuel > 0 || unclear > 0) && (
          <div className="col-span-2 flex gap-4">
             {fuel > 0 && <div className="flex-1 p-3 bg-surface border border-border rounded-md"><p className="text-sm text-ink-muted mb-1">Life/Fuel</p><p className="font-mono text-[#F59E0B]">{Math.floor(fuel/60)}h {fuel%60}m</p></div>}
             {unclear > 0 && <div className="flex-1 p-3 bg-surface border border-border rounded-md"><p className="text-sm text-ink-muted mb-1">Unclear</p><p className="font-mono text-[#A1A1AA]">{Math.floor(unclear/60)}h {unclear%60}m</p></div>}
          </div>
        )}
      </div>

      {totalLogged > 0 && (
        <div className="mb-8">
          <div className="flex h-6 rounded-full overflow-hidden bg-[#F4F4F5]">
            <div style={{ width: `${(prod/totalLogged)*100}%` }} className="bg-[#16A34A] h-full transition-all"></div>
            <div style={{ width: `${(fuel/totalLogged)*100}%` }} className="bg-[#F59E0B] h-full transition-all"></div>
            <div style={{ width: `${(unclear/totalLogged)*100}%` }} className="bg-[#A1A1AA] h-full transition-all"></div>
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
