'use client'

import React, { useState, useEffect } from 'react'

/*
 * DESIGN PREVIEW — MOCKUP ONLY (dev-only route, not linked in any nav)
 *
 * External design brief adapted to THIS app's context:
 *   PRIORITY   -> PRODUCTIVE (Trading/Deep Work + Agency/Business)
 *   LOW INTENT -> DISTRACTION (explicitly logged only — never inferred from gaps)
 *   FAMILY     -> LIFE/FUEL (family, food, prayer, gym, sleep)
 *   EASY       -> UNCLEAR
 *   GAPS       -> UNLOGGED (unknown, never "wasted" — hard rule)
 *
 * Hard rules honored: rolling 7-day context as plain inline sentences (no chips),
 * no streaks/counters/gamification, dial stops at now, deterministic copy,
 * zero values omitted, quote only when blank > 0.
 *
 * Self-contained: mock data only, own fonts (Space Grotesk / IBM Plex Mono),
 * own CSS (dp- prefix). Imports nothing from the app. Touches nothing else.
 */

/* ---------------- formatters (pure) ---------------- */
function fmtDur(m: number): string {
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return r + 'm'
  if (r === 0) return h + 'h'
  return h + 'h ' + String(r).padStart(2, '0') + 'm'
}
function fmtClock(m: number): string {
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')
}
function fmt12(m: number): string {
  let h = Math.floor(m / 60)
  const ap = h < 12 ? 'AM' : 'PM'
  h = h % 12
  if (h === 0) h = 12
  return h + ':' + String(m % 60).padStart(2, '0') + ' ' + ap
}
function fmtRatio(x: number): string {
  return (+x.toFixed(2)).toString()
}

/* ---------------- the one true math (our categories) ---------------- */
type EntryType = 'prod' | 'dist' | 'fuel' | 'unclear' | 'gap'

interface MockEntry {
  type: EntryType
  s: number // minutes since midnight
  e: number
  label?: string
  cat?: 'TRADING' | 'AGENCY' | 'FUEL' | 'DISTRACTION' | 'UNCLEAR'
}

interface DayLog {
  date: string
  nowMin: number
  wakeMin: number
  bedMin: number // yesterday's bedtime, minutes since midnight
  bed: string // display, "01:40"
  entries: MockEntry[]
}

interface Computed {
  prod: number
  dist: number
  fuel: number
  unclear: number
  blank: number
  elapsed: number
  maxProd: number
  maxDist: number
  strong: boolean
  heroMin: number
  written: number
}

function compute(d: DayLog): Computed {
  let prod = 0, dist = 0, fuel = 0, unclear = 0, blank = 0, maxProd = 0, maxDist = 0
  for (const e of d.entries) {
    const dur = e.e - e.s
    if (dur <= 0) throw new Error('bad entry duration')
    if (e.type === 'gap') blank += dur
    else if (e.type === 'prod') { prod += dur; maxProd = Math.max(maxProd, dur) }
    else if (e.type === 'dist') { dist += dur; maxDist = Math.max(maxDist, dur) }
    else if (e.type === 'fuel') fuel += dur
    else if (e.type === 'unclear') unclear += dur
    else throw new Error('unknown type ' + e.type)
  }
  const elapsed = d.nowMin - d.wakeMin
  if (prod + dist + fuel + unclear + blank !== elapsed)
    throw new Error('mock contract: entries must tile wake -> now exactly')
  const strong = prod >= dist // THE dynamic-verdict rule
  return {
    prod, dist, fuel, unclear, blank, elapsed, maxProd, maxDist, strong,
    heroMin: strong ? prod : dist,
    written: elapsed ? Math.round(((elapsed - blank) / elapsed) * 100) : 100,
  }
}

/* ---------------- the void dial (ring stops at now) ---------------- */
const DIAL_COL: Record<string, string> = {
  prod: '#2E6B4F', // Productive — green (our category, design palette)
  dist: '#C63B27', // Distraction — red
  fuel: '#D9A03F', // Life/Fuel — amber
  unclear: '#98928A', // Unclear — stone
}

