---
name: deep_audit
description: Invoke to deeply audit a specific part of the app — a file, module, or feature — for bugs, destructive/breaking risks, security gaps, and architectural debt. Takes time deliberately; not for quick checks.
trigger: model_decision
---

## MODE: DEEP_AUDIT
Trigger Keyword: DEEP_AUDIT

1. ISOLATED SCOPE
   Audit runs on the specified part only, in a fresh context. Do not carry over
   assumptions from prior PLAN_DEEP or ROOT_CAUSE sessions in this thread.

2. // turbo — FULL READ
   Read every line of the target scope before forming any opinion.
   No skimming. No inferring behavior from filenames or comments alone. Read-only, auto-runs without approval.

3. AUDIT PASSES — run all four against the same read; they are independent lenses over the same context, not sequential gates. Do not re-read the target between passes:
   - CORRECTNESS: logic errors, edge cases, off-by-ones, unhandled states,
     race conditions.
   - DESTRUCTIVE RISK: anything that could delete, overwrite, or corrupt
     data/state; anything irreversible; anything that runs without confirmation.
   - SECURITY: injection points, unvalidated input, exposed secrets/keys,
     auth/permission gaps, unsafe deserialization.
   - ARCHITECTURE DEBT: tight coupling, duplicated logic, silent violations
     of existing project conventions, dead code masking real behavior.

4. EVIDENCE-BACKED FINDINGS ONLY
   Every finding must cite the exact file, line, and observed behavior.
   No speculative or "might be an issue" findings without a citation.

5. DIRECT REMEDIATION
   For confirmed findings: make the minimal direct fix. Do NOT leave
   TODO comments in place of a fix.
   For findings requiring a broader architectural decision: do not
   silently fix — flag clearly for human review instead.

6. OUTPUT FORMAT
   ## Audit Report: [scope]
   ### Correctness
   ### Destructive Risk
   ### Security
   ### Architecture Debt
   (each finding: severity, file/line citation, fix applied OR flagged for review)
   ### Summary: fixed directly vs. needs human decision

No shortcuts. No time pressure. Depth over speed is the entire point of this mode.
