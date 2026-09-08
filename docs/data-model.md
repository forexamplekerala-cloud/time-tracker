# Data Model

## Supabase Tables

- `users`
  - id, name, email, timezone
- `raw_logs`
  - id, user_id, text, log_date, created_at
- `time_entries`
  - id, user_id, raw_log_id, date, start_time, end_time, duration_minutes, category, activity, source, confidence
- `daily_summaries`
  - user_id, date, productive_minutes, distraction_minutes, fuel_minutes, unlogged_minutes
- `ai_feedback`
  - entry_id, accepted, corrected_fields

*Note: Notion is export/backup only — never the primary app database.*

## Privacy Rules
- Row-Level Security (RLS) on every table.
- Per-user isolation (each user sees only their own data).
- No screen-time/browser-history connections.
- Disclose storage honestly in-app (clear communication about what is stored).
