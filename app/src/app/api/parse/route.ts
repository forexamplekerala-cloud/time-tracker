import { NextResponse } from 'next/server'

export const maxDuration = 30 // Vercel: allow up to 30s (network floor to Gemini from this region is ~7-10s)
import { createClient } from '@/utils/supabase/server'
import { buildParserSystemInstruction, buildParserUserMessage } from '@/lib/parser/prompt'
import { getUserLexicon } from '@/lib/parser/context'
import { runValidators } from '@/lib/parser/validators'
import { callGeminiParser, GeminiQuotaError } from '@/lib/parser/gemini-rest'

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }


    const { text, inputMode = 'text' } = await req.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Server-issued IST Date
    const now = new Date()
    const istDateString = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now).split('/').reverse().join('-')

    // Context Assembly: role/rules/examples live in the system instruction,
    // only the raw user text goes in the user turn.
    const userLexicon = await getUserLexicon(user.id)
    const systemInstruction = buildParserSystemInstruction(istDateString, userLexicon, inputMode as 'text' | 'voice')
    const userMessage = buildParserUserMessage(text)

    // Timeout logic (25 seconds — regional network floor is ~7-10s, thinking is disabled)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const responseText = await callGeminiParser({
        systemInstruction,
        userMessage,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      const parsedData = JSON.parse(cleaned)

      // Run deterministic validators
      const validatedData = runValidators(text, parsedData, istDateString, inputMode as 'text' | 'voice')

      return NextResponse.json(validatedData)
    } catch (e: any) {
      clearTimeout(timeoutId)
       if (e.name === 'AbortError') {
          // Timeout -> fallback all-unparsed (nothing is lost — the raw text is returned)
          return NextResponse.json({
             date: istDateString,
             entries: [],
             unparsed_fragments: [text],
             warnings: ['Parser timed out after 25s — nothing was saved. Copy your text from below, go back, and tap "Parse my day" again.']
          })
       }
      if (e instanceof GeminiQuotaError) {
         return NextResponse.json({ error: e.message }, { status: 429 })
      }
      throw e
    }
  } catch (error) {
    console.error('Error parsing text:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
