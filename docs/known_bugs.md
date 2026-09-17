# Known Bugs & Failed Fixes Log
> AI MUST read this file before touching any parser, API route, or Supabase query.
> After fixing any bug, append a new entry here. Never delete entries — mark as FIXED.

---

## How to Read This File
- **SYMPTOM** — what the user or logs show
- **ROOT CAUSE** — the actual line/reason (not a guess)
- **FIX** — what actually worked, with file + line reference
- **FAILED ATTEMPTS** — what we tried that did NOT work (critical — prevents re-trying the same thing)
- **AI PROCESS** — what reasoning steps the AI used to find the fix

---

## BUG-001 — Wrong Gemini model name causes silent failure
**STATUS**: FIXED  
**FILE**: `app/src/app/api/parse/route.ts` line 84  
**SYMPTOM**: Parser returns 500 or times out; no useful error message  
**ROOT CAUSE**: `process.env.GEMINI_MODEL` was set to `'gemini-3.5-flash'` — a model name that doesn't exist. Gemini SDK fails silently or throws a non-obvious error.  
**FIX**: Validate model name on startup; default to `'gemini-2.0-flash'` (confirmed working model name)  
**FAILED ATTEMPTS**:
- Checking CORS/network (not the issue)
- Increasing timeout to 30s (not the issue)
- Checking API key validity (key was fine)

**AI PROCESS**: Checked env var → noticed model string didn't match known Gemini model names → confirmed by reading Google AI SDK docs

> **CORRECTION (2026-09-10)**: The "model doesn't exist" root cause was WRONG. Live API test with the user's key (`node test_gemini.js`) returned a valid parse from `gemini-3.5-flash` in seconds. `.env.local` sets `GEMINI_MODEL=gemini-3.5-flash` and it works. Parse latency = genuine Gemini generation time, not a model-name failure. Kept for history per the never-delete rule — do NOT "fix" the model name again.

---

