# Future Updates

## 1. Env Hardening (Vercel & Node.js)

### Problem
Env vars are currently only set for the `Production` environment in Vercel. Preview branch deploys and local `npm run dev` will miss them (middleware crashes). Vercel also defaulted to Node.js 24 (bleeding edge) which might cause dependency issues later.

### Steps
1. `vercel env add` all 5 vars for the `preview` environment (CLI, same values as production)
2. `vercel env add` all 5 vars for the `development` environment (CLI, same values as production)
3. In Vercel Build Settings, change Node.js from `24.x` to `22.x` (stable LTS)
4. Trigger one empty commit redeploy to confirm no regression

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
