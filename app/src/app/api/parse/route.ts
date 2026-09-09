import { NextResponse } from 'next/server'
import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai'

export const maxDuration = 30 // Vercel: allow up to 30s for Gemini cold starts
import { createClient } from '@/utils/supabase/server'
import { buildParserPrompt } from '@/lib/parser/prompt'
import { getUserLexicon } from '@/lib/parser/context'
import { runValidators } from '@/lib/parser/validators'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const parserSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    date: {
      type: SchemaType.STRING,
      description: "YYYY-MM-DD date format. Must strictly be the today date passed in the prompt."
    },
    entries: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          start_time: { type: SchemaType.STRING, description: "HH:MM (24-hour format). Set to null ONLY if completely missing from user input.", nullable: true },
          end_time: { type: SchemaType.STRING, description: "HH:MM (24-hour format). Set to null ONLY if completely missing from user input.", nullable: true },
          duration_minutes: { type: SchemaType.INTEGER, description: "Number of minutes or null", nullable: true },
          category: { 
            type: SchemaType.STRING, 
            description: "Must be exactly one of: 'Trading/Deep Work', 'Agency/Business', 'Life/Fuel', 'Distraction', 'Unclear'" 
          },
          activity: { type: SchemaType.STRING, description: "Short description of the activity" },
          raw_fragment: { type: SchemaType.STRING, description: "The original text fragment this entry corresponds to" },
          confidence: { type: SchemaType.STRING, description: "high, medium, or low" },
          needs_review: { type: SchemaType.BOOLEAN, description: "True if range is incomplete, overlapping, or uncertain" }
        },
        required: ["category", "activity", "raw_fragment", "confidence", "needs_review"]
      }
    },
    unparsed_fragments: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
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

    // Timeout logic (25 seconds — Gemini needs time on cold starts)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
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
            warnings: ['Parser timeout exceeded 25s']
         })
      }
      throw e
    }
  } catch (error) {
    console.error('Error parsing text:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
