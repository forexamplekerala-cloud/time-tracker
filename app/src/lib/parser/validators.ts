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
  inputMode: 'text' | 'voice' = 'text'
): ParseOutput {
  
  // V1 & V7: Basic Schema and Enum validation (Hard fails -> all unparsed)
  if (!rawOutput || typeof rawOutput !== 'object' || !Array.isArray(rawOutput.entries)) {
    return { date: serverIstDate, entries: [], unparsed_fragments: [input] };
  }

  // V6: Date matching
  if (rawOutput.date !== serverIstDate) {
    // If AI hallucinates a different date, we reject all entries to unparsed_fragments
    return { date: serverIstDate, entries: [], unparsed_fragments: [input] };
  }

  let finalEntries: ParsedEntry[] = [];
  let unparsed = rawOutput.unparsed_fragments || [];
  let warnings: string[] = [];

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
    const timeRegex = /^([01]?\d|2[0-3]):[0-5]\d$/;
    if (entry.start_time && !timeRegex.test(entry.start_time)) {
      hardFail = true;
    }
    if (entry.end_time && !timeRegex.test(entry.end_time)) {
      hardFail = true;
    }

    if (hardFail) {
      unparsed.push(entry.raw_fragment || "unknown fragment");
      continue;
    }

    // V7.5: Sanitize times to prevent UI overflow from LLM repetition loops (e.g. 08:000000000...)
    if (entry.start_time) {
      const startMatch = entry.start_time.match(/^(\d{1,2}:\d{2})/);
      entry.start_time = startMatch ? startMatch[1].padStart(5, '0') : null;
    }
    if (entry.end_time) {
      const endMatch = entry.end_time.match(/^(\d{1,2}:\d{2})/);
      entry.end_time = endMatch ? endMatch[1].padStart(5, '0') : null;
    }

    // V2 Traceability
    if (!checkTraceability(input, entry.raw_fragment)) {
      violations.push('V2_TRACEABILITY_FAIL');
    }

    // V3 Arithmetic & Reconstruction
    let startMins = timeToMinutes(entry.start_time);
    let endMins = timeToMinutes(entry.end_time);
    
    // If LLM hallucinates duration but drops a time field, reconstruct it!
    if (startMins !== null && endMins === null && entry.duration_minutes) {
        let eMins = startMins + entry.duration_minutes;
        if (eMins >= 24 * 60) eMins -= 24 * 60;
        entry.end_time = `${Math.floor(eMins / 60).toString().padStart(2, '0')}:${(eMins % 60).toString().padStart(2, '0')}`;
        endMins = eMins;
    } else if (endMins !== null && startMins === null && entry.duration_minutes) {
        let sMins = endMins - entry.duration_minutes;
        if (sMins < 0) sMins += 24 * 60;
        entry.start_time = `${Math.floor(sMins / 60).toString().padStart(2, '0')}:${(sMins % 60).toString().padStart(2, '0')}`;
        startMins = sMins;
    }
    
    if (startMins !== null && endMins !== null) {
      let calcDuration = endMins - startMins;
      if (calcDuration < 0) calcDuration += 24 * 60; // handle midnight crossing
      
      if (entry.duration_minutes !== null && calcDuration !== entry.duration_minutes) {
         violations.push('V3_ARITHMETIC_MISMATCH');
      }
    }

    // Deduplication check
    const isDuplicate = finalEntries.some(e => 
      e.start_time === entry.start_time && 
      e.end_time === entry.end_time && 
      e.activity === entry.activity
    );

    if (isDuplicate) {
      continue;
    }

    // V4 No invented time (Grace mode for voice input handled by prompt, but we can do a strict check here)
    if (entry.start_time && inputMode === 'text') {
       // Check if the hour (in 24-hr or 12-hr representation) or midnight keyword appears in user input
       const h = parseInt(entry.start_time.split(':')[0], 10);
       const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
       const inputLower = input.toLowerCase();
       const isMidnight = h === 0 && inputLower.includes('midnight');
       if (!inputLower.includes(h.toString()) && !inputLower.includes(h12.toString()) && !isMidnight) {
         violations.push('V4_INVENTED_TIME');
       }
    }

    if (violations.length > 0) {
      entry.needs_review = true;
      entry.violations = violations;
    }

    finalEntries.push(entry);
  }

  // V5 Overlap: Only entries with both start_time and end_time participate in overlap checks
  const timedEntries = finalEntries.filter(e => e.start_time !== null && e.end_time !== null);
  timedEntries.sort((a, b) => (timeToMinutes(a.start_time)!) - (timeToMinutes(b.start_time)!));
  for (let i = 0; i < timedEntries.length - 1; i++) {
    const e1 = timedEntries[i];
    const e2 = timedEntries[i + 1];
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

  // Final sorting: chronological for timed entries, untimed entries pushed to the end
  finalEntries.sort((a, b) => {
    const aM = timeToMinutes(a.start_time);
    const bM = timeToMinutes(b.start_time);
    if (aM === null && bM === null) return 0;
    if (aM === null) return 1;
    if (bM === null) return -1;
    return aM - bM;
  });

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
