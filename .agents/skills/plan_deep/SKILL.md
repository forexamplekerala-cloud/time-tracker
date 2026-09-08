---
name: plan_deep
description: Invoke before implementing or modifying any feature. Maps dependencies and blast radius before any code is written.
trigger: model_decision
---

# PLAN_DEEP — Pre-Implementation Mapping Protocol

You are in PLAN_DEEP mode. You MUST NOT write any code or run any modifying command until the user explicitly approves your plan.

## Activation
Use this mode when the user says:
- `DEMONCORE: PLAN_DEEP`
- `PLAN_DEEP: <feature description>`

## Mandatory Steps (in order)

### Step 1 — // turbo — TARGET & DEPENDENCY MAPPING
Read every file relevant to the feature before writing a single line of analysis. Read-only, auto-runs without approval.
- Use `view_file` to read the target file(s) entirely.
- Use `grep_search` to find ALL upstream callers of any function/type you plan to change.
- Use `grep_search` to find ALL downstream consumers of shared types, schemas, or state.
- List every file that imports from or depends on the target.

### Step 2 — BLAST RADIUS CHECK
For each file identified above, state explicitly:
- What shared state does it touch? (Supabase schema, sessionStorage, env vars, API response shape)
- What UI surfaces would break if its exports changed?
- What API routes depend on its types?
- Does it affect the Gemini prompt, validator, or save flow?

### Step 3 — RISK CLASSIFICATION
Classify every affected file as one of:
- **SAFE** — you have read the file and confirmed no risk
- **RISKY** — read the file and identified a specific breaking scenario
- **UNKNOWN** — not yet read; must be read before marking SAFE

> Rule: A file may NOT be reclassified from UNKNOWN to SAFE without reading it via `view_file`.

### Step 4 — IMPLEMENTATION PLAN
Produce a step-by-step plan with:
- Files to modify (in dependency order — leaf dependencies first)
- The exact change per file (function signature, type shape, SQL migration, prompt text)
- Verification steps after each change (build check, manual test, log to check)

### Step 5 — HARD STOP
Post the plan. Do not proceed. Wait for the user to say "proceed" or "approved" before making any file writes.

## Project Context (Time Audit)
Key files in this workspace:
- `app/src/app/api/parse/route.ts` — Gemini API call, timeout, retry, validator
- `app/src/lib/parser/prompt.ts` — AI prompt, system role, time rules
- `app/src/lib/parser/validators.ts` — V1-V9 deterministic guards
- `app/src/lib/parser/context.ts` — User lexicon builder
- `app/src/app/log/LogInput.tsx` — Main input UI, voice, chips, submit
- `app/src/app/review/ReviewClient.tsx` — Review page, impact ratings, save
- `app/src/app/api/save/route.ts` — Persists entries to Supabase
- `app/src/app/today/page.tsx` — Dashboard with productive time + procLine
- `app/src/lib/dashboard/truth.ts` — Deterministic summary + procrastination line
- `app/.env.local` — GEMINI_MODEL, Supabase keys (server-only)
- `docs/` — parser-spec.md, data-model.md, visuals-spec.md, scope-guardrails.md
