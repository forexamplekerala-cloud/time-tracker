import DayDial from './DayDial'
import type { VoidVerdict } from '@/lib/dashboard/truth'

type AuditEntry = {
  id: string
  category: string | null
  activity: string | null
  duration_minutes: number | string | null
  start_time: string | null
  end_time: string | null
}

type Props = {
  entries: AuditEntry[]
  productive: number
  distraction: number
  fuel: number
  unclear: number
  unlogged: number
  writtenPct: number
  voidVerdict: VoidVerdict
  insights: string[]
  nowMinutes: number | null
}

function fmtMins(mins: number): string {
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
}

// Bold ONLY the trigger phrase from the deterministic template — positive outcomes stay regular weight.
function renderVoidText(line: string, emphasis: string | null) {
  if (!emphasis) return line
  const i = line.indexOf(emphasis)
  if (i < 0) return line
  return (
    <>
      {line.slice(0, i)}
      <strong className="font-bold">{emphasis}</strong>
      {line.slice(i + emphasis.length)}
    </>
  )
}

export default function AuditReport({
  entries,
  productive,
  distraction,
  fuel,
  unclear,
  unlogged,
  writtenPct,
  voidVerdict,
  insights,
  nowMinutes,
}: Props) {
  const legend = [
    { label: 'Productive', value: productive, color: '#10B981' },
    { label: 'Fuel', value: fuel, color: '#F59E0B' },
    { label: 'Distraction', value: distraction, color: '#EF4444' },
    { label: 'Unclear', value: unclear, color: '#71717A' },
  ]

  return (
    <>
      {/* The Void — dial directly on the paper, no box to soften it */}
      <section aria-label="Day mirror">
        <DayDial entries={entries} writtenPct={writtenPct} nowMinutes={nowMinutes} />
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-5">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs text-ink-muted">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
              {l.label}&nbsp;
              <span className="font-mono text-ink">{fmtMins(l.value)}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Editorial rule line */}
      <div className="w-full border-t border-border mt-6" aria-hidden="true" />

      {/* The Verdict — text on paper only. No cards, no boxes, no backgrounds. */}
      <section aria-label="Verdict" className="mt-6">
        <p className="font-mono text-5xl font-bold tracking-tight leading-none text-ink">
          {fmtMins(unlogged)}
        </p>
        <p className="text-base font-normal text-ink leading-relaxed mt-3">
          {renderVoidText(voidVerdict.line, voidVerdict.emphasis)}
        </p>
        {voidVerdict.detail && (
          <p className="text-sm font-normal text-[#78716C] leading-relaxed mt-1.5">
            {voidVerdict.detail}
          </p>
        )}
        {insights.length > 0 && (
          <ul className="mt-4 space-y-1">
            {insights.map((line, i) => (
              <li key={i} className="text-xs text-ink-muted">
                — {line}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Editorial rule line */}
      <div className="w-full border-t border-border mt-6" aria-hidden="true" />
    </>
  )
}
