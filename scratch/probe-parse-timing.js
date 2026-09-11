// Timing probe: replicates /api/parse exactly (real prompt, real schema, real SDK).
// Measures generation latency to test the 25s-timeout hypothesis. 1 request.
const fs = require('fs')
const path = require('path')
const { GoogleGenerativeAI, SchemaType } = require(path.join(__dirname, '..', 'app', 'node_modules', '@google', 'generative-ai'))
const { buildParserSystemInstruction, buildParserUserMessage } = require(path.join(__dirname, '..', 'app', 'src', 'lib', 'parser', 'prompt.ts'))

const env = fs.readFileSync(path.join(__dirname, '..', 'app', '.env.local'), 'utf8')
const getVar = (n) => (env.match(new RegExp('^' + n + '=(.*)$', 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '')

const genAI = new GoogleGenerativeAI(getVar('GEMINI_API_KEY'))
const parserSchema = {
  type: SchemaType.OBJECT,
  properties: {
    date: { type: SchemaType.STRING, description: 'YYYY-MM-DD' },
    entries: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          start_time: { type: SchemaType.STRING, nullable: true },
          end_time: { type: SchemaType.STRING, nullable: true },
          duration_minutes: { type: SchemaType.INTEGER, nullable: true },
          category: { type: SchemaType.STRING, enum: ['Trading/Deep Work', 'Agency/Business', 'Life/Fuel', 'Distraction', 'Unclear'] },
          activity: { type: SchemaType.STRING },
          raw_fragment: { type: SchemaType.STRING },
          confidence: { type: SchemaType.STRING },
          needs_review: { type: SchemaType.BOOLEAN },
        },
        required: ['category', 'activity', 'raw_fragment', 'confidence', 'needs_review'],
      },
    },
    unparsed_fragments: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ['date', 'entries', 'unparsed_fragments'],
}

const realisticDay = 'woke around 7ish, gym 8 to 9:30. 10-11 scrolled youtube honestly. 11 to 1 client call then some emails. lunch 1:30 to 2. 2-4 backtesting charts, pretty focused. 4ish tea and phone, maybe 20 min. 5 to 6:30 worked on the agency proposal. evening walk 7-7:45. then dinner family time 8:30-10. after that mostly phone scrolling till 12, not proud of that.'

async function main() {
  const model = genAI.getGenerativeModel({
    model: getVar('GEMINI_MODEL') || 'gemini-2.0-flash',
    systemInstruction: buildParserSystemInstruction('2026-09-11', '', 'text'),
    generationConfig: { responseMimeType: 'application/json', responseSchema: parserSchema },
  })
  const t0 = Date.now()
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: buildParserUserMessage(realisticDay) }] }],
    })
    const ms = Date.now() - t0
    const text = result.response.text()
    const parsed = JSON.parse(text)
    console.log(`LATENCY: ${(ms / 1000).toFixed(1)}s | parsed entries: ${parsed.entries?.length} | unparsed: ${parsed.unparsed_fragments?.length}`)
    console.log('VERDICT: ', ms > 25000 ? 'WOULD HAVE TIMED OUT in route (>25s) -> all-unparsed fallback' : 'within route timeout')
  } catch (e) {
    console.log(`FAILED after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, e.message?.slice(0, 300))
  }
}
main()
