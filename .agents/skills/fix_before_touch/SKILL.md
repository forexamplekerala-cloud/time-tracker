---
name: fix_before_touch
description: Pre-flight checklist before fixing any bug or editing any code. Maps blast radius first, then gates the edit.
---

# `fix_before_touch`

> **HARD STOP ENFORCED**: You cannot write any code or use any modifying tools until you complete this checklist and output the results to the user.

## Checklist (before editing)

1. **Read `docs/known_bugs.md`**
   - Check if the symptom matches any known bug.
   - If it does, follow the exact FIX or avoid the FAILED ATTEMPTS.

2. **Read the Doc Map**
   - Check `AGENTS.md` for which spec governs the area you are touching (e.g. `parser-spec.md`, `data-model.md`).

3. **Map the Blast Radius**
   - `grep` who imports the target file (upstream callers) and who consumes its exported types (downstream).
   - Classify:
     - `ISOLATED` - internals only, exported signatures unchanged.
     - `LOCAL` - 1-2 callers in the same feature area.
     - `BROADCAST` - shared type/util with 3+ consumers (e.g. `ParsedEntry`, category strings). Every consumer must still compile after the edit.
     - `CRITICAL` - DB schema, RLS, auth, service-role keys, or daily-summary math. Ask the user before editing.
   - The compiler CANNOT see these 4 contracts - grep them manually if touched:
     1. sessionStorage keys (e.g. `pendingParseResult`)
     2. Supabase column names (string literals, no type safety)
     3. API request/response shapes between client `fetch` and route handlers
     4. Gemini prompt contract (schema fields vs. validator expectations)
   - Check `docs/known_bugs.md` for open entries on every upstream file.

4. **Formulate Hypothesis**
   - You must output exactly:
     - **Bug**: What I believe the bug is.
     - **Proof**: Which file/line number proves this is the cause.
     - **Verification**: How I will verify the fix works.

5. **Request Permission**
   - REQUIRED for BROADCAST/CRITICAL. Optional (but recommended) otherwise.
   - Stop and let the user confirm the hypothesis before you write code.

## After the edit

6. **Verify**
   - Run `npx tsc --noEmit` in `app/` after any change touching shared types or imports. A clean compile IS the blast-radius check for typed contracts.
   - Run `npm run build` in `app/` before telling the user the change works.

7. **Log it**
   - Append the fix + reasoning to `docs/known_bugs.md` as soon as verification passes. Never skip this, and never mark it FIXED unless the code actually contains the fix.
