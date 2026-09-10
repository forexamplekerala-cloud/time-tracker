const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const parserSchema = {
  type: SchemaType.OBJECT,
  properties: {
    date: { type: SchemaType.STRING },
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
          needs_review: { type: SchemaType.BOOLEAN }
        },
        required: ['category', 'activity', 'raw_fragment', 'confidence', 'needs_review']
      }
    },
    unparsed_fragments: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
  },
  required: ['date', 'entries', 'unparsed_fragments']
};
async function test() {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.5-flash',
    systemInstruction: `You are the parser for Time Audit, a brutally honest personal time tracker.
You ONLY audit today's time. Today's date in IST is: 2026-09-09.
Rules:
- 24-hour internal time for start_time and end_time.
- Convert 12-hour to 24-hour exactly: "9 am" -> "09:00", "9 pm" -> "21:00", "12 noon" -> "12:00", "12 midnight" -> "00:00".
- If the user specifies both a start and an end time (e.g. "9 am to 10 am"), you MUST populate BOTH start_time and end_time.
- When BOTH start_time and end_time exist, duration_minutes MUST equal the difference in minutes.
- Ambiguous activity -> 'Unclear', never guessed as 'Distraction'.`,
    generationConfig: { responseMimeType: 'application/json', responseSchema: parserSchema }
  });
  const res = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: 'User text:\n"9 am to 10 am did nothing"' }] }]
  });
  console.log(res.response.text());
}
test();
