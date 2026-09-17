/**
 * suggestions.ts
 * Pure, zero-dependency helper functions for:
 * 1. Time-typing completions (e.g. "9" -> "9:00", "9:30", "9:45")
 * 2. Phrase memory & top phrase ranking via localStorage
 * 
 * Works 100% offline, zero network requests, zero AI cost.
 */

export type SuggestionItem = {
  label: string;
  insertText: string;
  replaceLength: number; // how many characters back from cursor to replace
};

const STORAGE_KEY = 'time_audit_phrase_history';
const DEFAULT_CHIPS = [
  'Traded 2h',
  '1h gym',
  'Wasted 45m on phone'
];

/**
 * Load phrase history safely from localStorage
 */
export function loadPhraseHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
  } catch (_) {}
  return [];
}

/**
 * Save new phrases to localStorage, deduplicating and keeping the most recent 50
 */
export function savePhraseHistory(newPhrases: string[]): void {
  if (typeof window === 'undefined' || !newPhrases || newPhrases.length === 0) return;
  try {
    const existing = loadPhraseHistory();
    const seen = new Set<string>();
    const combined: string[] = [];

    // Add new phrases first
    for (const phrase of newPhrases) {
      const trimmed = phrase.trim();
      const lower = trimmed.toLowerCase();
      if (trimmed.length >= 2 && !seen.has(lower)) {
        seen.add(lower);
        combined.push(trimmed);
      }
    }

    // Add existing history
    for (const phrase of existing) {
      const lower = phrase.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        combined.push(phrase);
      }
    }

    // Keep top 50
    const bounded = combined.slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bounded));
  } catch (_) {}
}

/**
 * Get top chips to display at the bottom of the input form.
 * Returns user's top phrases or falls back to DEFAULT_CHIPS.
 */
export function getTopChips(history: string[]): string[] {
  if (history && history.length > 0) {
    return history.slice(0, 4);
  }
  return DEFAULT_CHIPS;
}

/**
 * Generate time suggestions based on current token
 */
