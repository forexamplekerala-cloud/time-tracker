import { NextResponse } from 'next/server'
import { GoogleGenerativeAI, Schema } from '@google/generative-ai'
import { createClient } from '@/utils/supabase/server'
import { buildParserPrompt } from '@/lib/parser/prompt'
import { getUserLexicon } from '@/lib/parser/context'
import { runValidators } from '@/lib/parser/validators'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const parserSchema: Schema = {
  type: 'object',
  properties: {
    date: {
      type: 'string',
      description: "YYYY-MM-DD date format. Must strictly be the today date passed in the prompt."
    },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          start_time: { type: 'string', description: "HH:MM (24-hour format) or null if only duration is known", nullable: true },
          end_time: { type: 'string', description: "HH:MM (24-hour format) or null if only duration is known", nullable: true },
          duration_minutes: { type: 'integer', description: "Number of minutes or null", nullable: true },
          category: { 
            type: 'string', 
            description: "Must be exactly one of: 'Trading/Deep Work', 'Agency/Business', 'Life/Fuel', 'Distraction', 'Unclear'" 
          },
          activity: { type: 'string', description: "Short description of the activity" },
          raw_fragment: { type: 'string', description: "The original text fragment this entry corresponds to" },
          confidence: { type: 'string', description: "high, medium, or low" },
          needs_review: { type: 'boolean', description: "True if range is incomplete, overlapping, or uncertain" }
        },
        required: ["category", "activity", "raw_fragment", "confidence", "needs_review"]
      }
    },
    unparsed_fragments: {
      type: 'array',
      items: { type: 'string' },
      description: "Text fragments referencing non-today dates (e.g. 'yesterday evening') or that could not be parsed."
    }
  },
  required: ["date", "entries", "unparsed_fragments"]
}

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

    // Context Assembly
    const userLexicon = await getUserLexicon(user.id)
    const prompt = buildParserPrompt(istDateString, userLexicon, inputMode as 'text' | 'voice') + `\n\nUser text:\n"${text}"\n`

    // Timeout logic (8 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: parserSchema,
      }
    })

    try {
      const result = await model.generateContent({
         contents: [{ role: 'user', parts: [{ text: prompt }] }]
      }, { signal: controller.signal })
      
      clearTimeout(timeoutId)
      
      const responseText = result.response.text()
      const parsedData = JSON.parse(responseText)

      // Run deterministic validators
      const validatedData = runValidators(text, parsedData, istDateString, inputMode as 'text' | 'voice')

      return NextResponse.json(validatedData)
    } catch (e: any) {
      clearTimeout(timeoutId)
      if (e.name === 'AbortError') {
         // Timeout -> fallback all-unparsed
         return NextResponse.json({
            date: istDateString,
            entries: [],
            unparsed_fragments: [text],
            warnings: ['Parser timeout exceeded 8s']
         })
      }
      throw e
    }
  } catch (error) {
    console.error('Error parsing text:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
