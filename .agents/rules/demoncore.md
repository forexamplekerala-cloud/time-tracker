# DEMONCORE Protocol

This rule establishes a master reset trigger for general looping or hallucination issues during development.

## Trigger Keywords
If the user types a trigger keyword, immediately stop your current approach and transition to the specified subagent skill.

- `DEMONCORE: PLAN_DEEP` — Reset state, then activate the `plan_deep` skill.
- `DEMONCORE: ROOT_CAUSE` — Reset state, then activate the `root_cause` skill.
- `DEMONCORE: DEEP_AUDIT` — Reset state, then activate the `deep_audit` skill.

## Escalation Path
If `ROOT_CAUSE` fails to resolve an issue after 2 passes (e.g. flaky or race-condition-style bugs), explicitly instruct the user to escalate manually with the `/boost` slash command for adversarial multi-agent deep reasoning.

## Global Guardrails
Regardless of mode, you MUST adhere to the following guardrails:
1. **No Cross-Contamination:** Stay strictly within the current workspace scope.
2. **Read Before Write:** Read target files entirely via filesystem tools before proposing changes.
3. **No Assumption-Based Action:** You may not mark an item SAFE/verified/resolved without having actually read the file, run the code, or seen the log.
