// Shared Gemini REST transport for the parser.
// Used by BOTH /api/parse and evals/runner.ts so they always measure the same pipeline.
//
// Why REST instead of the @google/generative-ai SDK:
// The SDK (deprecated line, incl. 0.24.x) does not support thinkingConfig.
// gemini-3.5-flash thinks by default (~24s on realistic logs) and the route's
// 25s timeout then silently degrades every parse to the all-unparsed fallback
// (see BUG-014). thinkingBudget: 0 halves latency; extraction needs no reasoning.
//
// Key pool: GEMINI_API_KEYS="key1,key2,..." (comma-separated, optional).
// Falls back to single GEMINI_API_KEY. Round-robin spreads the free-tier
// 20-requests/day quota across keys; 429/quota rejects fail fast (<1s), so
// retrying on the next key fits comfortably inside the route's 30s maxDuration.

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export class GeminiQuotaError extends Error {
  constructor(attempts: number) {
    super(`All ${attempts} API key(s) exhausted quota (429). Add more keys to GEMINI_API_KEYS or wait for the daily reset.`)
    this.name = 'GeminiQuotaError'
  }
}

export class GeminiBlockedError extends Error {
  constructor(reason: string) {
    super(`Gemini returned no content (finishReason: ${reason})`)
    this.name = 'GeminiBlockedError'
  }
}

let keyCursor = 0

function getKeyPool(): string[] {
  const pool = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  if (pool.length === 0) throw new Error('No Gemini API key configured (GEMINI_API_KEYS or GEMINI_API_KEY)')
  return pool
}

// REST-shaped response schema — identical contract to the previous SDK schema.
// Field order and descriptions preserved; validators V1-V9 unchanged.
const PARSER_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    date: {
      type: 'STRING',
      description: "YYYY-MM-DD date format. Must strictly be the today date passed in the prompt.",
    },
    entries: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          start_time: { type: 'STRING', description: 'HH:MM (24-hour format). Set to null ONLY if completely missing from user input.', nullable: true },
          end_time: { type: 'STRING', description: 'HH:MM (24-hour format). Set to null ONLY if completely missing from user input.', nullable: true },
          duration_minutes: { type: 'INTEGER', description: 'Number of minutes or null', nullable: true },
          category: {
            type: 'STRING',
            description: "Must be exactly one of: 'Trading/Deep Work', 'Agency/Business', 'Life/Fuel', 'Distraction', 'Unclear'",
            enum: ['Trading/Deep Work', 'Agency/Business', 'Life/Fuel', 'Distraction', 'Unclear'],
          },
          activity: { type: 'STRING', description: 'Short description of the activity' },
          raw_fragment: { type: 'STRING', description: 'The original text fragment this entry corresponds to' },
          confidence: { type: 'STRING', description: 'high, medium, or low' },
          needs_review: { type: 'BOOLEAN', description: 'True if range is incomplete, overlapping, or uncertain' },
        },
        required: ['category', 'activity', 'raw_fragment', 'confidence', 'needs_review'],
      },
    },
    unparsed_fragments: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: "Text fragments referencing non-today dates (e.g. 'yesterday evening') or that could not be parsed.",
    },
  },
  required: ['date', 'entries', 'unparsed_fragments'],
}

const isQuotaError = (status: number, body: string) =>
  status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(body)

const isRetryable = (status: number) => status === 429 || status >= 500

// One parse call: round-robin key selection, next-key retry on quota/server errors.
// Returns the model's text response (fences already stripped — BUG-003 guard).
export async function callGeminiParser(opts: {
  systemInstruction: string
  userMessage: string
  signal?: AbortSignal
}): Promise<string> {
  const keys = getKeyPool()
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
  const startIndex = keyCursor
  let lastError: Error = new Error('No attempt made')
  let sawQuota = false

  for (let i = 0; i < keys.length; i++) {
    const keyIndex = (startIndex + i) % keys.length
    const key = keys[keyIndex]
    // Advance cursor past this key so the NEXT request starts on the next key.
    keyCursor = (keyIndex + 1) % keys.length

    const res = await fetch(`${API_BASE}/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: opts.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: opts.userMessage }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: PARSER_RESPONSE_SCHEMA,
          // DO NOT set temperature on this model. Verified 2026-09-11 (BUG-020):
          // temperature: 0 with this responseSchema hangs gemini-3.5-flash
          // server-side (40s+ zero-byte stall, reproduced with/without isolation).
          // Default temperature parses fine (~2-14s).
          // Thinking off: extraction with few-shot examples needs no reasoning.
          // ~24s -> ~12s on realistic logs (network floor from this region is ~7-10s).
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    })

    if (res.ok) {
      const json = await res.json()
      const candidate = json.candidates?.[0]
      const text: string | undefined = candidate?.content?.parts?.map((p: any) => p.text || '').join('') || undefined
      if (!text) throw new GeminiBlockedError(candidate?.finishReason || 'UNKNOWN')
      // BUG-003 guard: Gemini sometimes wraps JSON in markdown fences despite responseMimeType.
      return text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    }

    const body = await res.text().catch(() => '')
    lastError = new Error(`Gemini HTTP ${res.status} (key #${keyIndex + 1}): ${body.slice(0, 300)}`)
    if (isQuotaError(res.status, body)) {
      sawQuota = true
      continue // next key
    }
    if (isRetryable(res.status)) continue // transient Google-side error -> next key
    throw lastError // 400/403 etc. — same on every key, fail fast
  }

  if (sawQuota) throw new GeminiQuotaError(keys.length)
  throw lastError
}

// Minimal .env.local loader for standalone scripts (evals). No new deps.
export function loadEnvLocal(appDir: string) {
  try {
    const raw = require('fs').readFileSync(require('path').join(appDir, '.env.local'), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch {
    // .env.local absent — rely on real env vars
  }
}