export function getTimeSuggestions(
  currentWord: string,
  precedingText: string
): SuggestionItem[] {
  const suggestions: SuggestionItem[] = [];
  const token = currentWord.trim();
  if (!token) {
    // If user just typed a completed time and space, e.g. "9:30 " or "10am "
    const timeMatch = precedingText.match(/(\b\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+$/i);
    if (timeMatch) {
      const timeStr = timeMatch[1].trim();
      // Suggest "to" or range continuation
      suggestions.push({
        label: 'to',
        insertText: 'to ',
        replaceLength: 0
      });
      suggestions.push({
        label: `${timeStr} –`,
        insertText: '– ',
        replaceLength: 0
      });
    }
    return suggestions;
  }

  // 1. Bare hour: e.g. "9" or "10"
  if (/^\d{1,2}$/.test(token)) {
    const h = parseInt(token, 10);
    if (h >= 1 && h <= 12) {
      const endH = h + 2 > 12 ? h + 2 - 12 : h + 2;
      suggestions.push(
        { label: `${h}:00`, insertText: `${h}:00`, replaceLength: token.length },
        { label: `${h}:30`, insertText: `${h}:30`, replaceLength: token.length },
        { label: `${h}:45`, insertText: `${h}:45`, replaceLength: token.length },
        { label: `${h} to ${endH}`, insertText: `${h} to ${endH}`, replaceLength: token.length }
      );
    } else if (h >= 13 && h <= 23) {
      suggestions.push(
        { label: `${h}:00`, insertText: `${h}:00`, replaceLength: token.length },
        { label: `${h}:30`, insertText: `${h}:30`, replaceLength: token.length }
      );
    }
    return suggestions;
  }

  // 2. Dotted or colon hour: "9." or "9:"
  const dotHourMatch = token.match(/^(\d{1,2})[.:]$/);
  if (dotHourMatch) {
    const h = dotHourMatch[1];
    return [
      { label: `${h}:00`, insertText: `${h}:00`, replaceLength: token.length },
      { label: `${h}:15`, insertText: `${h}:15`, replaceLength: token.length },
      { label: `${h}:30`, insertText: `${h}:30`, replaceLength: token.length },
      { label: `${h}:45`, insertText: `${h}:45`, replaceLength: token.length }
    ];
  }

  // 3. Partial minute: "9:3", "9.3", "09:1"
  const partialMinMatch = token.match(/^(\d{1,2})[.:](\d)$/);
  if (partialMinMatch) {
    const h = partialMinMatch[1];
    const m = partialMinMatch[2];
    if (m === '0') {
      return [{ label: `${h}:00`, insertText: `${h}:00`, replaceLength: token.length }];
    }
    if (m === '1') {
      return [{ label: `${h}:15`, insertText: `${h}:15`, replaceLength: token.length }];
    }
    if (m === '3') {
      return [
        { label: `${h}:30`, insertText: `${h}:30`, replaceLength: token.length },
        { label: `${h}:30 am`, insertText: `${h}:30 am`, replaceLength: token.length },
        { label: `${h}:30 pm`, insertText: `${h}:30 pm`, replaceLength: token.length }
      ];
    }
    if (m === '4') {
      return [{ label: `${h}:45`, insertText: `${h}:45`, replaceLength: token.length }];
    }
  }

  // 4. Hour + a/p: e.g. "9a", "9p", "9am", "9pm"
  const amPmMatch = token.match(/^(\d{1,2})(a|p|am|pm)$/i);
  if (amPmMatch) {
    const h = amPmMatch[1];
    const indicator = amPmMatch[2].toLowerCase();
    const period = indicator.startsWith('p') ? 'pm' : 'am';
    const nextH = (parseInt(h, 10) % 12) + 2;
    return [
      { label: `${h}${period}`, insertText: `${h}${period}`, replaceLength: token.length },
      { label: `${h}${period} to ${nextH}${period}`, insertText: `${h}${period} to ${nextH}${period}`, replaceLength: token.length }
    ];
  }

  return suggestions;
}

/**
 * Filter past phrase memory for autocomplete
 */
export function getPhraseSuggestions(
  currentWord: string,
  history: string[]
): SuggestionItem[] {
  const token = currentWord.trim();
  if (token.length < 2 || /^\d+$/.test(token)) return [];

  const lower = token.toLowerCase();
  const matches: SuggestionItem[] = [];

  for (const phrase of history) {
    if (phrase.toLowerCase().startsWith(lower) && phrase.toLowerCase() !== lower) {
      matches.push({
        label: phrase,
        insertText: phrase,
        replaceLength: token.length
      });
      if (matches.length >= 4) break;
    }
  }

  // Subsequence / contains match fallback if few prefix matches
  if (matches.length < 3) {
    for (const phrase of history) {
      if (
        !phrase.toLowerCase().startsWith(lower) &&
        phrase.toLowerCase().includes(lower)
      ) {
        matches.push({
          label: phrase,
          insertText: phrase,
          replaceLength: token.length
        });
        if (matches.length >= 4) break;
      }
    }
  }

  return matches;
}

/**
 * Derive active suggestions at the user's cursor position
 */
export function getActiveSuggestions(
  text: string,
  cursorPos: number,
  history: string[]
): SuggestionItem[] {
  if (cursorPos < 0 || cursorPos > text.length) return [];

  const beforeCursor = text.slice(0, cursorPos);
  // Find current word (back to whitespace or newline)
  const lastSpaceIdx = Math.max(
    beforeCursor.lastIndexOf(' '),
    beforeCursor.lastIndexOf('\n'),
    beforeCursor.lastIndexOf('\t')
  );

  const currentWord = lastSpaceIdx === -1 
    ? beforeCursor 
    : beforeCursor.slice(lastSpaceIdx + 1);
  const precedingText = lastSpaceIdx === -1 
    ? '' 
    : beforeCursor.slice(0, lastSpaceIdx + 1);

  // First check time suggestions
  const timeSugg = getTimeSuggestions(currentWord, precedingText);
  if (timeSugg.length > 0) {
    return timeSugg.slice(0, 5);
  }

  // Next check phrase suggestions
  const phraseSugg = getPhraseSuggestions(currentWord, history);
  return phraseSugg.slice(0, 5);
}
