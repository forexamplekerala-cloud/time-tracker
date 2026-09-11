// Diagnostic probe: calls Gemini with the real key/model from app/.env.local.
// Prints ONLY status + error type/message (never the key). 1 request max.
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', 'app', '.env.local')
const env = fs.readFileSync(envPath, 'utf8')
const getVar = (name) => {
  const m = env.match(new RegExp('^' + name + '=(.*)$', 'm'))
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null
}

const key = getVar('GEMINI_API_KEY')
const model = getVar('GEMINI_MODEL') || 'gemini-2.0-flash'
console.log('model:', model, '| key found:', !!key, '| key length:', key ? key.length : 0)

fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Parse: 9 to 10 trading. Reply with JSON {entries:[{activity:"trading"}]}' }] }],
    generationConfig: { responseMimeType: 'application/json' },
  }),
})
  .then(async (res) => {
    const body = await res.text()
    console.log('HTTP status:', res.status, res.statusText)
    if (res.ok) {
      console.log('SUCCESS — first 300 chars:', body.slice(0, 300))
    } else {
      console.log('ERROR BODY:', body.slice(0, 1000))
    }
  })
  .catch((e) => console.log('NETWORK/FETCH ERROR:', e.message))
