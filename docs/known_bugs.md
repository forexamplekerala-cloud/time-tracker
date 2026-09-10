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
