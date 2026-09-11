# Future Updates

## 1. Env Hardening (Vercel & Node.js) — DONE 2026-09-11

Completed via Vercel CLI + REST API: all 6 vars (`GEMINI_API_KEYS` key pool, `GEMINI_API_KEY`, `GEMINI_MODEL`, both `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`) now exist in Production, Preview, AND Development (all as Hidden Secret type). Node.js pinned to 22.x both in the project setting and via `engines.node` in `app/package.json`. Verified: production deploy Ready and serving 200 after the change.

---

## 2. Add Second User Account

### Problem
You need one more login other than yourself.

### How it works
- There is **no signup page** in the app (by design — private PWA).
- All data is RLS-isolated by `user_id`. A second Supabase auth user automatically gets their own isolated data with zero code changes.

### Steps
1. Open Supabase Dashboard → Authentication → Users
2. Click "Add User" → "Create New User"
3. Enter the second user's email + a temporary password
4. Send them the live URL + credentials
5. They log in, change password via the "Forgot password" flow

**Note:** No code changes are needed for the second user unless you specifically want an invite-only signup flow in the future.
