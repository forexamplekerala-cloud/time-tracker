# Project Identity
"Time Audit" - private installable PWA (Phase 1 personal MVP, 14-day validation, 2 users max). Core promise: *write your day freely, see your time brutally*. Effort must be near zero: no timers, no dropdowns, no structured sentences.

## Stack
Next.js + TypeScript (strict) | Tailwind + shadcn/ui | Recharts | Supabase (auth + Postgres + RLS) | Gemini Flash via server route only | Vercel/Cloudflare | PWA manifest + service worker. App code lives in `app/`.

## Commands
*Placeholder for dev/test/lint after scaffolding (`npm run dev`, etc. inside `app/`).*

## Repo Layout
- `app/` - the Next.js PWA lives here (scaffold pending).
- `docs/` - detailed specs; read via the Doc Map below.
- `WhatsApp Time Tracker V1 (6).json` - legacy n8n workflow, reference only, do NOT extend or modify.

## Hard Rules
- CRITICAL WORKSPACE: ALWAYS use C:\Users\fawaz\time_mirror\time tracker. Never use Documents copy (Windows Defender blocks git/tools there).
- Gemini API key lives in server env only - NEVER in client JavaScript; frontend calls own API route.
- Lost time = explicitly logged Distraction ONLY. Unlogged time is "unknown", never labeled wasted.
- Parser never invents missing time, never assumes gaps are wasted.
- Ambiguous activity -> `Unclear`, never guessed as `Distraction`.
- `duration_minutes` is a number or `null` - never the string "unknown".
- AI proposes, user owns the record: review-before-save is mandatory; no auto-saving parsed entries.
- "Brutal truth" summary lines are deterministic string templates - NEVER AI-generated.
- Phase 1 traps are forbidden: no native apps, no screen-time integration, no payments, no social/team features, no streaks/badges/gamification, no notifications, no landing page, no medical/ADHD claims.
- Privacy: Supabase row-level security; each user sees only their own data. No public feed, no sharing.
- 24-hour time internally; IST (Asia/Kolkata) for display.
- Productive time = Trading/Deep Work + Agency/Business only. Fuel never inflates productive hours.

## Category -> Color Map
| Category | Meaning | Color |
| :--- | :--- | :--- |
| Trading/Deep Work | Trading, analysis, building, study | Green |
| Agency/Business | Client work, leads, systems, sales | Blue |
| Life/Fuel | Exercise, food, prayer, family, sleep, recovery | Yellow (amber tones on light theme) |
| Distraction | Scrolling, YouTube, phone, random browsing | Red |
| Unclear | AI could not classify confidently | Gray |

## Doc Map (Retrieval Pointers)
- Before touching the Gemini parser or review flow -> read `docs/parser-spec.md`
- Before touching Supabase schema, queries, or auth -> read `docs/data-model.md`
- Before building dashboard/timeline/charts -> read `docs/visuals-spec.md`
- Before adding ANY new feature -> read `docs/scope-guardrails.md` first
- Before styling UI components -> read `docs/design-input-screen.md`
- Full philosophy & 14-day plan -> `docs/product-plan.md`

## Maintenance Protocol
- Agent makes the same mistake twice -> add one line to AGENTS.md.
- Any section >30 lines -> split into docs/, leave a pointer.
- Delete stale rules aggressively - outdated rules actively hurt.
- Re-check AGENTS.md length < 150 lines after every addition.
