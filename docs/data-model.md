# Data Model

## Supabase Tables

- `users`
  - id, name, email, timezone
- `raw_logs`
  - id, user_id, text, log_date, created_at
- `time_entries`
  - id, user_id, raw_log_id, date, start_time, end_time, duration_minutes, category, activity, source, confidence, needs_review, impact_rating
  - PENDING: `raw_fragment` column does not exist yet — see BUG-010 in `docs/known_bugs.md` for the one-line ALTER
- `daily_summaries`
  - user_id, date, productive_minutes, distraction_minutes, fuel_minutes, unlogged_minutes, bad_impact_minutes
- `ai_feedback`
  - entry_id, accepted, corrected_fields
  - PENDING: `user_id` column does not exist yet — code already writes it (`save/route.ts`) and reads it (`parser/context.ts`); run the migration plan in `scratch/last_session.md` → "PENDING WORK". Soft-fails: learning loop dead until run.

*Note: Notion is export/backup only — never the primary app database.*

## Privacy Rules
- Row-Level Security (RLS) on every table.
- Per-user isolation (each user sees only their own data).
- No screen-time/browser-history connections.
- Disclose storage honestly in-app (clear communication about what is stored).
