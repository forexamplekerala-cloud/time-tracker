'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight } from 'lucide-react'

type Entry = {
  id: string
  category: string
  activity: string
  raw_fragment: string | null
  duration_minutes: number | null
  start_time: string | null
  end_time: string | null
  created_at: string
}

const CATEGORY_COLORS: Record<string, string> = {
  'Trading/Deep Work': 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20',
  'Agency/Business': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Life/Fuel': 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
  'Distraction': 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
  'Unclear': 'bg-[#A1A1AA]/10 text-[#A1A1AA] border-[#A1A1AA]/20'
}

function fmtMins(m: number) {
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
}

// Ledger row for unlogged time — unknown, never labeled wasted.
function GapRow({ label, mins }: { label: string; mins: number }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 border border-dashed border-border rounded-md"
      title="Unlogged gap — unknown, not wasted"
      aria-label={`${fmtMins(mins)} unlogged gap, ${label}`}
    >
      <span className="text-[11px] font-mono text-ink-muted">{label}</span>
      <span className="text-[11px] font-mono text-ink">{fmtMins(mins)} gap — unlogged</span>
    </div>
  )
}

export default function TimelineList({
  initialEntries,
  boundaryMinutes,
  boundaryLabel,
}: {
  initialEntries: Entry[]
  // Ledger boundary: elapsed IST minutes for today, 1440 for past days (from the server — no client clock)
  boundaryMinutes: number
  boundaryLabel: string
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showReceipts, setShowReceipts] = useState(false)

  const formatDuration = (mins: number | null, start: string | null, end: string | null) => {
    let m = mins || 0
    if (!m && start && end) {
      const [h1, m1] = start.split(':').map(Number)
      const [h2, m2] = end.split(':').map(Number)
      m = (h2 * 60 + m2) - (h1 * 60 + m1)
      if (m < 0) m += 24 * 60
    }
    if (m === 0) return ''
    if (m < 60) return `${m}m`
    return `${Math.floor(m/60)}h ${m%60}m`
  }

  // Fixed locale + explicit IST timezone -> identical output on server and client (no hydration drift)
  const formatIstTime = (iso: string) =>
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(new Date(iso))

  const timeLabel = (entry: Entry) => {
    if (entry.start_time && entry.end_time) return `${entry.start_time}–${entry.end_time}`
    if (entry.start_time) return `from ${entry.start_time}`
    if (entry.created_at) return `logged ${formatIstTime(entry.created_at)}`
    return null
  }

  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    if (isNaN(h) || isNaN(m)) return null
    return h * 60 + m
  }

  // Ledger math runs in chronological order (oldest -> newest); the DISPLAY list is
  // reversed below (newest first) so the latest action leads. Untimed entries
  // (position unknown — never guessed, hard rule) stay at the bottom.
  const chrono = [...initialEntries].sort((a, b) => {
    const aS = a.start_time ? toMins(a.start_time) : null
    const bS = b.start_time ? toMins(b.start_time) : null
    if (aS === null && bS === null) return 0
    if (aS === null) return 1
    if (bS === null) return -1
    return aS - bS
  })
  const timedChrono = chrono.filter((e) => e.start_time)
  const display = [...timedChrono].reverse()
  const untimed = chrono.filter((e) => !e.start_time)
  const untimedCount = untimed.length

  // Gap between two anchored entries (a older, b newer). Either may be undefined
  // (the oldest display row has no older neighbor). Only when BOTH anchors exist —
  // never inferred, never labeled wasted (unlogged = unknown).
  const gapAfter = (a: Entry | undefined, b: Entry | undefined): number | null => {
    if (!a || !b) return null
    if (!a.end_time || !b.start_time) return null
    const aEnd = toMins(a.end_time)
    const bStart = toMins(b.start_time)
    if (aEnd === null || bStart === null) return null
    let gap = bStart - aEnd
    if (gap <= 0 || gap > 1440) return null
    return gap
  }

  // Leading gap: 00:00 -> first timed entry (renders at the BOTTOM in reverse view)
  const firstTimed = timedChrono[0]
  const firstStart = firstTimed && firstTimed.start_time ? toMins(firstTimed.start_time) : null
  const leadingGap = firstStart !== null && firstStart > 0 ? firstStart : null

  // Trailing gap: last timed entry's end -> ledger boundary (now for today, 24:00 for past days).
  // Renders at the TOP in reverse view — the freshest blank.
  const lastTimed = timedChrono[timedChrono.length - 1]
  const lastEnd = lastTimed && lastTimed.end_time ? toMins(lastTimed.end_time) : null
  const trailingGap = lastEnd !== null && boundaryMinutes - lastEnd > 0 ? boundaryMinutes - lastEnd : null

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    setLoadingId(id)
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.refresh()
    } catch (e) {
      console.error(e)
      alert('Could not delete entry.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleEdit = async (entry: Entry) => {
    if (!confirm('Edit this entry? It will be removed from your timeline so you can parse it again.')) return
    setLoadingId(entry.id)
    try {
      const res = await fetch(`/api/entries/${entry.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')

      const params = new URLSearchParams()
      if (entry.raw_fragment) {
        params.set('reparse', entry.raw_fragment)
      }
      router.push(`/log?${params.toString()}`)
    } catch (e) {
      console.error(e)
      alert('Could not prepare edit.')
      setLoadingId(null)
    }
  }

  if (!initialEntries || initialEntries.length === 0) {
    return null
  }

  const renderCard = (entry: Entry) => {
    const colorClass = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS['Unclear']
    const duration = formatDuration(entry.duration_minutes, entry.start_time, entry.end_time)
    const isExpanded = expandedId === entry.id
    const stamp = timeLabel(entry)

    return (
      <div className={`p-4 bg-surface border border-border rounded-md relative ${loadingId === entry.id ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
              {entry.category}
            </span>
            {stamp && (
              <span className="text-[11px] font-mono text-ink-muted" title="Time of this entry (IST)">
                {stamp}
              </span>
            )}
          </div>
          <button
            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
            className="p-1.5 -mr-1.5 -mt-1 rounded-full text-ink-muted hover:text-ink hover:bg-[#F4F4F5] transition-colors"
            title={isExpanded ? 'Hide actions' : 'Entry actions'}
            aria-expanded={isExpanded}
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        <p className="text-base text-ink font-medium mb-1">{entry.activity}</p>

        <div className="flex justify-between items-end mt-2">
          {entry.raw_fragment ? (
            <p className="text-xs text-ink-muted italic line-clamp-2 pr-4 w-4/5">"{entry.raw_fragment}"</p>
          ) : (
            <span />
          )}
          <span className="text-sm font-mono text-ink shrink-0">{duration}</span>
        </div>

        {isExpanded && (
          <div className="flex gap-5 justify-end items-center border-t border-border mt-3 pt-3">
            <button onClick={() => handleEdit(entry)} className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink transition-colors" title="Edit text">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              Edit
            </button>
            <button onClick={() => handleDelete(entry.id)} className="flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-red-500 transition-colors" title="Delete entry">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              Delete
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => setShowReceipts((s) => !s)}
        aria-expanded={showReceipts}
        className="flex items-center gap-1.5 w-full py-3 min-h-[44px] text-xs font-medium uppercase tracking-wider text-[#78716C] hover:text-ink transition-colors"
      >
        {showReceipts ? 'Hide receipts' : 'Show receipts'}
        <span className="font-mono">
          ({initialEntries.length} {initialEntries.length === 1 ? 'entry' : 'entries'})
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showReceipts ? 'rotate-180' : ''}`} />
      </button>

      {showReceipts && (
        <>
          {/* Freshest blank first: from your last entry until now */}
          {trailingGap !== null && lastTimed?.end_time && (
            <GapRow label={`${lastTimed.end_time} – ${boundaryLabel}`} mins={trailingGap} />
          )}

          {display.map((entry, i) => {
            // The chronologically older neighbor sits BELOW in reverse view
            const prev = display[i + 1]
            const gap = gapAfter(prev, entry)
            return (
              <div key={entry.id}>
                {renderCard(entry)}
                {gap !== null && prev?.end_time && entry.start_time && (
                  <GapRow label={`${prev.end_time} – ${entry.start_time}`} mins={gap} />
                )}
              </div>
            )
          })}

          {/* Day's opening blank: midnight -> first entry */}
          {leadingGap !== null && firstTimed?.start_time && (
            <GapRow label={`00:00 – ${firstTimed.start_time}`} mins={leadingGap} />
          )}

          {untimed.map((entry) => (
            <div key={entry.id}>{renderCard(entry)}</div>
          ))}

          {untimedCount > 0 && (
            <p className="text-[11px] text-ink-muted">
              {untimedCount} {untimedCount === 1 ? 'entry' : 'entries'} without times — counted in your totals, position unknown.
            </p>
          )}
        </>
      )}
    </div>
  )
}
