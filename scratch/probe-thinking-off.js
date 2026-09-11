// Hypothesis test: does thinkingBudget:0 collapse the 24s latency?
// Same realistic log, same schema-shaped prompt, REST call, thinking OFF.
const fs = require('fs')
const path = require('path')
const { buildParserSystemInstruction, buildParserUserMessage } = require(path.join(__dirname, '..', 'app', 'src', 'lib', 'parser', 'prompt.ts'))

const env = fs.readFileSync(path.join(__dirname, '..', 'app', '.env.local'), 'utf8')
const getVar = (n) => (env.match(new RegExp('^' + n + '=(.*)$', 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')
const key = getVar('GEMINI_API_KEY')
const model = getVar('GEMINI_MODEL') || 'gemini-2.0-flash'

const realisticDay = 'woke around 7ish, gym 8 to 9:30. 10-11 scrolled youtube honestly. 11 to 1 client call then some emails. lunch 1:30 to 2. 2-4 backtesting charts, pretty focused. 4ish tea and phone, maybe 20 min. 5 to 6:30 worked on the agency proposal. evening walk 7-7:45. then dinner family time 8:30-10. after that mostly phone scrolling till 12, not proud of that.'

const schema = {
  type: 'OBJECT',
  properties: {
    date: { type: 'STRING', description: 'YYYY-MM-DD date format. Must strictly be the today date passed in the prompt.' },
    entries: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          start_time: { type: 'STRING', nullable: true },
          end_time: { type: 'STRING', nullable: true },
          duration_minutes: { type: 'INTEGER', nullable: true },
          category: { type: 'STRING', enum: ['Trading/Deep Work', 'Agency/Business', 'Life/Fuel', 'Distraction', 'Unclear'] },
          activity: { type: 'STRING' },
          raw_fragment: { type: 'STRING' },
          confidence: { type: 'STRING' },
          needs_review: { type: 'BOOLEAN' },
        },
        required: ['category', 'activity', 'raw_fragment', 'confidence', 'needs_review'],
      },
    },
    unparsed_fragments: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['date', 'entries', 'unparsed_fragments'],
}

async function main() {
  const t0 = Date.now()
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildParserSystemInstruction('2026-09-11', '', 'text') }] },
      contents: [{ role: 'user', parts: [{ text: buildParserUserMessage(realisticDay) }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  })
  const ms = Date.now() - t0
  const body = await res.text()
  if (!res.ok) {
    console.log(`HTTP ${res.status} after ${(ms / 1000).toFixed(1)}s:`, body.slice(0, 500))
    return
  }
  const parsed = JSON.parse(body)
  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
  const entries = JSON.parse(text).entries?.length
  console.log(`LATENCY: ${(ms / 1000).toFixed(1)}s | entries: ${entries} | thinking off`)
}
main().catch((e) => console.log('ERROR:', e.message))
