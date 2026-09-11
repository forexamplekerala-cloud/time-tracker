# Visuals Specification

Exactly four visuals, built exceptionally well — no chart sprawl. Lost vs Unlogged distinction is sacred in every visual.

## 1. Today's Verdict (on `/today`)
Editorial-paper layout, left-aligned text, thin rules — no cards, boxes, or backgrounds anywhere below the dial. Order: mono header (18px/600/uppercase/0.1em tracking) -> Day Dial -> centered inline legend chips -> 1px `#E7E5E4` rule -> Verdict -> 1px rule -> receipts toggle -> CTA -> quote footnote. Verdict: 48px/700 Geist Mono ink number = UNLOGGED time; truth line 16px/400 ink with ONLY the trigger phrase bolded (`emphasis`); sub-line 14px `#78716C` (`detail`, null when nothing logged); positive outcomes never bolded; tiny regular-weight insight lines (biggest leak / longest focus block). Fonts: Geist Sans (UI) + Geist Mono (numbers) via the `geist` package, bound to Tailwind `font-sans`/`font-mono`.

## 2. Day Dial (on `/today`)
24-hour radial ring: entries as colored arcs at true clock positions (00:00 top). Unlogged time = a heavy, dense stone-grey ring (`#D6D3D1`) — the Void, not an empty background. On today's view the Void covers ELAPSED time only and stops at the current hour; the rest of the day stays transparent (future time is not a blank). Past dates render the full 24h Void. Center: `% of day written` only (never focused time). Motion budget: one entrance sweep + count-up, re-triggered only when entry data changes; gated by `prefers-reduced-motion`; zero idle animation. Entries without times are never placed by guesswork — counted in a footnote and visible in receipts.
- Arc colors: Green (Trading/Deep Work), Blue (Agency/Business), Red (Distraction), Yellow (Life/Fuel), Gray (Unclear)

## 3. Closing the Loop (on `/today`)
Receipts collapsed behind a subtle text link ("Show receipts (N entries) ↓"). Expanded, receipts are a LEDGER in REVERSE chronological order (newest entry first — the user sees their latest action and the gap leading up to it without scrolling): trailing gap (last end -> now) renders at the TOP as the freshest blank, then entries newest->oldest each followed by its dashed gap row ("Xh Ym gap — unlogged", labeled with the older neighbor's end -> this entry's start), then the leading gap (00:00 -> first start) at the BOTTOM, then untimed entries (position never guessed) with an honest footnote. Gaps only where real time anchors exist; untimed entries get an honest footnote. The ledger boundary comes from the server (elapsed IST) so gaps + logged minutes reconcile with the verdict number. Below receipts, a full-width ink outline CTA "→ Log the missing hours" links to `/log` (today's view only) — converts the gut-punch into immediate logging action. The quote is a 12px `#A8A29E` italic afterthought at the very bottom, above the nav.

## 4. Productive vs Lost Stacked Horizontal Bar
Weekly version on `/week`. The daily split on `/today` is carried by the Day Dial legend chips (minutes per category) instead of a second chart — no chart sprawl.

## 5. Weekly Heatmap
7 day-columns colored green -> red by productive ratio + weekly truth line (e.g. "This week, you lost 7h 40m to distraction. That is nearly one full workday you handed away.").
