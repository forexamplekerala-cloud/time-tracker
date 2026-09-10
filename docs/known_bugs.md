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
**STATUS**: OPEN  
**FILE**: `app/src/lib/parser/validators.ts`  
**SYMPTOM**: `start_time` of `"9:0"` or `"9 am"` passes validation even though 24-hour HH:MM is required  
**ROOT CAUSE**: Validators check presence but not format. No regex enforcing `HH:MM` pattern.  
**FIX (pending)**: Add regex `/^\d{2}:\d{2}$/` check on `start_time` and `end_time` in validators  
**FAILED ATTEMPTS**: None yet — not formally fixed  
**AI PROCESS**: N/A — bug identified by inspection of validator code

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
**STATUS**: OPEN (needs one-line ALTER by user — no direct Postgres access from app env)
**FILE**: `app/src/app/api/save/route.ts` (insert payload), `app/src/app/today/TimelineList.tsx`
**SYMPTOM**: Timeline cards show empty `""` quote line; Edit-reparse navigates to /log with no prefilled text.
**ROOT CAUSE**: Live schema introspection confirmed `time_entries` has no `raw_fragment` column (docs listed it aspirationally). The parser produces it; the save route can't store what the table lacks.
**FIX (pending)**: Run in Supabase SQL editor:
`ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS raw_fragment text;`
Then add `raw_fragment: e.raw_fragment || null` to the save insert. UI already softened: empty quote line hidden; Edit skips the reparse param when empty.
**FAILED ATTEMPTS**: None — deliberately NOT adding the column to the insert before the ALTER exists, because PostgREST would 400 every save.
**AI PROCESS**: Sampled one row per table via service key → column list lacked raw_fragment → chose display-side mitigation + user-run migration over breaking saves.

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

## PATTERN LIBRARY — Do Not Try These

| What looks tempting | Why it fails |
|---|---|
| Increasing timeout to fix parse errors | Timeouts are a symptom, not a cause |
| Adding more instructions to prompt | Usually makes hallucination worse, not better |
| Catching errors and retrying silently | Masks bugs, makes diagnosis impossible |
| Trusting `responseMimeType` to guarantee JSON format | Gemini doesn't always honor it |
| Checking RLS before checking auth | Auth (session/cookie) must be verified first |

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
