---
name: full_test
description: Invoke for a complete end-to-end QA sweep of the app via browser automation — UI rendering, frontend-backend data integrity, error states, navigation, and responsive bounds. Not a reasoning mode like ROOT_CAUSE/PLAN_DEEP — this is a QA test harness.
tools: [browser_control, view_file, run_command, search_codebase]
mainAgent: false
subagent: true
model: pro
commandExecutionPolicy: request-review
---

# FULL_TEST — Complete QA Sweep Definition
Trigger Keyword: `FULL_TEST`

## 1. Pre-Flight Check
1. **Server Check** — verify the dev server is actually running locally (check port, background tasks).
2. **Test User** — ensure a dummy test account exists so real data isn't polluted.
3. **Environment Reset (NEW)** — reset/clear the dummy test account's data before this run starts. Do not run against leftover data from a previous `FULL_TEST` run.

## 2. End-to-End Execution (via browser automation)

1. **Sanity & Auth** — log into the app, navigate to primary entry page.
2. **Parser/Core Flow Regression** — run the primary input flow with a normal, valid input; confirm expected output.
3. **Override Logic Check** — where the app allows manual overrides of automated/parsed results, perform one override and confirm it saves correctly.
4. **Dashboard/Data Integrity** — navigate to all pages that display aggregated or derived data; confirm the override/change from step 3 appears accurately everywhere it should.
5. **Visual/Responsive Bounds** — confirm layout holds at the app's defined mobile breakpoint, and additionally at one standard desktop width (NEW — not just mobile).
6. **Negative-Path Input Testing (NEW)** — repeat the core flow with: empty submission, nonsense/garbage input, extremely long input, special characters. Confirm the app handles each gracefully (no crash, no silent failure, reasonable error message).
7. **Cross-Page Navigation Sweep (NEW)** — crawl every visible link/button in the app. Confirm each leads to a real destination — flag any dead link, 404, or button with no observable effect.
8. **Frontend-Backend Contract Check (NEW)** — for every action that hits an API (save/update/delete), capture the actual network request/response and confirm the data the UI then displays genuinely matches what was sent and returned — not just that a success indicator appeared.
9. **Error-State UI Check (NEW)** — simulate at least one backend failure (network timeout, forced error response) and confirm the UI shows a graceful error state rather than hanging, blanking, or silently doing nothing.
10. **Console/Network Error Sweep (NEW)** — on every page visited during this run, check the browser console for JS errors and the network tab for failed (4xx/5xx) requests, even if the page visually looks correct.
11. **Auth/Session Boundary Check (NEW)** — confirm a logged-out user is correctly redirected from protected pages, and that an expired/invalid session is handled (not left showing a broken authenticated-looking page).
12. **Load-State Check (NEW)** — confirm reasonable loading indicators (skeleton/spinner/empty state) appear during data fetches rather than a flash of broken or empty layout.
13. **Feature Gap / Incomplete CRUD Cycle Check (NEW)** — systematically verify that any data entity the user can Create can also be Read, Updated, and Deleted. Flag any missing pathways as Incomplete CRUD Cycles.

## 3. Automated Reporting & Fixing

1. **Report Card** — output a markdown artifact grading each suite above as PASS / FAIL / WARNING.
2. **Auto-Patch** — on any FAIL, automatically invoke `ROOT_CAUSE` to diagnose and propose a minimal patch.
3. **Patch Verification (NEW)** — after a patch is applied, re-run the specific failed suite (not the full sweep) to confirm the patch actually resolved it before marking it fixed.
4. **Retry Cap (NEW)** — if the same suite fails again after a patch attempt, allow a maximum of 2 auto-patch attempts total. If still failing after that, stop and flag for manual human review rather than continuing to loop.

---

**Invocation example:**
> `FULL_TEST: run the complete QA sweep before I deploy.`

**Relationship to other modes:** `FULL_TEST` is a QA/testing harness, independent of `PLAN_DEEP` (pre-implementation planning) and `ROOT_CAUSE` (root-cause debugging) — it only calls into `ROOT_CAUSE` automatically when its own auto-patch step needs a diagnosis.
