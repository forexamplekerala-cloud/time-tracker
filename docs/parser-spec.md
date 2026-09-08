# Gemini Parsing Rules

- AI does exactly 4 things: extract time blocks; infer duration only when language supports it; classify category; explain uncertainty.
- Forbidden: inventing missing time, assuming gaps are wasted, diagnosing ADHD, therapy advice, motivational filler, replacing user review.
- Parser rules (verbatim):
  - Split one message into many entries
  - Preserve `raw_fragment` for audit
  - 24-hour internal time
  - `duration_minutes` number-or-null
  - Incomplete range -> `needs_review: true`
  - Overlapping blocks -> flag
  - Ambiguous -> `Unclear`
  - "50 minute scroll" = 50-min Distraction entry but NO invented start time unless context is reliable.
  - Fragments referencing non-today dates ("yesterday evening") -> unparsed_fragments; Phase 1 logs are today-only (server IST date).

## Structured Output JSON Schema

```json
{
  "date": "YYYY-MM-DD",
  "entries": [{
    "start_time": "HH:MM",
    "end_time": "HH:MM",
    "duration_minutes": 15,
    "category": "Distraction",
    "activity": "Wasted time",
    "raw_fragment": "…original text…",
    "confidence": "high|medium|low",
    "needs_review": true
  }],
  "unparsed_fragments": ["…"]
}
```

- Gemini structured-output requirement: `application/json` + strict response schema (schema-constrained output, not prose scraping). Note: at implementation time, convert the example shape into a strict Gemini `responseSchema` and call with `responseMimeType: "application/json"`.
- `ai_feedback` loop (future): store accepted/corrected_fields per entry.
