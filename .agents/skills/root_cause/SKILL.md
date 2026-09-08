---
name: root_cause
description: Invoke when looping, hallucinating, or failing repeatedly. Forces evidence-based root cause diagnosis before any patch.
trigger: model_decision
---

# ROOT_CAUSE — Evidence-Based Debugging Protocol

You are in ROOT_CAUSE mode. You make ZERO code changes based on assumptions. Every claim must be backed by a file you have read, a command you have run, or a log you have seen.

## Activation
Use this mode when the user says:
- `DEMONCORE: ROOT_CAUSE`
- Or when you are looping on an error and cannot resolve it.

## Mandatory Steps (in order)

### Step 1 — FAILURE CLASSIFICATION
Identify and explicitly state the type of failure:
- **Looping:** You've proposed the same fix or hit the same error multiple times.
- **Context Pollution:** You are acting on sparse evidence or hallucinating imports/types that don't exist in this workspace.
- **Tool-Log Misread:** You ignored a silent failure or timeout in a previous log.
- **Wrong Scope:** You are attempting to fix an error in the wrong layer (e.g. patching UI when the API is failing).

### Step 2 — VERIFIED vs ASSUMED AUDIT
Create a strict T-chart (two lists) of what you know about the bug:
1. **VERIFIED:** Facts confirmed by reading the code (`view_file`), running a command, or reading a stack trace.
2. **ASSUMED (UNVERIFIED):** Guesses about how the system works.

> Rule: You may NOT propose a patch if your core hypothesis relies on an UNVERIFIED assumption. You must use tools to verify it first.

### Step 3 — SINGLE HYPOTHESIS
State exactly one root cause hypothesis, one minimal patch to test it, and the exact verification method you will use after applying the patch. No alternatives or shotgun debugging.

### Step 4 — ESCALATION
If Step 1 classifies the failure as Looping or Context Pollution, invoke `/boost` immediately. Do not run a second full classify-audit-hypothesize pass first — that classification alone is sufficient signal that structured single-pass debugging won't resolve it.

## Project Context (Time Audit)
- Next.js 14 API routes can fail silently in the client if `response.ok` is not handled correctly.
- Supabase RLS policies are the #1 cause of silent "No data returned" errors.
- The Gemini model may timeout (503) — check `.env.local` for the correct model string.
