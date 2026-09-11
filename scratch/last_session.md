## Last Session — 2026-09-11
### What we were fixing
Four threads, all on the Time Audit PWA: (1) `/today` gut-punch redesign (two rounds: feedback-loop layout, then editorial-paper restyle), (2) `/log` "broken layout" (turned out to be a corrupted `.next` dev cache, BUG-018), (3) multi-entry parsing of line-per-activity input (BUG-017), (4) a silent parse failure caused by `temperature: 0` hanging gemini-3.5-flash (BUG-020). Also: added a second Gemini key to the pool and installed real Geist fonts (BUG-019).

### What we tried (with line references)
- Verdict rewired to the Void: `app/src/lib/dashboard/truth.ts` `getVoidLine` now returns `{ line, detail, emphasis }` (two-part verdict, bold trigger phrase only); rendered in `app/src/app/today/AuditReport.tsx` (48px/700 mono number, 16px truth line, 14px #78716C sub-line, 1px #E7E5E4 rule lines above and below, no cards/boxes).
- Dial void stops at current time: `app/src/app/today/DayDial.tsx` takes `nowMinutes` (elapsed IST, null for past dates); grey ring = arc 00:00→now, future transparent.
- Receipts are a reconciling ledger: `app/src/app/today/TimelineList.tsx` sorts entries chronologically, shows leading/between/trailing dashed GapRows; boundary comes from the server (`boundaryMinutes`/`boundaryLabel` in `page.tsx`) so no hydration drift.
- Header is clinical: mono 18px/600 uppercase 0.1em tracking (`page.tsx`). Quote = 12px #A8A29E footnote at the bottom (`MirrorQuote.tsx`).
- Geist fonts: `npm i geist`; `layout.tsx` uses `GeistSans`/`GeistMono` variables; `tailwind.config.ts` binds `font-sans`/`font-mono` to them. (Was silently running on Inter/system fonts.)
- Parser: `prompt.ts` — waste-words→Distraction rule + a two-line few-shot example ("waste"/"gym" split). `gemini-rest.ts` — `temperature: 0` was ADDED and then REMOVED (hangs the model, see below).
- Review UI: `ReviewClient.tsx` now renders `warnings` from the parse result (amber "Parser notes" box); `api/parse/route.ts` timeout warning is actionable copy ("nothing was saved — copy your text, go back, tap Parse again").
- `/log` spec updates: 24px hero, 3 chips ("Traded 2h", "1h gym", "Wasted 45m on phone"), new placeholder, desktop-only autofocus, removed nested `<main>` + unused `createClient()` (`app/src/app/log/page.tsx`, `LogInput.tsx`).
- Key pool: `.env.local` now has `GEMINI_API_KEYS=<key1>,<key2>` (round-robin + 429 failover already existed from BUG-014). Verified key #2 live (200 on generateContent).

### What failed and why
- `temperature: 0` on gemini-3.5-flash + our responseSchema hangs the model server-side: A/B probe showed no-temp = 200 in 1.9s, temp-0 = zero-byte stall past 40s. It shipped unverified (quota blocked the final probe) and caused the user's "4 pm to 4.30 pm prayer and snack" all-unparsed failure. NEVER re-add temperature to the parser generationConfig (logged in the pattern library).
- Running `npm run build` while `npm run dev` is live corrupts `.next` (asset 404s, `Cannot find module './787.js'`) — same signature as force-killing the dev server. RULE: stop dev before building; if corrupted, stop dev → `Remove-Item .next -Recurse -Force` → restart (30-second fix, BUG-018/019).
- "Unstyled raw text dump" in dev = check dev-server logs for static asset 404s FIRST; it is a cache problem, not a code problem.
- Rule-only prompt change (no few-shot example) fixed "waste"→Distraction but did NOT stop stochastic line drops (2 of 4 runs dropped a line).

### Current state of the code
- `npx tsc --noEmit` clean, `npm run build` green (12/12 pages), dev server running on :3001 (healthy, login 200). User needs a hard refresh after cache wipes.
- BUG-020 FIXED and live-verified: the user's exact fragment parses in 2.0s to one clean entry (16:00–16:30, Life/Fuel, 30m, dot-notation "4.30 pm" handled).
- Gemini key #1 is quota-exhausted until ~12:30 PM IST reset (429, fails fast — harmless). Key #2 works.
- Open bugs: BUG-017 verification note (multi-line stability at default temperature still unprobed), BUG-010 (needs user-run `ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS raw_fragment text;` before save route can persist fragments), BUG-005 (validator HH:MM regex pending).
- Probe scripts live in `C:\Users\fawaz\AppData\Local\Temp\kilo\probe\` (diag.js = exact-input diagnosis; probe.js = multi-case stability). Recompile with: `npx tsc src/lib/parser/{prompt,validators,gemini-rest}.ts --outDir <temp> --module commonjs --target es2020 --esModuleInterop --skipLibCheck --types node`.

### Next step
1. After quota reset (~12:30 IST): re-run the stability probe (2x two-line input, 2x four-line input) at default temperature. If line drops persist, implement ONE deterministic retry inside `/api/parse` when V8 coverage warnings fire — NOT more prompt text, NOT temperature (both proven failures).
2. Vercel env: set `GEMINI_API_KEYS` (both keys) in Production — and Preview/Development per `docs/future-updates.md` item 1. Deploys currently fall back to single `GEMINI_API_KEY`.
3. Ask the user to run the BUG-010 ALTER in Supabase SQL editor, then add `raw_fragment: e.raw_fragment || null` to the save insert in `app/src/app/api/save/route.ts`.
4. Consider BUG-005 (regex `/^\d{2}:\d{2}$/` on start/end in validators) — separate small fix.
