# Data Model

## Supabase Tables

- `users`
  - id, name, email, timezone
- `raw_logs`
  - id, user_id, text, log_date, created_at
- `time_entries`
  - id, user_id, raw_log_id, date, start_time, end_time, duration_minutes, category, activity, raw_fragment, source, confidence, needs_review, impact_rating, created_at
- `daily_summaries`
  - user_id, date, productive_minutes, distraction_minutes, fuel_minutes, unlogged_minutes, bad_impact_minutes, updated_at
- `ai_feedback`
  - id, entry_id, user_id, accepted, corrected_fields, created_at
  - RLS policies: "ai_feedback select own" and "ai_feedback insert own" enforced by user_id

*Note: Notion is export/backup only — never the primary app database.*

## Database Infrastructure & Connection
- **Project Ref**: `kmrqyaecdlprcpwmglgf`
- **Region**: `ap-southeast-1` (AWS Singapore)
- **Direct Pooler Host**: `aws-0-ap-southeast-1.pooler.supabase.com:6543` (Database: `postgres`, User: `postgres.kmrqyaecdlprcpwmglgf`)
- **Credentials Location**: Documented in `app/.env.local` (`DATABASE_URL`, `SUPABASE_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`).

## Privacy Rules
- Row-Level Security (RLS) on every table.
- Per-user isolation (each user sees only their own data).
- No screen-time/browser-history connections.
- Disclose storage honestly in-app (clear communication about what is stored).
