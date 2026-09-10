---
name: session_handoff
description: Creates a structured handoff note at the end of a debugging session.
---

# `session_handoff`

> **WHEN TO USE**: Invoke this skill when finishing a conversation, especially if a bug is partially fixed or investigation is ongoing.

## Instructions

1. Create or overwrite a file at `scratch/last_session.md`.
2. Write the handoff note using the exact format below.
3. Tell the user to paste the contents of `scratch/last_session.md` at the start of the next conversation.

## Handoff Note Format

```markdown
## Last Session — [Today's Date]
### What we were fixing
[Brief description of the bug or feature]

### What we tried (with line references)
- [Attempt 1 and file path/line]
- [Attempt 2 and file path/line]

### What failed and why
[Context to prevent the next agent from repeating mistakes]

### Current state of the code
[What is currently broken, what works, where did we leave off]

### Next step
[Exact instruction for the next agent: e.g. "We need to update the Supabase RLS policy for the activities table"]
```