## BUG-002 — Supabase `createClient()` called without `await` in server route
**STATUS**: WATCH (may recur)  
**FILE**: `app/src/app/api/parse/route.ts` line 51  
**SYMPTOM**: `user` is null even when logged in; 401 returned  
**ROOT CAUSE**: `createClient()` in some Supabase Next.js versions is async and must be `await`ed. Without it, cookies aren't read and auth fails.  
**FIX**: `const supabase = await createClient()` (check this whenever auth mysteriously fails)  
**FAILED ATTEMPTS**:
- Clearing browser cookies (not the issue)
- Checking RLS policies (policies were fine, client wasn't authed)

**AI PROCESS**: Compared server route against Supabase Next.js docs → found async createClient pattern → verified fix

---

## BUG-003 — JSON.parse fails on Gemini response wrapped in markdown fences
**STATUS**: MITIGATED (responseSchema should prevent, but may still occur)  
**FILE**: `app/src/app/api/parse/route.ts` line 102  
**SYMPTOM**: `SyntaxError: Unexpected token` on `JSON.parse(responseText)` even though Gemini returned valid JSON  
**ROOT CAUSE**: Gemini sometimes wraps JSON output in ` ```json ``` ` markdown fences despite `responseMimeType: "application/json"` being set. The raw string is not valid JSON.  
**FIX**: Strip fences before parsing:
```ts
const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
const parsedData = JSON.parse(cleaned)
```
**FAILED ATTEMPTS**:
- Trusting `responseMimeType: "application/json"` alone (not sufficient in all cases)
- Catching the error and retrying (doesn't address root cause)

**AI PROCESS**: Logged `responseText` before parse → saw fence characters → applied strip regex

---

## BUG-004 — `duration_minutes` string "unknown" instead of null
**STATUS**: RULE ADDED to prompt  
**FILE**: `app/src/lib/parser/prompt.ts` + `app/src/lib/parser/validators.ts`  
**SYMPTOM**: Validator throws or UI breaks because `duration_minutes` is the string `"unknown"` instead of `null`  
**ROOT CAUSE**: Earlier prompt versions didn't explicitly say `null` for unknown duration. Gemini inferred "unknown" as a reasonable string.  
**FIX**: Schema `nullable: true` + explicit prompt rule: "`duration_minutes` is a number or `null` — never the string 'unknown'"  
**FAILED ATTEMPTS**:
- Post-processing with type coercion (masks the bug, doesn't fix)

**AI PROCESS**: Logged raw parsed output → found string value → traced to missing nullable instruction in schema

---

## BUG-005 — Validator silently passes invalid time strings
**STATUS**: FIXED  
**FILE**: `app/src/lib/parser/validators.ts` lines 78-85  
**SYMPTOM**: `start_time` or `end_time` with invalid 24-hour ranges (e.g. `25:00`, `99:99`) passed validation and corrupted downstream calculations.  
**ROOT CAUSE**: Validator regex was loosely `/^\d{1,2}:\d{2}$/`, checking digit counts but allowing hour numbers >= 24 and minute numbers >= 60.  
**FIX**: Enforced strict 24-hour time regex `/^([01]?\d|2[0-3]):[0-5]\d$/` for `start_time` and `end_time`. Verified: `npx tsc --noEmit` clean, `npm run build` green.  
**FAILED ATTEMPTS**: None.  
**AI PROCESS**: Code inspection during deep audit → tightened regex to standard 24h clock constraints.

---

## BUG-006 — Eval harness broke after parser prompt refactor (compile blocker)
**STATUS**: FIXED
**FILE**: `app/evals/runner.ts` line 6
**SYMPTOM**: `npx tsc --noEmit` fails → `npm run build` fails → no change can be verified or shipped
**ROOT CAUSE**: The parser refactor renamed `buildParserPrompt` → `buildParserSystemInstruction` + `buildParserUserMessage` in `app/src/lib/parser/prompt.ts` and updated `parse/route.ts`, but `evals/runner.ts` still imported the old name. `tsconfig.json` includes `**/*.ts`, so the standalone eval script was inside the compile scope.
**FIX**: Updated the import and mirrored the production call shape (systemInstruction on the model + user-message contents), matching `parse/route.ts`. Verified: `npx tsc --noEmit` clean, `npm run build` green (2026-09-10).
**FAILED ATTEMPTS**: None — caught by typecheck before anything shipped.
**AI PROCESS**: tsc error named the exact file/line → checked prompt.ts exports → confirmed rename was the only breakage. Note: eval harness still lacks `responseSchema` (production uses it) — eval JSON shape may differ slightly from production; not fixed here.

---

## BUG-007 — Truth line and scoreboard blind to Fuel; stale daily_summaries showed "No time logged yet"
**STATUS**: FIXED
**FILE**: `app/src/lib/dashboard/truth.ts` line 7, `app/src/app/today/page.tsx` lines 55-92
**SYMPTOM**: Fuel-only day (gym 1h30m) shows "No time logged yet." and 0h 0m everywhere, while the timeline lists the gym entry. Fuel appears in no card.
**ROOT CAUSE**: Two compounding bugs. (1) `getTruthLine` treated `distraction===0 && productive===0` as "nothing logged" — Fuel wasn't a parameter. (2) The page read totals from `daily_summaries`, which was stale/zero because the save route's `parseInt(duration_minutes || '0')` counted null-duration entries as 0 (gym had start/end but null duration). The timeline computed duration from start/end for display, so card and summary disagreed.
**FIX**: (1) `getTruthLine(dist, prod, fuel, isToday)` with fuel-aware deterministic templates. (2) Today page computes totals LIVE from `time_entries` via `resolveDurationMinutes` (duration ?? start/end math) — `daily_summaries` is now only a cache for week views. Four cards: Productive / Lost / Fuel / Unlogged per visuals-spec §1. Unclear minutes count as logged (never unlogged, never lost).
**FAILED ATTEMPTS**: None — root cause traced before editing.
**AI PROCESS**: User screenshot showed timeline entry + zero summary → the two components read different sources → inspected both paths → found parseInt-null bug + fuel-blind template together.

---

## BUG-008 — good/mid/bad impact rating silently discarded on save
**STATUS**: FIXED
**FILE**: `app/src/app/api/save/route.ts` lines 24-34 (old)
**SYMPTOM**: User tags an entry "Good" on review; nothing changes anywhere; rating is never stored.
**ROOT CAUSE**: `impact_rating` lived only in ReviewClient state; the save route's insert payload never included it. (DB column `time_entries.impact_rating` already existed and was never written.)
**FIX**: Insert `impact_rating` (validated to good/mid/bad/null) and `needs_review` on `time_entries`; also mirrored into `ai_feedback.corrected_fields.impact_rating` when feedback rows are written. Review hint relabeled to "How did this serve your goals? (never changes your category)" so users don't expect it to change the category. NOTE: rating is a learning signal — it never alters category or summary math (Fuel never inflates productive hours).
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Grepped save payload vs ReviewClient state → field dropped between client and route → verified column exists via live schema introspection before writing.

---

## BUG-009 — Duration math inconsistency: parseInt vs start/end fallback; unlogged never computed
**STATUS**: FIXED
**FILE**: `app/src/app/api/save/route.ts` line 78, `app/src/app/api/entries/[id]/route.ts` line 73 (old)
**SYMPTOM**: Entries with null duration but valid times count as 0m in daily summaries while the timeline displays their real duration. `unlogged_minutes` column exists but was never written.
**ROOT CAUSE**: Both routes used `parseInt(e.duration_minutes || '0', 10)` — no fallback to end−start, and the actual DB stores duration as number not string.
**FIX**: New shared helper `app/src/lib/entries/summary.ts` (`resolveDurationMinutes` + `recomputeDailySummary`) used by both routes and the Today page. Same math everywhere; upserts `unlogged_minutes` (1440 − all logged buckets incl. Unclear). Also removed the duplicated ~35-line summary block from the delete route.
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Compared timeline's display math vs summary math → found the divergence → extracted one helper, three consumers.

---

## BUG-010 — `raw_fragment` not persisted in `time_entries`
**STATUS**: FIXED  
**FILE**: `app/src/app/api/save/route.ts` line 28, `app/src/app/today/TimelineList.tsx` line 330  
**SYMPTOM**: Timeline cards could not display the user's original raw text quotes because `raw_fragment` was never stored in the database.  
**ROOT CAUSE**: The `time_entries` Postgres table was missing the `raw_fragment text` column.  
**FIX**: Executed live database DDL migration `ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS raw_fragment text;` via PostgreSQL connection pooler (`aws-0-ap-southeast-1.pooler.supabase.com:6543`) and added `raw_fragment: e.raw_fragment || null` to the save insert payload. Timeline cards now display raw text quote snippets and reparse correctly. Verified: live DB schema introspection confirmed `raw_fragment text` exists; `npx tsc --noEmit` clean; `npm run build` green.  
**FAILED ATTEMPTS**: None.  
**AI PROCESS**: Connected directly to Supabase Postgres instance → executed migration in transaction → wired save insert payload.

---

## BUG-011 — Entry deletion aborted by ai_feedback cleanup failure
**STATUS**: FIXED
**FILE**: `app/src/app/api/entries/[id]/route.ts` lines 48-51 (old)
**SYMPTOM**: Delete fails with 500 "Failed to delete linked feedback"; entry stays on the timeline; daily summary never recomputed.
**ROOT CAUSE**: The route returned 500 early when the ai_feedback cleanup errored — treating a best-effort side cleanup as a blocker for the primary operation (entry deletion).
**FIX**: Downgraded feedback cleanup failure to `console.error` and continued to entry deletion + summary recompute.
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Read the delete flow end-to-end → noticed control flow made optional cleanup gate the primary delete → reordered severity.

---

## BUG-012 — Edit flow deleted the entry but opened an empty log box
**STATUS**: FIXED
**FILE**: `app/src/app/log/page.tsx`, `app/src/app/log/LogInput.tsx`
**SYMPTOM**: Clicking Edit on a timeline entry removes it, then /log shows an empty textarea — original text lost.
**ROOT CAUSE**: TimelineList correctly builds `?reparse=<fragment>`, but `log/page.tsx` didn't accept `searchParams` and `LogInput` took no props, so the param was read by nobody.
**FIX**: `LogPage` accepts `searchParams.reparse` and passes it as `initialText` to `LogInput`, which seeds `useState(initialText)`.
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Traced the Edit button's router.push target → checked the destination page's props → param never consumed. (Note: until BUG-010's `raw_fragment` column exists, reparse only has text for entries created before the column gap; the param is simply empty for affected rows.)

---

## BUG-013 — MapIterator spread breaks compile under current tsconfig target (TS2802)
**STATUS**: FIXED
**FILE**: `app/src/lib/dashboard/truth.ts` line 58 (new `getInsights` code, 2026-09-11)
**SYMPTOM**: `npx tsc --noEmit` fails with `TS2802: Type 'MapIterator<...>' can only be iterated through when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher` → `npm run build` blocked.
**ROOT CAUSE**: Wrote `[...someMap.values()]`. The app's tsconfig target is below ES2015 without `downlevelIteration`, so iterator spread syntax doesn't compile.
**FIX**: `Array.from(someMap.values())` — no tsconfig change needed (safer than loosening the target for one line).
**FAILED ATTEMPTS**: None — caught by typecheck before anything shipped.
**AI PROCESS**: tsc error named the exact line and the two possible remedies; chose the code-side fix over a compiler-flag change to keep the blast radius at zero.

---

## BUG-014 — Thinking-model latency collides with 25s timeout; timeout masquerades as "couldn't parse"
**STATUS**: FIXED
**FILE**: `app/src/app/api/parse/route.ts` (old line 82 timeout + line 10 single-key SDK client), `app/src/lib/parser/gemini-rest.ts` (new)
**SYMPTOM**: Parsing intermittently returns NOTHING — entire text lands in `unparsed_fragments` with zero entries. User: "its not fuckin parsing again". Not quota-related at time of failure.
**ROOT CAUSE**: `gemini-3.5-flash` is a thinking model (responses carry `thoughtSignature`). Measured with the real parser prompt + schema: 24.1s on a realistic day-log vs the route's 25s AbortController — 0.9s from the cliff. Any longer log/cold start/jitter trips the timeout, and the timeout fallback (all-unparsed + warning) looks identical to "parser failed". Evidence chain: (1) direct API probe = 200 OK, ruling out key/quota/model-name; (2) timing probe = 24.1s; (3) trivial-ping probe = 6.6–9.9s → regional network floor to generativelanguage.googleapis.com is ~7-10s, so thinking time + floor ≈ the abort threshold. The old SDK (@google/generative-ai 0.21.0, and even 0.24.1) has no `thinkingConfig` support, so the fix could not be expressed through it.
**FIX**: New shared REST transport `app/src/lib/parser/gemini-rest.ts` used by BOTH `/api/parse` and `evals/runner.ts` (one pipeline, no drift): direct `fetch` with `thinkingConfig: { thinkingBudget: 0 }` (extraction + few-shot examples need no reasoning), responseSchema + responseMimeType preserved verbatim, BUG-003 fence-strip restored (had gone missing from the route — plain `JSON.parse`), plus multi-key pool: `GEMINI_API_KEYS="k1,k2,..."` comma-separated with `GEMINI_API_KEY` fallback, round-robin per request, next-key retry on 429/5xx (quota rejects fail <1s so retries fit in maxDuration 30). Route returns 429 with a clear message when all keys are exhausted. Result: 24.1s → 14.1s on the same log (~11s headroom), 11/11 entries parsed.
**FAILED ATTEMPTS**:
- Upgrading @google/generative-ai to 0.24.1 hoping for thinkingConfig — not present in the deprecated SDK line at all (0 grep hits in types); reverted to 0.21.0 and went REST instead.
- (Avoided per BUG-001 correction: do NOT touch the model name.)
- (Avoided per pattern library: raising the timeout would treat the symptom — the latency itself is the problem.)
**AI PROCESS**: User reported "not parsing again" + pasted a free-tier quota table (suspected rate limits). Refused to jump to the quota conclusion: probe 1 (200 OK on live key) killed the quota theory, probe 2 (24.1s realistic-log timing) exposed the timeout collision, probe 3 (6.6–9.9s trivial ping) separated network floor from thinking time. Only then designed the fix; verified via a probe importing the production module itself.
**NOTE for the user**: to use the key pool, add `GEMINI_API_KEYS=key1,key2,key3` to `app/.env.local` (get extra free keys from other Google accounts). Without it, behavior is identical to before (single key). Localhost and Vercel both need the var set where they run.

---

## BUG-015 — /today verdict buffered the feedback loop: comfortable number, tombstone quote, no action CTA
**STATUS**: FIXED
**FILE**: `app/src/app/today/AuditReport.tsx` lines 42-47+59-94 (old), `app/src/app/today/page.tsx`, `app/src/lib/dashboard/truth.ts`
**SYMPTOM**: Dashboard shows "0m FOCUSED TODAY" in a soft grey box (comforting when nothing was logged), the Lao Tzu quote sits at the bottom like a tombstone, and nothing on the screen routes the user back to logging — the ADHD gut-punch/feedback loop never fires.
**ROOT CAUSE**: (1) `getVoidLine` existed in `truth.ts` with zero callers — the brutal verdict line was built but never wired to the screen. (2) The verdict number picked distraction/productive/focused, never the unknown time, so an unwritten day displayed as a neutral "0m". (3) `AuditReport` rendered `MirrorQuote` after the verdict and wrapped every section in `bg-surface` boxes that visually softened the truth.
**FIX**: Rewired `/today` per the gut-punch spec: verdict = huge ink Mono number of UNLOGGED minutes + `getVoidLine` deterministic line ("of your day so far is a complete blank. You logged 1h 30m of Fuel."); quote moved to the top as a tiny stone header buffer; all verdict/dial boxes removed (stark ink on paper); legend = tight inline dot chips matching dial arc hex; receipts collapsed behind a subtle text link; new full-width ink outline CTA "→ Log the missing hours" -> `/log` (rendered only when viewing today — Phase 1 logging is today-only). Also: `getInsights` dropped its unlogged insight (verdict owns it, no duplication; signature simplified to `getInsights(entries)`). `getTruthLine` untouched — eval harness still passes.
**FAILED ATTEMPTS**: None.
**AI PROCESS**: User reported the design "buffers the emotional impact" -> grepped callers of `getVoidLine` (zero) and `getTruthLine` (evals only) to map blast radius -> confirmed DayDial already implemented the Void ring per spec -> rewired presentation only; data math, save flow, and parser contracts untouched.

---

## BUG-016 — Dial void counted future hours; receipts had no ledger, so the verdict number couldn't be reconciled
**STATUS**: FIXED
**FILE**: `app/src/app/today/DayDial.tsx` (old line 140 full-circle void), `app/src/app/today/page.tsx` (old lines 69-71), `app/src/app/today/TimelineList.tsx`
**SYMPTOM**: Opening the app at 14:00 shows a full 24h of heavy grey void — implying ~10h more blank than the verdict's number (which is elapsed-based). Receipts list entry cards but no unlogged gaps, so the user can't verify the "15h 15m blank" claim — denial wins ("the app is buggy, I did more than that").
**ROOT CAUSE**: (1) DayDial drew the void as a full `<circle>` (24h denominator) while page.tsx computes `unlogged = elapsedIST − logged` (elapsed denominator) — the two visuals disagreed by the day's remaining hours. (2) `gapAfter()` only rendered hairline dividers BETWEEN anchored consecutive entries — no leading (00:00→first) or trailing (last→now) gaps, so the ledger never summed to the verdict. (3) `getVoidLine` returned a flat string, leaving no safe way to bold trigger words without fragile string matching.
**FIX**: (1) DayDial takes `nowMinutes` (elapsed IST for today, null for past dates): the void renders as an arc 00:00→now with future hours transparent; past days keep the full 24h ring. (2) TimelineList is now a ledger: entries sorted chronologically (timed by start, untimed last — never guessed), dashed GapRows for leading/between/trailing gaps labeled "Xh Ym gap — unlogged" (title preserves "unknown, not wasted"); `boundaryMinutes`/`boundaryLabel` passed from the server so server and client agree (no client `Date.now()` → no hydration drift). (3) `getVoidLine` returns `{ line, emphasis }`; AuditReport bolds only the emphasis phrase; the positive fully-written-day line keeps `emphasis: null` and never bolds. Verdict number now weight 700. Quote relocated to the very bottom (12px, `#A8A29E`) per the user's iteration on the rendered screen.
**FAILED ATTEMPTS**: None.
**AI PROCESS**: User spotted the future-time loophole -> verified against code (full-circle stroke vs elapsed-based math = two denominators) -> made ONE time source (`elapsedIstMinutes` on the server) feed the verdict number, the dial void, and the ledger boundary, so all three reconcile exactly for fully-timed days; untimed entries break the sum by design and are footnoted honestly rather than placed by guesswork.

---

## BUG-017 — Bare "waste" classified Unclear; multi-line logs intermittently dropped trailing lines
**STATUS**: FIXED (code verified; final temperature-0 stability re-probe pending quota reset — see NOTE)
**FILE**: `app/src/lib/parser/prompt.ts`, `app/src/lib/parser/gemini-rest.ts` (generationConfig)
**SYMPTOM**: (1) "1:30 pm to 2:30 pm waste" parsed as Unclear instead of Distraction, forcing manual reclassification on every such card. (2) Multi-line logs (one activity per line) intermittently lost trailing lines — e.g. a 4-line log parsed to 1 entry, with the loss only visible as V8 warnings the review UI never displays.
**ROOT CAUSE**: (1) The prompt taught "wasted" only inside one buried few-shot example; the "ambiguous -> Unclear" rule correctly fired on the bare word "waste" because no rule marked explicit waste wording as a self-report. (2) `callGeminiParser` never set `temperature` — Gemini sampled at default and occasionally drifted off the multi-line split; the prompt also had zero multi-line few-shot examples (all examples were single-line).
**FIX**: Three changes, all verified through the production modules via a temp-dir probe (`callGeminiParser` + `runValidators` compiled from source — no repo probe files): (a) prompt rule: explicit waste words -> Distraction, "did nothing" stays Unclear; (b) prompt few-shot example mirroring the exact two-line format ("waste" / "gym" -> Distraction + Life/Fuel, never merged or dropped); (c) `temperature: 0` in the REST transport for deterministic extraction.
**EVIDENCE**: Baseline prompt: user's 2-line input split 2/2 entries but "waste"->Unclear; 4-line input split 4/4. After rule-only: "waste"->Distraction 4/4, but 2-line input dropped the gym line in 2 of 4 runs (line drops are stochastic, not tied to one input). After rule+example: 2-line input 2/2 perfect. After temperature-0: probe blocked — both pool keys hit the daily free-tier 429 (pool failover itself worked as designed).
**FAILED ATTEMPTS**: Rule line alone (without the few-shot example) — fixed classification but did not stabilize line splits; one rule-only run also dropped 3 of 4 lines on the multi-line variant.
**AI PROCESS**: PLAN_DEEP map of the full pipeline (prompt -> REST transport -> validators -> sessionStorage -> review cards -> bulk save) proved multi-entry support already existed end-to-end; probed the user's exact input before editing; treated each new failure as evidence (classification -> rule; stochastic drops -> example + temperature 0) instead of stacking more instructions.
**NOTE**: After quota resets (~12:30 PM IST), re-run the stability probe: 2x two-line input + 2x four-line input; expect 4/4 with zero "Missing time token coverage" warnings. If drops persist at temperature 0, next lever is a single deterministic retry inside `/api/parse` when V8 coverage warnings fire — NOT more prompt text.

> **CORRECTION (2026-09-11, later same day)**: The `temperature: 0` part of this fix was WRONG — it hangs gemini-3.5-flash server-side (see BUG-020). Removed the same day it was added. The rule line + multi-line few-shot example parts remain valid and verified. Kept for history per the never-delete rule — do NOT re-add temperature to the parser generationConfig.

---

## BUG-018 — Dev server serves raw unstyled HTML: every static asset 404s after a force-killed/crashed dev server
**STATUS**: FIXED (cache wipe; code needed no structural repair)
**FILE**: `app/.next/` (corrupted dev build cache) — no source file was the cause
**SYMPTOM**: `/log` renders as a raw text dump — chips as plain text, bottom nav "floating unstyled", no visible form. Looks exactly like a broken rewrite of the page.
**ROOT CAUSE**: The `.next` dev cache was corrupted (webpack runtime referencing missing chunks: `Cannot find module './787.js'`, ENOENT `vendor-chunks/cookie.js`, failing `PackFileCacheStrategy` packs) after the dev server was force-killed mid-write (PID kill during the earlier hang). The server then served page HTML (200) while EVERY static asset — including `/_next/static/css/app/layout.css` — returned 404. Unstyled HTML + no JS = the "raw dump" the user saw. The page code itself contained the complete styled form the whole time.
**FIX**: Stop dev server -> `Remove-Item .next -Recurse -Force` -> restart -> first compile regenerates everything. Verified: `GET /login 200` and `GET /_next/static/css/app/layout.css 200`. Also applied the user's requested /log spec deltas while in there: 24px hero question (was 18px), 3 new chips ("Traded 2h", "1h gym", "Wasted 45m on phone"), new placeholder, 24px side padding on the global wrapper, 14px `#78716C` date header, desktop-only autofocus (mobile keyboard pop avoided), textarea fills the screen via flex, and removed the invalid nested `<main>` + unused `createClient()` from the log page.
**FAILED ATTEMPTS**: None — asset 404s in the dev log pointed at the cache before any UI rewrite happened.
**AI PROCESS**: User reported "completely broken layout, raw text dump" -> refused to rewrite blind: pulled dev server logs -> found CSS/JS 404s + webpack MODULE_NOT_FOUND inside `.next` -> concluded cache corruption, not code -> wiped and verified assets 200 -> only then applied the (real but cosmetic) spec deltas. RULE: "unstyled raw dump" in dev = check asset 404s in server logs FIRST; wiping `.next` is the 30-second fix. Also: never force-kill the dev server if avoidable — use the stop action so it can flush chunk writes.

---

## BUG-019 — App silently ran on system fonts; second dev-cache corruption (prod build while dev running)
**STATUS**: FIXED
**FILE**: `app/src/app/layout.tsx` (old Inter import), `app/globals.css:18`, `app/.next/` (corrupted again)
**SYMPTOM**: (a) All "Geist" typography was fake — the app rendered system fonts. (b) After a restyle + build, the dev server served unstyled pages again (all static assets 404, `Cannot find module './787.js'`).
**ROOT CAUSE**: (a) `layout.tsx` loaded Inter as `--font-inter`, but `globals.css` body rule referenced `--font-geist-sans` — an undefined variable — and the `font-sans` utility (default Tailwind stack) out-cascaded the body rule anyway; `font-mono` resolved to the OS mono stack. Two wiring mistakes compounding: the design doc's mandated fonts (Geist Sans/Mono) were never installed. (b) `npm run build` was executed while the dev server was running — the production build overwrote `.next` mid-flight and broke the dev webpack runtime (same corruption signature as BUG-018, different trigger).
**FIX**: (a) Installed the `geist` package; layout imports `GeistSans`/`GeistMono` variables on `<body>`; Tailwind `fontFamily.sans`/`mono` now bind to `--font-geist-sans`/`--font-geist-mono`; verified the served CSS defines both variables with the woff2 sources. (b) Stop dev -> wipe `.next` -> restart; assets serve 200 again.
**FAILED ATTEMPTS**: None — both causes found by reading the served CSS/log output before editing further.
**AI PROCESS**: User's spec said "Font: Geist Mono" -> checked whether Geist actually existed in the app -> found the variable mismatch (grep layout vs globals) -> fixed with the official package rather than assuming `font-mono` was already Geist. Second corruption diagnosed from dev logs showing asset 404s right after a production build — the only mutating step in between.
**RULE**: NEVER run `npm run build` while `npm run dev` is live on this machine — stop the dev server first or accept the 30-second `.next` wipe cost.

---

## BUG-020 — temperature: 0 hangs gemini-3.5-flash; review UI swallowed the reason (silent all-unparsed)
**STATUS**: FIXED
**FILE**: `app/src/lib/parser/gemini-rest.ts` (generationConfig, old `temperature: 0`), `app/src/app/api/parse/route.ts` (timeout warning copy), `app/src/app/review/ReviewClient.tsx` (warnings never rendered)
**SYMPTOM**: User logs "4 pm to 4.30 pm prayer and snack" -> review page shows the ENTIRE text under "Unparsed fragments (ignored)" with zero entries and zero explanation. User asks "why this".
**ROOT CAUSE**: Two compounding failures. (1) BUG-017 added `temperature: 0` to the parser generationConfig and shipped it unverified (final stability probe was quota-blocked). Isolation probe proved `temperature: 0` + this responseSchema makes gemini-3.5-flash hang server-side: identical full payload WITHOUT temperature = HTTP 200 in 1.9s; WITH temperature: 0 = zero-byte stall past 40s. The route's 25s AbortController then fired the timeout fallback, which returns ALL text as unparsed_fragments. (2) ReviewClient read only `date`/`entries`/`unparsed_fragments` from the parse result — the `warnings` array (which contained "Parser timeout exceeded 25s") was never rendered, so the actual reason was invisible to the user.
**FIX**: (a) Removed `temperature: 0` from `callGeminiParser` (left a DO-NOT-SET comment with the evidence); default temperature verified fine all day (2-14s). (b) Timeout warning is now user-actionable copy: "Parser timed out after 25s — nothing was saved. Copy your text from below, go back, and tap 'Parse my day' again." (c) ReviewClient renders `warnings` in an amber "Parser notes" box above the unparsed list — the app can no longer silently swallow parser reasons.
**EVIDENCE**: Per-key probes: key #1 429 (quota, fails fast), key #2 200 in 1.2s on tiny generateContent -> ruled out key/network; full-payload A/B: no-temp 200/1.9s vs temp-0 AbortError/40s -> temperature is the variable. Post-revert verification: the user's exact input parses in 2.0s to one clean entry (16:00-16:30, Life/Fuel, 30m, no warnings) — including dot-notation "4.30 pm" handled correctly.
**FAILED ATTEMPTS**: Raising the timeout (the hang is unbounded — 40s abort still zero bytes); blaming quota or the key pool (both disproven by probes); blaming the dotted-time input (model converts "4.30 pm" -> 16:30 fine).
**AI PROCESS**: User reported a fragment in "Unparsed fragments (ignored)" -> could not diagnose from the review screen alone (the reason was structurally invisible — that gap became fix (c)) -> probed the exact input through production modules with the RAW model output -> probe hung 45s+ -> isolated variables one at a time (per-key curl, tiny vs full payload, temperature on/off) -> single-variable A/B nailed temperature: 0.
**RULE**: Every `generationConfig` knob on this model gets an isolated A/B probe BEFORE shipping, and the parse result's `warnings` must always be rendered — a warning nobody sees is a bug, not a feature.

---

## BUG-021 — Reverse-order receipts crashed on the oldest entry: gapAfter guarded the wrong parameter
**STATUS**: FIXED
**FILE**: `app/src/app/today/TimelineList.tsx` lines 112-114 (old)
**SYMPTOM**: Unhandled Runtime Error on `/today` when receipts are expanded: `TypeError: Cannot read properties of undefined (reading 'end_time')` at `gapAfter` line 114.
**ROOT CAUSE**: The reverse-chronological change (same day) swapped the call convention from `gapAfter(entry, next)` to `gapAfter(prev, entry)` but left the undefined-guard on parameter `b`. For the OLDEST entry — last index of the reversed `display` array — `display[i + 1]` is `undefined` and is passed as `a`, so `a.end_time` threw. Two checks failed to catch it: (1) `noUncheckedIndexedAccess` is off, so TypeScript types `display[i + 1]` as `Entry` and the compiler believed `prev` was always defined; (2) the pre-ship walkthrough traced "last entry: prev=undefined -> gap null" by assuming the guard covered it — it covered the OTHER parameter. Process failure: the argument-order swap changed a function's implicit contract and the blast-radius check was not re-run on the function itself.
**FIX**: Both parameters widened to `Entry | undefined` with a single guard: `if (!a || !b) return null`. One call site, local function — no other consumers.
**EVIDENCE**: Runtime harness (verbatim logic copy) covering the crash row + user's example set + single-entry ledger: row with `prev=undefined` returns null (pre-fix: throws); gaps 75m and 135m computed correctly; tsc clean; production build green; dev server serving.
**FAILED ATTEMPTS**: None after diagnosis — but note tsc and `npm run build` BOTH passed on the crashing code. They compile, they do not execute React render paths; neither can catch an array-index undefined that the type system has been told cannot happen.
**AI PROCESS**: User reported the exact stack trace with source excerpt -> the line numbers matched the function I had just refactored -> read the signature vs the call site -> saw the guard/param mismatch in one pass -> audited every other array access in the file for the same pattern (firstTimed/lastTimed guarded; JSX uses optional chaining; only gapAfter was exposed).
**RULE**: When inverting or reordering a function's arguments, re-verify the guards against the NEW call convention, not the old one. And: a mental walkthrough must check what the code DOES, not what the guard was SUPPOSED to do. (Candidate follow-up, deliberately deferred as out-of-scope for the hotfix: enable `noUncheckedIndexedAccess` in tsconfig — BROADCAST impact, would flag array accesses app-wide.)

---

## PATTERN LIBRARY — Do Not Try These

| What looks tempting | Why it fails |
|---|---|
| Setting `temperature: 0` for "deterministic" parser output | Hangs gemini-3.5-flash server-side with this responseSchema — zero-byte stall, trips the 25s timeout (BUG-020) |
| Increasing timeout to fix parse errors | Timeouts are a symptom, not a cause |
| Adding more instructions to prompt | Usually makes hallucination worse, not better |
| Catching errors and retrying silently | Masks bugs, makes diagnosis impossible |
| Trusting `responseMimeType` to guarantee JSON format | Gemini doesn't always honor it |
| Checking RLS before checking auth | Auth (session/cookie) must be verified first |

---

## BUG-022 — Timeline sorted by created_at instead of start_time
**STATUS**: FIXED
**FILE**: `app/src/app/today/page.tsx` line 50
**SYMPTOM**: Entries on the Today page appear out of chronological order, breaking visual gap calculation.
**ROOT CAUSE**: The Supabase query sorted by `created_at` (`.order('created_at', { ascending: true })`).
**FIX**: Changed to sort by `start_time`.
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Read the code for `today/page.tsx`, spotted the `order` clause on `created_at`.

---

## BUG-023 — ai_feedback lexicon count leaked across users
**STATUS**: FIXED
**FILE**: `app/src/lib/parser/context.ts` line 7
**SYMPTOM**: A user could pass the >= 10 corrections gate because of another user's corrections.
**ROOT CAUSE**: The `count` query on `ai_feedback` was not filtered by `user_id`.
**FIX**: Appended `.eq('user_id', userId)` to the count query.
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Code inspection based on gap analysis.

---

## BUG-024 — Foreign hourlyRate in Profile broke compile and violated core time philosophy
**STATUS**: FIXED
**FILE**: `app/src/app/design-preview/page.tsx` line 182
**SYMPTOM**: `npx tsc --noEmit` and `npm run build` failed with `TS2741: Property 'hourlyRate' is missing in type '{ birthYear: number; priorityLabel: string; }' but required in type 'Profile'`.
**ROOT CAUSE**: An experimental mockup in `design-preview/page.tsx` defined `hourlyRate: number` in `interface Profile` with a comment referencing money equivalences. It was omitted in `PROFILE` on line 238, failing strict TypeScript compilation. Furthermore, money/hourly wage concepts violate the project's core philosophy (a pure time-awareness mirror, not a wage calculator).
**FIX**: Purged `hourlyRate` from `interface Profile`. Verified: `npx tsc --noEmit` exits clean (0 errors), `npm run build` completes with 13/13 pages generated successfully.
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Compiler error pointed directly to the line → checked interface definition vs object literal → recognized both the type mismatch and the direct violation of `docs/product-plan.md` scope guardrails → removed the foreign field completely.

---

## BUG-025 — Middleware auth check intercepted PWA manifest and service worker
**STATUS**: FIXED
**FILE**: `app/src/middleware.ts` line 17, `app/src/utils/supabase/middleware.ts` lines 36-50
**SYMPTOM**: Unauthenticated visitors or mobile browser PWA engine received a 307 redirect to `/login` when fetching `/manifest.json` or `/sw.js`, breaking install prompts and offline registration.
**ROOT CAUSE**: The middleware matcher only excluded image files, favicon, and `_next/` assets. `updateSession` checked only `request.nextUrl.pathname.startsWith('/login')`, treating `/manifest.json` and `/sw.js` as protected routes that redirect to `/login` when no user session exists.
**FIX**: (1) Added `manifest\.json` and `sw\.js` to `middleware.ts` matcher exclusions. (2) Defined `publicPaths = ['/login', '/manifest.json', '/sw.js', '/icon-192.png', '/icon-512.png']` in `utils/supabase/middleware.ts` and narrowed login redirect to `/login` paths only. Verified: clean `npx tsc --noEmit`, `npm run build` green (13/13 pages).
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Traced request path for PWA assets against the middleware regex and `isPublicRoute` definition → identified false 307 on `/manifest.json` → added exact asset exemptions.

---

## BUG-026 — PATCH /api/entries/[id] lacked payload validation and field whitelist
**STATUS**: FIXED
**FILE**: `app/src/app/api/entries/[id]/route.ts` lines 95-150
**SYMPTOM**: Arbitrary fields could be updated on `time_entries` records via PATCH. Passing non-object JSON caused an unhandled 500 TypeError (`delete updates.id`), and invalid categories or missing durations went unvalidated.
**ROOT CAUSE**: The route parsed `await req.json()`, only deleted `id`, `user_id`, and `created_at`, and passed the remaining raw body directly to Supabase `.update()`.
**FIX**: Enforced JSON object validation and strict field whitelisting (`activity`, `category` restricted to 5 allowed categories, `start_time` and `end_time` format validation, `impact_rating` check, and automatic recalculation of `duration_minutes` when start/end times change). Verified: clean `npx tsc --noEmit`, `npm run build` green (13/13 pages).
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Code inspection during deep audit → identified unrestricted mass-assignment vulnerability → wrote explicit whitelist with duration recalculation.

---

## BUG-027 — Edit flow prematurely deleted entries from DB, causing data loss
**STATUS**: FIXED
**FILE**: `app/src/app/today/TimelineList.tsx` lines 150-250
**SYMPTOM**: Clicking "Edit" on a timeline card immediately deleted the entry from Supabase. Because `raw_fragment` does not yet exist in the DB (BUG-010), the reparse parameter was empty, redirecting the user to `/log` with an empty textarea and permanently destroying their logged entry.
**ROOT CAUSE**: `handleEdit` executed `DELETE /api/entries/${entry.id}` before the user ever saw an edit interface or saved a replacement.
**FIX**: Replaced the destructive delete-and-redirect with non-destructive in-place card editing (activity text input, category select, and start/end time inputs) that submits to the hardened `PATCH /api/entries/${entry.id}`. Added safe "Open in /log" secondary option that does NOT delete the entry. Verified: `npx tsc --noEmit` clean, `npm run build` green (13/13 pages).
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Deep audit mapped blast radius → identified data-destruction flaw → decoupled editing from record deletion and implemented inline PATCH form.

---

## BUG-028 — Missing user_id query filters, invalid date crashes, and week heatmap truth distortions
**STATUS**: FIXED
**FILE**: `app/src/app/today/page.tsx` lines 14-54, `app/src/app/week/page.tsx` lines 5-75, `app/src/app/log/page.tsx` lines 9-37
**SYMPTOM**: (1) Visiting `/today?date=xyz` crashed with unhandled 500 error (`RangeError: Invalid time value`). (2) Future dates could be navigated into, falsely reporting a 24h blank void before the day started. (3) Heatmap day names shifted back by one day in UTC server runtimes. (4) An empty week displayed false praise ("A solid week, but distraction creeping up."). (5) Database queries on `/today`, `/week`, and `/log` omitted `.eq('user_id', user.id)`.
**ROOT CAUSE**: `prevDateObj.toISOString()` had no validation on input date; forward navigation was unconstrained; `new Date(s.date).getDay()` ran against UTC midnight; week headline condition `totalDist > totalProd` fell through to "A solid week" on 0m; and queries relied solely on RLS without application-level defense-in-depth scoping.
**FIX**: (1) Validated date regex `/^\d{4}-\d{2}-\d{2}$/` and clamped future dates to today. (2) Restricted forward navigation to dates `<= istDateStr`. (3) Parsed heatmap day names in midday IST (`${s.date}T12:00:00+05:30`). (4) Added explicit empty-week state ("No time logged this week — the record is blank.") to protect truth integrity. (5) Scoped queries across `/today`, `/week`, and `/log` with `.eq('user_id', user.id)`. Verified: `npx tsc --noEmit` clean, `npm run build` green (13/13 pages).
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Full-site deep audit mapped gaps against `docs/product-plan.md` requirements → fixed privacy defense-in-depth and truth integrity across all dashboard views.

---

## BUG-029 — AI feedback corrections attached to wrong entry ID and empty entries array insert
**STATUS**: FIXED
**FILE**: `app/src/app/api/save/route.ts` lines 16 & 45-64, `app/src/app/review/ReviewClient.tsx` line 239
**SYMPTOM**: When saving review corrections where multiple entries shared an activity/category or where non-initial entries were modified, `ai_feedback` rows were inserted with incorrect `entry_id` references pointing to unrelated entries. Furthermore, saving an empty entries array attempted an empty insert to Supabase instead of rejecting cleanly.
**ROOT CAUSE**: `feedbackEntries` was created via `entries.filter(...)`. Inside `feedbackEntries.map((e, index) => ...)`, the code attempted to find the entry by `dbE.activity === e.activity && dbE.category === e.category` and fell back to `insertedEntries[index].id`. Because `index` was the index of the filtered array (not the full entries array) and `find` collided on repeated activity names, feedback rows attached to the wrong `time_entries` record.
**FIX**: (1) Iterated the original `entries` list by index `i`, mapping directly to `insertedEntries[i].id` when `ai_misread` or `edited` is flagged. (2) Added `entries.length === 0` validation to return a 400 'No entries to save' in `/api/save`, and disabled the save button in `ReviewClient.tsx` when no entries remain. Verified: `npx tsc --noEmit` clean, `npm run build` green (13/13 pages).
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Traced database insert pipeline from client review state to Postgres tables → discovered index mismatch between filtered array and insertion results → converted to direct 1-to-1 index alignment.

---

## BUG-030 — False V4_INVENTED_TIME on midnight entries and untimed entry overlap distortion
**STATUS**: FIXED
**FILE**: `app/src/lib/parser/validators.ts` lines 145-152 & 163-186
**SYMPTOM**: (1) Legitimate midnight entries (e.g. "12 am to 1 am studied") were flagged with `V4_INVENTED_TIME`, adding false warning badges. (2) Untimed entries (e.g. "read 30 mins") with `start_time: null` were treated as 00:00, being shoved to midnight in chronological sort and triggering spurious `V5_OVERLAP` warnings against real morning entries.
**ROOT CAUSE**: (1) `h12` calculation evaluated `0 > 12 ? 0 - 12 : 0` which yielded `0` instead of `12` for hour `0`. Because user input wrote "12", checking for string `'0'` failed. Also failed to recognize keyword "midnight". (2) `(timeToMinutes(a.start_time) || 0)` coerced `null` to `0`, inappropriately conflating untimed entries with 00:00 midnight entries.
**FIX**: (1) Corrected 12-hour translation for hour 0: `const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h)` and added check for keyword `'midnight'`. (2) Filtered entries for V5 overlap to include only entries with both `start_time !== null && end_time !== null`, and sorted `finalEntries` by placing untimed entries cleanly at the end without polluting timed sorting. Verified: `npx tsc --noEmit` clean, `npm run build` green (13/13 pages).
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Analyzed validator edge cases → traced false positives on 12-hour midnight conversion and untimed null-start handling → fixed conversion logic and partitioned overlap scope.

---

## BUG-031 — Horizontal flex layout squashed error messages and generic error swallowed API 429 messages
**STATUS**: FIXED
**FILE**: `app/src/app/log/LogInput.tsx` lines 58-72 & 77
**SYMPTOM**: When a parsing error occurred (such as Gemini 429 quota exhaustion), the error text was placed in a horizontal flex layout with the `<textarea>`, which squeezed or pushed the error message off-screen. Furthermore, the catch block swallowed all server response error messages into a generic `"We had trouble parsing that. Please try again."`, preventing users from knowing their daily Gemini quota had run out.
**ROOT CAUSE**: The outer textarea wrapper used `<div className="relative mb-6 flex-1 flex">` with default flex-row layout. `handleSubmit` only checked `if (!response.ok) throw new Error('Failed to parse text')` without reading the error payload from the JSON response.
**FIX**: (1) Changed container layout to `flex flex-col` so error messages render vertically inline directly below the textarea. (2) Extracted `response.json().error` message from non-200 responses to display the actual server status (e.g., quota notices) in calm inline stone text per `docs/design-input-screen.md`. Verified: `npx tsc --noEmit` clean, `npm run build` green (13/13 pages).
**FAILED ATTEMPTS**: None.
**AI PROCESS**: Examined input screen layout and submit handler → identified flex-row collision between textarea and error paragraph → structured column flow and propagated server API errors.

---

## Template — Add New Bug Here

```
## BUG-XXX — [short title]
**STATUS**: OPEN | FIXED | WATCH
**FILE**: [filepath] line [N]
**SYMPTOM**: [what the user sees]
**ROOT CAUSE**: [exact cause with evidence]
**FIX**: [what worked]
**FAILED ATTEMPTS**: [what didn't work — be specific]
**AI PROCESS**: [what reasoning steps led to the fix]
```
