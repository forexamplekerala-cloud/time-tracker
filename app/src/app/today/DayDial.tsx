'use client'

import { useEffect, useState } from 'react'
import { resolveDurationMinutes } from '@/lib/entries/summary'

type DialEntry = {
  id: string
  category: string | null
  activity: string | null
  duration_minutes: number | string | null
  start_time: string | null
  end_time: string | null
}

const CATEGORY_HEX: Record<string, string> = {
  'Trading/Deep Work': '#10B981',
  'Agency/Business': '#3B82F6',
  'Life/Fuel': '#F59E0B',
  Distraction: '#EF4444',
  Unclear: '#71717A',
}

const CX = 120
const CY = 120
const R = 96
const STROKE = 18

function toMins(t: string): number | null {
  const [h, m] = t.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

function polar(r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

function arcPath(startDeg: number, endDeg: number) {
  const s = polar(R, endDeg)
  const e = polar(R, startDeg)
  const large = endDeg - startDeg <= 180 ? 0 : 1
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

const timeDeg = (mins: number) => (mins / 1440) * 360

function fmt(mins: number) {
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
}

type Block = { id: string; d: string; color: string; title: string }

// Arcs are placed ONLY from real start/end times — never guessed.
// Entries without usable times are counted as unplaced (shown in receipts, not on the ring).
function buildBlocks(entries: DialEntry[]): { blocks: Block[]; unplaced: number } {
  const blocks: Block[] = []
  let unplaced = 0

  for (const e of entries) {
    if (!e.start_time) {
      unplaced++
      continue
    }
    const start = toMins(e.start_time)
    if (start === null) {
      unplaced++
      continue
    }
    const end = e.end_time ? toMins(e.end_time) : null
    // Overnight wrap or missing end -> pin to end of day
    const effEnd = end === null || end <= start ? 1440 : end
    // Minimum visible sliver; max span just under 360 (SVG can't draw a full-circle arc as one path)
    const spanDeg = Math.min(Math.max(timeDeg(effEnd - start), 1.2), 359)
    if (spanDeg <= 0) {
      unplaced++
      continue
    }
    const dur = resolveDurationMinutes(e.duration_minutes, e.start_time, e.end_time)
    blocks.push({
      id: e.id,
      d: arcPath(timeDeg(start), timeDeg(start) + spanDeg),
      color: CATEGORY_HEX[e.category || 'Unclear'] || CATEGORY_HEX['Unclear'],
      title: `${e.start_time}${e.end_time ? `–${e.end_time}` : ''} · ${e.activity || 'Unlisted'} · ${e.category || 'Unclear'}${dur ? ` · ${fmt(dur)}` : ''}`,
    })
  }

  return { blocks, unplaced }
}

export default function DayDial({
  entries,
  writtenPct,
  nowMinutes,
}: {
  entries: DialEntry[]
  writtenPct: number
  // Elapsed IST minutes for today; null for past days (full 24h void — the whole day is over)
  nowMinutes: number | null
}) {
  const { blocks, unplaced } = buildBlocks(entries)

  // One-shot entrance + one re-trigger per real data change. Never idles.
  const [runId, setRunId] = useState(0)
  useEffect(() => {
    setRunId((r) => r + 1)
  }, [entries.length])

  // One-shot count-up on the center number. Initial state matches SSR (no hydration drift).
  const [display, setDisplay] = useState(writtenPct)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(writtenPct)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 400)
      setDisplay(Math.round(writtenPct * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [writtenPct])

  const ticks = [0, 90, 180, 270]

  return (
    <div>
      <svg
        viewBox="0 0 240 240"
        className="w-full max-w-[300px] mx-auto block"
        role="img"
        aria-label={`Day dial: ${writtenPct}% of day written. The dense grey ring is unlogged elapsed time — unknown, not wasted.${nowMinutes !== null ? ' The rest of the day is still ahead.' : ''}`}
      >
        <style>{`
          @keyframes day-dial-in { from { opacity: 0; transform: rotate(-25deg) } to { opacity: 1; transform: rotate(0deg) } }
          .dial-anim { animation: day-dial-in 400ms ease-out both; transform-origin: 120px 120px }
          @media (prefers-reduced-motion: reduce) { .dial-anim { animation: none } }
        `}</style>
        {/* The Void — dense stone ring = unlogged ELAPSED time (unknown, never "wasted").
            Today it stops at the current hour: time ahead hasn't happened yet, so it stays transparent. */}
        {nowMinutes === null || nowMinutes >= 1439 ? (
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#D6D3D1" strokeWidth={STROKE} />
        ) : nowMinutes > 0 ? (
          <path
            d={arcPath(0, Math.min(timeDeg(nowMinutes), 359))}
            fill="none"
            stroke="#D6D3D1"
            strokeWidth={STROKE}
          />
        ) : null}
        {/* Hour ticks: 00:00 top, 06:00 right, 12:00 bottom, 18:00 left */}
        {ticks.map((a) => {
          const p1 = polar(R + STROKE / 2 + 2, a)
          const p2 = polar(R + STROKE / 2 + 7, a)
          return <line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#71717A" strokeWidth={1.5} />
        })}
        <g key={runId} className="dial-anim">
          {blocks.map((b) => (
            <path key={b.id} d={b.d} fill="none" stroke={b.color} strokeWidth={STROKE}>
              <title>{b.title}</title>
            </path>
          ))}
        </g>
        <text x={CX} y={CY + 8} textAnchor="middle" className="font-mono" fontSize="44" fontWeight="600" fill="var(--ink)">
          {display}%
        </text>
        <text x={CX} y={CY + 28} textAnchor="middle" fontSize="9" letterSpacing="2" fill="var(--ink-muted)">
          OF DAY WRITTEN
        </text>
      </svg>
      {unplaced > 0 && (
        <p className="text-[11px] text-ink-muted text-center mt-1">
          {unplaced} {unplaced === 1 ? 'entry' : 'entries'} without times — in receipts below
        </p>
      )}
    </div>
  )
}
