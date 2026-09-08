export type ParsedEntry = {
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  category: string;
  activity: string;
  raw_fragment: string;
  confidence: string;
  needs_review: boolean;
  violations?: string[];
}

export type ParseOutput = {
  date: string;
  entries: ParsedEntry[];
  unparsed_fragments: string[];
  warnings?: string[];
}

const CATEGORIES = ['Trading/Deep Work', 'Agency/Business', 'Life/Fuel', 'Distraction', 'Unclear'];

// Helper to convert HH:MM to minutes
function timeToMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function checkTraceability(input: string, fragment: string): boolean {
  if (!fragment) return false;
  // A simple fuzzy check: all alphanumeric words in fragment should mostly exist in input
  const cleanInput = input.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const cleanFrag = fragment.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const fragTokens = cleanFrag.split(/\s+/).filter(t => t.length > 0);
  if (fragTokens.length === 0) return true;
  
  let matchCount = 0;
  for (const token of fragTokens) {
    if (cleanInput.includes(token)) matchCount++;
  }
  return (matchCount / fragTokens.length) >= 0.8;
}

export function runValidators(
  input: string, 
  rawOutput: any, 
  serverIstDate: string,
  istCurrentTime: string,
  inputMode: 'text' | 'voice' = 'text'
): ParseOutput {
  
  // V1 & V7: Basic Schema and Enum validation (Hard fails -> all unparsed)
  if (!rawOutput || typeof rawOutput !== 'object' || !Array.isArray(rawOutput.entries)) {
    return { date: serverIstDate, entries: [], unparsed_fragments: [input] };
  }

  // V6: Date matching
  let parsedDate = rawOutput.date;
  if (parsedDate) {
    const parts = parsedDate.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      parsedDate = `${y}-${m}-${d}`;
    }
  }

  if (parsedDate !== serverIstDate) {
    // If AI hallucinates a different date, we reject all entries to unparsed_fragments
    return { date: serverIstDate, entries: [], unparsed_fragments: [input] };
  }

  let finalEntries: ParsedEntry[] = [];
  let unparsed = rawOutput.unparsed_fragments || [];
  let warnings: string[] = [];
  const currentMins = timeToMinutes(istCurrentTime);

  for (const entry of rawOutput.entries) {
    const violations: string[] = [];
    let hardFail = false;

    // V7 Enum checks
    if (!CATEGORIES.includes(entry.category)) {
      hardFail = true;
    }
    if (entry.duration_minutes !== null && typeof entry.duration_minutes !== 'number') {
      hardFail = true;
    }

    if (hardFail) {
      unparsed.push(entry.raw_fragment || "unknown fragment");
      continue;
    }

    // V9 Future Time Guard
    if (currentMins !== null) {
      const startMins = timeToMinutes(entry.start_time);
      const endMins = timeToMinutes(entry.end_time);

      if (startMins !== null && startMins > currentMins) {
        // Entire entry is in the future -> hard reject to unparsed
        unparsed.push(entry.raw_fragment || 'unknown fragment');
        warnings.push(`V9_FUTURE_TIME: Entry "${entry.activity}" starts at ${entry.start_time}, current time is ${istCurrentTime}`);
        continue; // skip this entry entirely
      }

      if (endMins !== null && endMins > currentMins) {
        // Entry starts in past but ends in future -> flag for review, clear the future end_time
        entry.end_time = null;
        entry.needs_review = true;
        if (!entry.violations) entry.violations = [];
        entry.violations.push('V9_FUTURE_END_TIME');
      }
    }

    // V2 Traceability
    if (!checkTraceability(input, entry.raw_fragment)) {
      violations.push('V2_TRACEABILITY_FAIL');
    }

    // V3 Arithmetic
    const startMins = timeToMinutes(entry.start_time);
    const endMins = timeToMinutes(entry.end_time);
    
    if (startMins !== null && endMins !== null) {
      let calcDuration = endMins - startMins;
      if (calcDuration < 0) calcDuration += 24 * 60; // handle midnight crossing
      
      if (entry.duration_minutes !== null && calcDuration !== entry.duration_minutes) {
         violations.push('V3_ARITHMETIC_MISMATCH');
      }
    }

    // V4 No invented time (Grace mode for voice input handled by prompt, but we can do a strict check here)
    if (entry.start_time && inputMode === 'text') {
       // Simple check: does the number exist in the input? (Very basic heuristic)
       const h = parseInt(entry.start_time.split(':')[0], 10);
       const h12 = h > 12 ? h - 12 : h;
       const inputLower = input.toLowerCase();
       
       const hRegex = new RegExp('\\b' + h + '\\b');
       const h12Regex = new RegExp('\\b' + h12 + '\\b');
       
       if (!hRegex.test(inputLower) && !h12Regex.test(inputLower)) {
         violations.push('V4_INVENTED_TIME');
       }
    }

    if (violations.length > 0) {
      entry.needs_review = true;
      if (!entry.violations) entry.violations = [];
      entry.violations.push(...violations);
    }

    finalEntries.push(entry);
  }

  // V5 Overlap
  finalEntries.sort((a, b) => (timeToMinutes(a.start_time) || 0) - (timeToMinutes(b.start_time) || 0));
  for (let i = 0; i < finalEntries.length - 1; i++) {
    const e1 = finalEntries[i];
    const e2 = finalEntries[i + 1];
    const e1End = timeToMinutes(e1.end_time);
    const e2Start = timeToMinutes(e2.start_time);
    
    if (e1End !== null && e2Start !== null && e1End > e2Start) {
      e1.needs_review = true;
      e2.needs_review = true;
      if (!e1.violations) e1.violations = [];
      if (!e2.violations) e2.violations = [];
      if (!e1.violations.includes('V5_OVERLAP')) e1.violations.push('V5_OVERLAP');
      if (!e2.violations.includes('V5_OVERLAP')) e2.violations.push('V5_OVERLAP');
    }
  }

  // V8 Coverage check (heuristic)
  // Check if there are time tokens in input not captured in any raw_fragment
  const timeRegex = /\b(\d{1,2}:\d{2}|\d{1,2}\s*(am|pm|baje)|saadhe\s+\w+)\b/gi;
  const matches = input.match(timeRegex);
  if (matches) {
    const allFragments = finalEntries.map(e => e.raw_fragment).join(' ') + ' ' + unparsed.join(' ');
    for (const match of matches) {
      if (!checkTraceability(allFragments, match)) {
        warnings.push(`Missing time token coverage: ${match}`);
      }
    }
  }

  return {
    date: serverIstDate,
    entries: finalEntries,
    unparsed_fragments: unparsed,
    warnings
  };
}