function dialSVG(d: DayLog, c: Computed): string {
  const C = 190, R = 138, SW = 30
  const deg = (m: number) => (m / 1440) * 360 - 90
  const pt = (r: number, a: number): [string, string] => {
    const t = (a * Math.PI) / 180
    return [(C + r * Math.cos(t)).toFixed(2), (C + r * Math.sin(t)).toFixed(2)]
  }
  const arc = (r: number, a0: number, a1: number): string => {
    const [sx, sy] = pt(r, a0)
    const [ex, ey] = pt(r, a1)
    return `M ${sx} ${sy} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${ex} ${ey}`
  }

  let ticks = ''
  for (let h = 0; h < 24; h++) {
    const a = deg(h * 60)
    const major = h % 6 === 0
    const [x0, y0] = pt(157, a)
    const [x1, y1] = pt(major ? 171 : 163, a)
    ticks += `<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${major ? '#B7B2A7' : '#DCD8CF'}" stroke-width="${major ? 2 : 1.5}"/>`
  }
  let labels = ''
  const labelPoints: Array<[number, string]> = [[0, '00'], [360, '06'], [720, '12'], [1080, '18']]
  for (const [m, t] of labelPoints) {
    const [x, y] = pt(181, deg(m))
    labels += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="IBM Plex Mono,monospace" font-size="9" fill="#A9A399">${t}</text>`
  }

  // Sleep: inferred, amber, drawn from bedtime -> wake (honest span, never midnight-faked)
  const sleep = `<path d="${arc(R, deg(d.bedMin), deg(d.wakeMin))}" fill="none" stroke="#E4C98F" stroke-width="${SW}"/>`

  let segs = ''
  for (const e of d.entries) {
    const a0 = deg(e.s) - 0.15, a1 = deg(e.e) + 0.15 // kill AA seams
    const stroke = e.type === 'gap' ? 'url(#hatch)' : DIAL_COL[e.type]
    segs += `<path d="${arc(R, a0, a1)}" fill="none" stroke="${stroke}" stroke-width="${SW}"/>`
  }

  const an = deg(d.nowMin)
  const [nx0, ny0] = pt(R - 26, an)
  const [nx1, ny1] = pt(R + 17, an)
  const notch = `<line x1="${nx0}" y1="${ny0}" x2="${nx1}" y2="${ny1}" stroke="#1D1A17" stroke-width="3" stroke-linecap="round"/>`

  return `<svg viewBox="0 0 380 380" role="img" aria-label="24-hour dial, ${fmtDur(c.blank)} unlogged, ring stops at now">
    <defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="7" stroke="#CFC9BF" stroke-width="1.6"/></pattern></defs>
    <circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="#D9D5CC" stroke-width="2" stroke-dasharray="1 7"/>
    ${ticks}${labels}${sleep}${segs}${notch}
    <text x="${C}" y="${C + 6}" text-anchor="middle" font-family="Space Grotesk,sans-serif" font-weight="700" font-size="26" fill="#C63B27">${fmtDur(c.blank)}</text>
    <text x="${C}" y="${C + 27}" text-anchor="middle" font-family="Space Grotesk,sans-serif" font-weight="600" font-size="10" letter-spacing="3" fill="#8B857B">UNLOGGED</text>
  </svg>`
}

/* ---------------- /today stab: one equivalence, deterministic ---------------- */
const WAKING = 16

function stabFor(c: Computed, roll: Rolling, profile: Profile): string {
  if (!c.strong && c.dist > roll.leakPerDay && c.dist >= 120)
    return `Against your ${fmtDur(roll.prioPerDay)}-a-day Productive average: ${profile.priorityLabel} is paying for the feed.`
  if (c.strong)
    return c.prod >= 100
      ? `${Math.floor(c.prod / 55)} full deep-work blocks (55m each), held.`
      : `${Math.floor(c.prod / 25)} focus blocks (25m each), held.`
  if (c.dist >= 210)
    return `At your rolling ${fmtDur(roll.leakPerDay)}/day: × 7 = ${fmtDur(roll.leakPerDay * 7)} — a part-time job, unpaid.`
  if (c.dist >= 75)
    return 'Half a Dubai–London long-haul (≈07:00 gate to gate), today.'
  return `${Math.round(c.dist / 25)} focus blocks (25m each), gone.`
}

/* ---------------- /insights: ordered chain, one card at a time ---------------- */
interface Rolling { leakPerDay: number; prioPerDay: number }
interface Profile { birthYear: number; priorityLabel: string }
interface Insight { tag: string; num: string; say: string; math: string }

function insightChain(c: Computed, roll: Rolling, profile: Profile): Insight[] {
  if (c.strong) {
    const yearHours = Math.round((roll.prioPerDay / 60) * 365)
    return [
      { tag: 'WHAT IT BUILT · TODAY', num: fmtDur(c.prod),
        say: 'Deep work, held through the afternoon dip.',
        math: `Productive today · longest stretch ${fmtDur(c.maxProd)}` },
      { tag: 'TODAY', num: fmtDur(c.dist),
        say: 'The leak, caught and stopped. That’s the skill.',
        math: 'one scroll session, ended by you — not by the feed' },
      { tag: 'AT SCALE · YEAR', num: `${yearHours}h`,
        say: 'Of Productive a year at your rolling pace. The edge compounds at this rate, or it doesn’t.',
        math: `rolling ${fmtDur(roll.prioPerDay)}/day × 365 ≈ ${yearHours}h` },
      { tag: 'THE TURN', num: `${fmtRatio(c.prod / c.dist)} : 1`,
        say: 'Productive outweighed distraction — a day in the right direction.',
        math: `${fmtDur(c.prod)} Productive vs ${fmtDur(c.dist)} Distraction` },
    ]
  }
  const yearsLeft = 74 - (new Date().getFullYear() - profile.birthYear)
  const lifetimeHours = (roll.leakPerDay / 60) * 365 * yearsLeft
  const wy = lifetimeHours / (WAKING * 365)
  const flightWord = c.dist >= 180 ? 'Half' : 'A third of'
  const personal: Insight = {
    tag: 'WHAT IT COST · TODAY', num: fmtDur(c.dist),
    say: `${cap(profile.priorityLabel)} is paying for the feed.`,
    math: `today ${fmtDur(c.dist)} Distraction · your Productive average: ${fmtDur(roll.prioPerDay)}/day`,
  }
  const rest: Insight[] = [
    { tag: 'TODAY', num: `${Math.round(c.dist / 25)} × 25m`,
      say: 'Full focus blocks — gone before you noticed.',
      math: `${fmtDur(c.dist)} ÷ 25m = ${(c.dist / 25).toFixed(1)} blocks` },
    { tag: 'TODAY', num: '½ FLIGHT',
      say: `${flightWord} a Dubai–London long-haul, today.`,
      math: `${fmtDur(c.dist)} of 07:00 gate-to-gate` },
    { tag: 'AT SCALE · WEEK', num: fmtDur(roll.leakPerDay * 7),
      say: 'A part-time job’s worth of scrolling. Every week. Unpaid.',
      math: `rolling ${fmtDur(roll.leakPerDay)}/day × 7 days` },
    { tag: 'COULD HAVE BEEN', num: `${Math.round((roll.leakPerDay / 60) * 180)}h`,
      say: 'Most of a new language, gone in six months.',
      math: `rolling ${fmtDur(roll.leakPerDay)}/day × 180 days · FSI Category I ≈ 600h` },
    { tag: 'AT SCALE · LIFETIME', num: `${wy.toFixed(1)} yrs`,
      say: 'Of waking life, gone by 74 — if nothing changes.',
      math: `rolling ${fmtDur(roll.leakPerDay)}/day × ${yearsLeft}y = ${Math.round(lifetimeHours).toLocaleString()}h ÷ ${WAKING}h waking/day` },
  ]
  return c.dist > roll.leakPerDay && c.dist >= 120 ? [personal, ...rest] : rest
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/* ---------------- mock data (tilings verified by compute()) ---------------- */
const ROLL: Rolling = { leakPerDay: 130, prioPerDay: 105 } // 2h 10m leak / 1h 45m productive per day
const PROFILE: Profile = { birthYear: 1996, priorityLabel: 'your trading edge' }

const DAYS: Record<'brutal' | 'strong', DayLog> = {
  brutal: {
    date: 'Saturday, 12 September',
    nowMin: 1065, wakeMin: 554, bedMin: 100, bed: '01:40',
    entries: [
      { type: 'fuel', s: 554, e: 600, label: 'woke up, prayed, ate', cat: 'FUEL' },
      { type: 'prod', s: 600, e: 655, label: 'trading charts + backtesting', cat: 'TRADING' },
      { type: 'gap', s: 655, e: 740 },
      { type: 'fuel', s: 740, e: 780, label: 'lunch + family', cat: 'FUEL' },
      { type: 'dist', s: 780, e: 930, label: 'YouTube, phone', cat: 'DISTRACTION' },
      { type: 'gap', s: 930, e: 960 },
      { type: 'unclear', s: 960, e: 990, label: 'hazy stretch — couldn’t say', cat: 'UNCLEAR' },
      { type: 'fuel', s: 990, e: 1050, label: 'gym', cat: 'FUEL' },
      { type: 'gap', s: 1050, e: 1065 },
    ],
  },
  strong: {
    date: 'Saturday, 12 September',
    nowMin: 1095, wakeMin: 450, bedMin: 1415, bed: '23:35',
    entries: [
      { type: 'fuel', s: 450, e: 510, label: 'woke, prayer, breakfast', cat: 'FUEL' },
      { type: 'prod', s: 510, e: 600, label: 'deep work: backtesting system', cat: 'TRADING' },
      { type: 'fuel', s: 600, e: 630, label: 'break, tea', cat: 'FUEL' },
      { type: 'prod', s: 630, e: 735, label: 'client work — agency site', cat: 'AGENCY' },
      { type: 'fuel', s: 735, e: 780, label: 'lunch + family', cat: 'FUEL' },
      { type: 'fuel', s: 780, e: 840, label: 'gym', cat: 'FUEL' },
      { type: 'dist', s: 840, e: 865, label: 'phone scroll — caught and stopped', cat: 'DISTRACTION' },
      { type: 'gap', s: 865, e: 905 },
      { type: 'prod', s: 905, e: 1000, label: 'trading session + journal', cat: 'TRADING' },
      { type: 'gap', s: 1000, e: 1095 },
    ],
  },
}

/* receipt chip colors — OUR five locked categories in the design palette */
const CHIPS: Record<string, { bg: string; ink: string }> = {
  TRADING: { bg: '#ECF3EE', ink: '#2E6B4F' },
  AGENCY: { bg: '#E8EEF6', ink: '#4A6FA5' },
  FUEL: { bg: '#F6EBD3', ink: '#A8862D' },
  DISTRACTION: { bg: '#FBEFEA', ink: '#C63B27' },
  UNCLEAR: { bg: '#EFEDE7', ink: '#8B857B' },
}

export default function DesignPreview() {
  const [tab, setTab] = useState<'today' | 'insights'>('today')
  const [dayType, setDayType] = useState<'brutal' | 'strong'>('brutal')
  const [angleIndex, setAngleIndex] = useState(0)

  const d = DAYS[dayType]
  const c = compute(d) // ONE compute() feeds both tabs — cross-page equality by construction
  const stab = stabFor(c, ROLL, PROFILE)
  const chain = insightChain(c, ROLL, PROFILE)
  const insight = chain[angleIndex % chain.length]

  useEffect(() => { setAngleIndex(0) }, [dayType])

  const receipts = [...d.entries].reverse() // newest first — law 6
  const entryCount = d.entries.filter((e) => e.type !== 'gap').length
  const gapCount = d.entries.filter((e) => e.type === 'gap').length
  const sleepMin =
    dayType === 'brutal' ? 554 - 100 : 1440 - 1415 + 450

  return (
    <div className="dp-root">
      <style>{CSS}</style>

      {/* dev chrome — mockup only, never ships */}
      <div className="dp-devbar">
        <span>DESIGN PREVIEW · MOCK DATA · NOT YOUR LOGS · DEV ONLY</span>
      </div>
      <div className="dp-devrow">
        <div className="dp-tabs">
          <button className={tab === 'today' ? 'dp-tab dp-tab-on' : 'dp-tab'} onClick={() => setTab('today')}>TODAY&apos;S AUDIT</button>
          <button className={tab === 'insights' ? 'dp-tab dp-tab-on' : 'dp-tab'} onClick={() => setTab('insights')}>INSIGHTS</button>
        </div>
        <div className="dp-daytoggle">
          <button className={dayType === 'brutal' ? 'dp-day dp-day-on' : 'dp-day'} onClick={() => setDayType('brutal')}>BRUTAL DAY</button>
          <button className={dayType === 'strong' ? 'dp-day dp-day-on' : 'dp-day'} onClick={() => setDayType('strong')}>STRONG DAY</button>
        </div>
      </div>

      {tab === 'today' ? (
        <>
          {/* 1. header */}
          <div className="dp-header">
            <span className="dp-brand">THE TIME MIRROR</span>
            <span className="dp-meta">now {fmtClock(d.nowMin)} · woke {fmtClock(d.wakeMin)}</span>
          </div>

          {/* 2. date block */}
          <div className="dp-dateblock">
            <h1 className="dp-h1">{d.date}</h1>
            <p className="dp-sub">
              woke {fmt12(d.wakeMin)} · sleep {d.bed} → {fmtClock(d.wakeMin)} · {fmtDur(sleepMin)}, inferred
            </p>
          </div>

          {/* 3. hero card — valence-tinted */}
          <section className={c.strong ? 'dp-hero dp-hero-green' : 'dp-hero dp-hero-red'}>
            <p className={c.strong ? 'dp-herolabel dp-green-ink' : 'dp-herolabel dp-red-ink'}>
              {c.strong ? 'TODAY’S PROOF' : 'TODAY’S DAMAGE'}
            </p>
            <p className={c.strong ? 'dp-heronum dp-green-ink' : 'dp-heronum dp-red-ink'}>{fmtDur(c.heroMin)}</p>
            <p className="dp-herosay">
              went to <strong>{c.strong ? 'Productive' : 'Distraction'}</strong>
            </p>
            <div className="dp-divider" />
            <p className="dp-herostab">— {stab}</p>
          </section>

          {/* 4. dial card */}
          <section className="dp-card">
            <p className="dp-label">THE 24-HOUR DIAL</p>
            <div className="dp-dial" dangerouslySetInnerHTML={{ __html: dialSVG(d, c) }} />
            <p className="dp-caption">The ring stops at now. Hours after now aren’t drawn — they aren’t yours yet.</p>
            <div className="dp-legend">
              <span><i style={{ background: DIAL_COL.prod }} />Productive</span>
              <span><i style={{ background: DIAL_COL.dist }} />Distraction</span>
              <span><i style={{ background: DIAL_COL.fuel }} />Life · Fuel</span>
              <span><i style={{ background: DIAL_COL.unclear }} />Unclear</span>
              <span><i className="dp-hatchdot" />Unlogged</span>
              <span><i style={{ background: '#E4C98F' }} />Sleep</span>
            </div>
          </section>

          {/* 5. stats grid — zero rows omitted */}
          <section className="dp-stats">
            <div className="dp-stat"><div className="dp-statlabel"><i style={{ background: DIAL_COL.prod }} />PRODUCTIVE</div><div className="dp-statnum" style={{ color: DIAL_COL.prod }}>{fmtDur(c.prod)}</div></div>
            {c.fuel > 0 && <div className="dp-stat"><div className="dp-statlabel"><i style={{ background: DIAL_COL.fuel }} />LIFE / FUEL</div><div className="dp-statnum" style={{ color: DIAL_COL.fuel }}>{fmtDur(c.fuel)}</div></div>}
            {c.unclear > 0 && <div className="dp-stat"><div className="dp-statlabel"><i style={{ background: DIAL_COL.unclear }} />UNCLEAR</div><div className="dp-statnum" style={{ color: DIAL_COL.unclear }}>{fmtDur(c.unclear)}</div></div>}
            <div className="dp-stat"><div className="dp-statlabel"><i style={{ background: DIAL_COL.dist }} />DISTRACTION</div><div className="dp-statnum" style={{ color: DIAL_COL.dist }}>{fmtDur(c.dist)}</div></div>
            <div className="dp-stat"><div className="dp-statlabel"><i style={{ background: DIAL_COL.dist }} />BLANK</div><div className="dp-statnum" style={{ color: DIAL_COL.dist }}>{fmtDur(c.blank)}</div></div>
            <div className="dp-stat"><div className="dp-statlabel"><i style={{ background: '#E4C98F' }} />SLEEP</div><div className="dp-statnum dp-amber-ink">{fmtDur(sleepMin)}</div></div>
          </section>

          {/* 6. comparison card */}
          <section className="dp-card">
            {c.prod === 0 ? (
              <p className="dp-body">no Productive was logged to outweigh.</p>
            ) : c.dist === 0 ? (
              <p className="dp-body">Productive ran unopposed today.</p>
            ) : (
              <>
                <div className="dp-ratio-row">
                  <span className={c.strong ? 'dp-ratio dp-green-ink' : 'dp-ratio dp-red-ink'}>
                    {fmtRatio(c.strong ? c.prod / c.dist : c.dist / c.prod)} : 1
                  </span>
                  <span className="dp-ratio-phrase">
                    {c.strong ? 'productive outran distraction' : 'distraction outran productive'}
                  </span>
                </div>
                <div className="dp-divider" />
                <div className="dp-minis">
                  <div>
                    <p className="dp-minilabel">LONGEST {c.strong ? 'FOCUS' : 'SCROLL'}</p>
                    <p className="dp-mininum">{fmtDur(c.strong ? c.maxProd : c.maxDist)}</p>
                  </div>
                  <div>
                    <p className="dp-minilabel">LONGEST {c.strong ? 'SCROLL' : 'FOCUS'}</p>
                    <p className="dp-mininum">{fmtDur(c.strong ? c.maxDist : c.maxProd)}</p>
                  </div>
                </div>
                <p className="dp-multiplier">
                  {c.strong
                    ? `focus ran ${fmtRatio(c.maxProd / c.maxDist)}× the scroll`
                    : `the scroll ran ${fmtRatio(c.maxDist / c.maxProd)}× your longest focus`}
                </p>
              </>
            )}
            {c.maxProd === 0 && <p className="dp-multiplier">Longest focus: none — nothing was held.</p>}
          </section>

          {/* 7. blank card + CTA */}
          <section className="dp-blank">
            <p className="dp-blankline">
              Since {fmt12(d.wakeMin)}, <strong>{fmtDur(c.blank)}</strong> is a complete blank.
            </p>
            <button className="dp-primary">
              <span>LOG THE MISSING HOURS</span>
              <span className="dp-primary-arrow">→</span>
            </button>
          </section>

          {/* 8. receipts — newest first, gaps inline */}
          <details className="dp-card dp-receipts">
            <summary>
              <span className="dp-label">THE RECEIPTS</span>
              <span className="dp-receipts-meta">{entryCount} entries · {gapCount} gaps · {c.written}% written ▾</span>
            </summary>
            <div className="dp-receipts-body">
              {receipts.map((e, i) => {
                if (e.type === 'gap') {
                  return (
                    <div key={i} className="dp-gaprow">[ {fmtDur(e.e - e.s)} GAP — UNLOGGED ]</div>
                  )
                }
                const chip = CHIPS[e.cat || 'UNCLEAR']
                return (
                  <div key={i} className="dp-rrow">
                    <span className="dp-rtime">{fmtClock(e.s)}–{fmtClock(e.e)} · {fmtDur(e.e - e.s)}</span>
                    <span className="dp-rlabel">{e.label}</span>
                    <span className="dp-rtag" style={{ background: chip.bg, color: chip.ink }}>{e.cat}</span>
                  </div>
                )
              })}
              <p className="dp-rend">{fmtClock(d.wakeMin)} — “woke up.” receipts begin.</p>
            </div>
          </details>

          {/* 9. rolling week — plain inline sentences, no chips, no streak */}
          <section className="dp-rolling">
            <p className="dp-rolling-line">
              LAST 7 DAYS · DISTRACTION — {fmtDur(ROLL.leakPerDay)} a day · {fmtDur(ROLL.leakPerDay * 7)} total.
            </p>
            <p className="dp-rolling-line">
              LAST 7 DAYS · PRODUCTIVE — {fmtDur(ROLL.prioPerDay)} a day · {fmtDur(ROLL.prioPerDay * 7)} total.
            </p>
            <p className="dp-rolling-note">flat rolling count · no streak · nothing here can be broken</p>
          </section>

          {/* 10. quote — only when blank > 0 */}
          {c.blank > 0 && (
            <p className="dp-quote">“We suffer more often in imagination than in reality.” — Seneca</p>
          )}
        </>
      ) : (
        <>
          {/* /insights — one card in the DOM at a time */}
          <div className="dp-dateblock">
            <h1 className="dp-h1">{c.strong ? 'WHAT IT BUILT.' : 'WHAT IT COST.'}</h1>
            <p className="dp-sub">{d.date} · one equivalence at a time — you rotate, the app never does</p>
          </div>

          <section className={c.strong ? 'dp-hero dp-hero-green dp-insight' : 'dp-hero dp-hero-red dp-insight'}>
            <p className={c.strong ? 'dp-herolabel dp-green-ink' : 'dp-herolabel dp-red-ink'}>{insight.tag}</p>
            <p className={c.strong ? 'dp-insightnum dp-green-ink' : 'dp-insightnum dp-red-ink'}>{insight.num}</p>
            <p className="dp-insightsay">{insight.say}</p>
            <div className="dp-divider" />
            <p className="dp-math">{insight.math}</p>
          </section>

          <button className="dp-primary" onClick={() => setAngleIndex((angleIndex + 1) % chain.length)}>
            <span>ANOTHER ANGLE</span>
            <span className="dp-primary-arrow">→</span>
          </button>

          <p className="dp-counter">{(angleIndex % chain.length) + 1} / {chain.length}</p>
        </>
      )}
    </div>
  )
}

/* ---------------- scoped CSS (design tokens from the brief, dp- prefixed) ---------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.dp-root{
  --bg:#F1EEE7; --card:#FFFFFF; --line:#E8E5DE;
  --ink:#1D1A17; --sub:#8B857B;
  --red:#C63B27; --red-soft:#FBEFEA; --red-line:#EFD6CD; --red-ink:#8F2F1F;
  --green:#2E6B4F; --green-soft:#ECF3EE; --green-line:#D3E3D8;
  --amber:#E4C98F; --amber-ink:#A8862D;
  --font:'Space Grotesk',-apple-system,'Segoe UI',Roboto,sans-serif;
  --mono:'IBM Plex Mono',ui-monospace,'SF Mono',Menlo,monospace;
  max-width:430px; margin:0 auto; padding:6px 0 34px;
  font-family:var(--font); color:var(--ink); background:transparent;
}
.dp-root *{box-sizing:border-box; margin:0; padding:0;}

/* dev chrome */
.dp-devbar{font-family:var(--mono); font-size:9px; letter-spacing:.14em; color:var(--sub);
  text-align:center; padding:6px 0 14px; border-bottom:1px dashed var(--line); margin-bottom:14px;}
.dp-devrow{display:flex; flex-direction:column; gap:10px; margin-bottom:18px;}
.dp-tabs{display:flex; background:#E4E1D7; border-radius:14px; padding:4px; gap:4px;}
.dp-tab{flex:1; font-family:var(--mono); font-size:11px; font-weight:600; letter-spacing:.07em;
  padding:9px 0; border:none; border-radius:11px; background:transparent; color:var(--sub); cursor:pointer;}
.dp-tab-on{background:#fff; color:var(--ink); box-shadow:0 1px 2px rgba(29,26,23,.08);}
.dp-daytoggle{display:flex; gap:8px;}
.dp-day{flex:1; font-family:var(--mono); font-size:10px; font-weight:600; letter-spacing:.07em;
  padding:8px 0; border-radius:99px; border:1px solid var(--line); background:transparent; color:var(--sub); cursor:pointer;}
.dp-day-on{background:var(--ink); color:#FBF9F4; border-color:var(--ink);}

/* header + date */
.dp-header{display:flex; justify-content:space-between; align-items:baseline; margin-bottom:14px;}
.dp-brand{font-family:var(--mono); font-size:12px; font-weight:600; letter-spacing:.12em;}
.dp-meta{font-family:var(--mono); font-size:11px; color:var(--sub);}
.dp-dateblock{margin-bottom:14px;}
.dp-h1{font-size:21px; font-weight:700; letter-spacing:-.01em;}
.dp-sub{font-size:13px; color:var(--sub); margin-top:3px;}

/* cards */
.dp-card{background:var(--card); border:1px solid var(--line); border-radius:20px;
  padding:20px; margin-bottom:14px; box-shadow:0 1px 2px rgba(29,26,23,.04);}
.dp-label{font-size:11px; font-weight:600; letter-spacing:.16em; text-transform:uppercase; color:var(--sub);}
.dp-caption{font-size:12px; color:var(--sub); line-height:1.5; text-align:center; margin-top:10px;}
.dp-body{font-size:15px; line-height:1.5;}
.dp-divider{height:1px; background:var(--line); margin:14px 0;}

/* hero */
.dp-hero{border-radius:20px; padding:20px; margin-bottom:14px;}
.dp-hero-red{background:var(--red-soft); border:1px solid var(--red-line);}
.dp-hero-green{background:var(--green-soft); border:1px solid var(--green-line);}
.dp-red-ink{color:var(--red-ink);} .dp-green-ink{color:var(--green);}
.dp-amber-ink{color:var(--amber-ink);}
.dp-herolabel{font-size:11px; font-weight:600; letter-spacing:.16em; text-transform:uppercase;}
.dp-heronum{font-size:58px; font-weight:700; letter-spacing:-.025em; line-height:1.05; margin-top:6px;}
.dp-herosay{font-size:19px; font-weight:600; margin-top:8px; color:var(--ink);}
.dp-herostab{font-size:15px; line-height:1.5; color:var(--ink);}
.dp-hero .dp-divider{background:rgba(29,26,23,.08);}

/* dial */
.dp-dial svg{width:100%; height:auto; display:block;}
.dp-legend{display:flex; flex-wrap:wrap; gap:6px 14px; justify-content:center; margin-top:12px;}
.dp-legend span{display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--ink);}
.dp-legend i{width:9px; height:9px; border-radius:3px; display:inline-block;}
.dp-hatchdot{background:repeating-linear-gradient(45deg,#CFC9BF 0 1.5px,#EFEDE7 1.5px 4px); border:1px solid var(--line);}

/* stats grid */
.dp-stats{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px;}
.dp-stat{background:var(--card); border:1px solid var(--line); border-radius:16px; padding:14px 16px;
  box-shadow:0 1px 2px rgba(29,26,23,.04);}
.dp-statlabel{display:flex; align-items:center; gap:6px; font-size:11px; font-weight:600;
  letter-spacing:.12em; color:var(--sub);}
.dp-statlabel i{width:9px; height:9px; border-radius:3px; display:inline-block;}
.dp-statnum{font-family:var(--mono); font-size:26px; font-weight:600; margin-top:8px; letter-spacing:-.02em;}

/* comparison */
.dp-ratio-row{display:flex; align-items:baseline; gap:12px; flex-wrap:wrap;}
.dp-ratio{font-size:44px; font-weight:700; letter-spacing:-.025em; line-height:1;}
.dp-ratio-phrase{font-size:14px; color:var(--sub);}
.dp-minis{display:flex; gap:24px;}
.dp-minilabel{font-size:10px; font-weight:600; letter-spacing:.14em; color:var(--sub);}
.dp-mininum{font-family:var(--mono); font-size:20px; font-weight:600; margin-top:4px;}
.dp-multiplier{font-size:13px; color:var(--sub); margin-top:12px;}

/* blank + primary */
.dp-blank{background:var(--red-soft); border:1px solid var(--red-line); border-radius:20px;
  padding:20px; margin-bottom:14px;}
.dp-blankline{font-size:16px; line-height:1.5; color:var(--red-ink); margin-bottom:14px;}
.dp-primary{width:100%; background:var(--ink); color:#FBF9F4; border:none; border-radius:14px;
  padding:16px 18px; font-family:var(--font); font-size:15px; font-weight:600; letter-spacing:.02em;
  display:flex; justify-content:space-between; align-items:center; cursor:pointer;}
.dp-primary-arrow{font-family:var(--mono);}

/* receipts */
.dp-receipts summary{list-style:none; cursor:pointer; display:flex; justify-content:space-between;
  align-items:baseline; gap:10px; flex-wrap:wrap;}
.dp-receipts summary::-webkit-details-marker{display:none;}
.dp-receipts-meta{font-family:var(--mono); font-size:11px; color:var(--sub);}
.dp-receipts-body{max-height:330px; overflow-y:auto; margin-top:14px; border-top:1px solid var(--line); padding-top:12px;}
.dp-rrow{display:flex; align-items:baseline; gap:10px; padding:7px 0; flex-wrap:wrap;}
.dp-rtime{font-family:var(--mono); font-size:11.5px; color:var(--sub); white-space:nowrap;}
.dp-rlabel{font-size:14px; flex:1; min-width:120px;}
.dp-rtag{font-family:var(--mono); font-size:10px; font-weight:600; letter-spacing:.07em;
  padding:3px 9px; border-radius:99px; white-space:nowrap;}
.dp-gaprow{font-family:var(--mono); font-size:11.5px; color:var(--red); padding:7px 0; letter-spacing:.02em;}
.dp-rend{font-family:var(--mono); font-size:11px; color:var(--sub); padding-top:12px; border-top:1px solid var(--line); margin-top:6px;}

/* rolling week — plain text, never chips */
.dp-rolling{padding:4px 2px 0; margin-bottom:14px;}
.dp-rolling-line{font-size:14px; line-height:1.6; color:var(--ink);}
.dp-rolling-note{font-family:var(--mono); font-size:10.5px; color:var(--sub); margin-top:6px; letter-spacing:.03em;}

/* quote */
.dp-quote{font-size:13px; font-style:italic; color:var(--sub); text-align:center; padding:6px 12px 0;}

/* insights */
.dp-insightnum{font-size:54px; font-weight:700; letter-spacing:-.025em; line-height:1.05; margin-top:6px;}
.dp-insightsay{font-size:21px; font-weight:600; margin-top:10px; line-height:1.35; color:var(--ink);}
.dp-math{font-family:var(--mono); font-size:11.5px; color:var(--sub); line-height:1.6;}
.dp-counter{font-family:var(--mono); font-size:11px; color:var(--sub); text-align:center; margin-top:12px;}
`
