import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { runValidators } from '../src/lib/parser/validators';
import { buildParserSystemInstruction, buildParserUserMessage } from '../src/lib/parser/prompt';
import { callGeminiParser, loadEnvLocal } from '../src/lib/parser/gemini-rest';

const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

async function parseLine(line: string) {
  if (!line.trim()) return null;
  const data = JSON.parse(line);
  return data;
}

export async function runEvals() {
  loadEnvLocal(path.join(__dirname, '..'));
  const datasetPath = path.join(__dirname, 'golden', 'dataset.jsonl');
  const fileStream = fs.createReadStream(datasetPath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const results = [];
  const istDateString = "2026-09-07"; // Mock server date

  console.log(`Starting eval run against ${modelName} (production REST transport, thinking off)...\n`);

  for await (const line of rl) {
    const testCase = await parseLine(line);
    if (!testCase) continue;

    console.log(`Testing [${testCase.id}]: "${testCase.input}"`);

    const systemInstruction = buildParserSystemInstruction(istDateString, '', 'text');
    const userMessage = buildParserUserMessage(testCase.input);

    try {
      const start = Date.now();
      const responseText = await callGeminiParser({ systemInstruction, userMessage });
      const latency = Date.now() - start;

      const rawParsed = JSON.parse(responseText);

      // Run validators
      const finalOutput = runValidators(testCase.input, rawParsed, istDateString, 'text');

      results.push({
        id: testCase.id,
        input: testCase.input,
        expected: testCase.expect,
        actual: finalOutput,
        latency
      });

    } catch (e: any) {
      console.error(`Error on case ${testCase.id}:`, e.message);
      results.push({
        id: testCase.id,
        error: e.message
      });
    }
    
    // Slight pause to respect rate limits
    await new Promise(r => setTimeout(r, 500));
  }

  const outPath = path.join(__dirname, 'results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`\nEval run complete. Results saved to ${outPath}`);
}

if (require.main === module) {
  // Read env vars from .env.local manually if needed for script execution
  // In a real setup, `dotenv` would be used.
  runEvals().catch(console.error);
}
