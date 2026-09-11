// End-to-end probe through the PRODUCTION transport (gemini-rest.ts):
// real prompt, real schema, key pool, thinking off. Verifies BUG-014 fix.
const path = require('path')
const fs = require('fs')
const { buildParserSystemInstruction, buildParserUserMessage } = require(path.join(__dirname, '..', 'app', 'src', 'lib', 'parser', 'prompt.ts'))
const { callGeminiParser, loadEnvLocal } = require(path.join(__dirname, '..', 'app', 'src', 'lib', 'parser', 'gemini-rest.ts'))

loadEnvLocal(path.join(__dirname, '..', 'app'))

const realisticDay = 'woke around 7ish, gym 8 to 9:30. 10-11 scrolled youtube honestly. 11 to 1 client call then some emails. lunch 1:30 to 2. 2-4 backtesting charts, pretty focused. 4ish tea and phone, maybe 20 min. 5 to 6:30 worked on the agency proposal. evening walk 7-7:45. then dinner family time 8:30-10. after that mostly phone scrolling till 12, not proud of that.'

async function main() {
  const t0 = Date.now()
  try {
    const text = await callGeminiParser({
      systemInstruction: buildParserSystemInstruction('2026-09-11', '', 'text'),
      userMessage: buildParserUserMessage(realisticDay),
    })
    const ms = Date.now() - t0
    const parsed = JSON.parse(text)
    console.log(`LATENCY: ${(ms / 1000).toFixed(1)}s | entries: ${parsed.entries?.length} | unparsed: ${parsed.unparsed_fragments?.length}`)
    console.log('sample entry:', JSON.stringify(parsed.entries?.[0]))
    console.log('fences stripped, JSON valid, schema shape:', !!parsed.date, Array.isArray(parsed.entries))
  } catch (e) {
    console.log(`FAILED after ${((Date.now() - t0) / 1000).toFixed(1)}s:`, e.name, '-', e.message?.slice(0, 200))
  }
}
main()
