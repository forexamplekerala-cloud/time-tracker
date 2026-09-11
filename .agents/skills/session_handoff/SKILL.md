---
name: session_handoff
description: Creates a structured handoff note at the end of a debugging session.
---

# `session_handoff`

> **WHEN TO USE**: Invoke this skill when finishing a conversation, especially if a bug is partially fixed or investigation is ongoing.

## Instructions

1. Check `scratch/last_session.md`. If the file exists and the oldest entry in it is from within the last 3 days, append to the file (use `---` to separate sessions). Otherwise, if the file is older than 3 days or doesn't exist, overwrite it.
2. Write the handoff note using the exact format below.
3. Tell the user to paste the relevant contents of `scratch/last_session.md` at the start of the next conversation.

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
