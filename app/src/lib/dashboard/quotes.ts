// The Mirror — curated public-domain quotes about time.
// Deterministic selection keyed to (date, day-state): same day + same data = same quote.
// Hard rules honored: never AI-generated, never a timer, nothing rotates on its own.

export type MirrorTheme = 'attention' | 'loss' | 'momentum' | 'stillness'

export type MirrorQuote = {
  text: string
  author: string
  theme: MirrorTheme
}

export const MIRROR_QUOTES: MirrorQuote[] = [
  // — attention —
  { text: 'My experience is what I agree to attend to.', author: 'William James', theme: 'attention' },
  { text: "Concentrate every minute on doing what's in front of you with precise and genuine seriousness.", author: 'Marcus Aurelius', theme: 'attention' },
  { text: 'You become what you give your attention to.', author: 'Epictetus', theme: 'attention' },
  { text: 'To be everywhere is to be nowhere.', author: 'Seneca', theme: 'attention' },
  { text: 'It is not enough to be busy. So are the ants. The question is: what are we busy about?', author: 'Henry David Thoreau', theme: 'attention' },
  { text: 'Things which matter most must never be at the mercy of things which matter least.', author: 'Johann Wolfgang von Goethe', theme: 'attention' },

  // — loss —
  { text: 'It is not that we have a short time to live, but that we waste a lot of it.', author: 'Seneca', theme: 'loss' },
  { text: 'Dost thou love life? Then do not squander time, for that is the stuff life is made of.', author: 'Benjamin Franklin', theme: 'loss' },
  { text: 'Lost time is never found again.', author: 'Benjamin Franklin', theme: 'loss' },
  { text: 'While we are postponing, life speeds by.', author: 'Seneca', theme: 'loss' },
  { text: 'People are frugal in guarding their property, but wasteful in squandering time — the one thing in which it is right to be stingy.', author: 'Seneca', theme: 'loss' },
  { text: 'You could leave life right now. Let that determine what you do and say and think.', author: 'Marcus Aurelius', theme: 'loss' },
  { text: 'You cannot kill time without injuring eternity.', author: 'Henry David Thoreau', theme: 'loss' },

  // — momentum —
  { text: 'First say to yourself what you would be; and then do what you have to do.', author: 'Epictetus', theme: 'momentum' },
  { text: "Think of yourself as dead. You have lived your life. Now take what's left and live it properly.", author: 'Marcus Aurelius', theme: 'momentum' },
  { text: 'The man who moves a mountain begins by carrying away small stones.', author: 'Confucius', theme: 'momentum' },
  { text: 'Knowing is not enough; we must apply. Willing is not enough; we must do.', author: 'Johann Wolfgang von Goethe', theme: 'momentum' },
  { text: 'A journey of a thousand miles begins with a single step.', author: 'Lao Tzu', theme: 'momentum' },
  { text: 'The two most powerful warriors are patience and time.', author: 'Leo Tolstoy', theme: 'momentum' },
  { text: 'No man is free who is not master of himself.', author: 'Epictetus', theme: 'momentum' },

  // — stillness —
  { text: 'Nature does not hurry, yet everything is accomplished.', author: 'Lao Tzu', theme: 'stillness' },
  { text: 'Time stays long enough for anyone who will use it.', author: 'Leonardo da Vinci', theme: 'stillness' },
  { text: "If you seek tranquility, do less. Do what's essential.", author: 'Marcus Aurelius', theme: 'stillness' },
  { text: 'Time is a threefold present: memory of what is past, attention to what is present, expectation of what is to come.', author: 'Augustine of Hippo', theme: 'stillness' },
  { text: 'You have to live on twenty-four hours of daily time. Out of it you have to spin health, pleasure, money, content, respect, and the evolution of your immortal soul.', author: 'Arnold Bennett', theme: 'stillness' },
  { text: 'Time is but the stream I go a-fishing in.', author: 'Henry David Thoreau', theme: 'stillness' },
  { text: 'As is a tale, so is life: not how long it is, but how good it is, is what matters.', author: 'Seneca', theme: 'stillness' },
  { text: 'The supply of time is a daily miracle.', author: 'Arnold Bennett', theme: 'stillness' },
]

// Day-state derived from logged data (deterministic, mirrors getTruthLine's thresholds)
export function getMirrorState(
  productive: number,
  distraction: number,
  totalLogged: number
): MirrorTheme {
  if (totalLogged === 0) return 'stillness'
  if (distraction >= 120) return 'loss'
  if (distraction >= 60) return 'attention'
  if (productive >= 180) return 'momentum'
  return 'stillness'
}

// Stable index into MIRROR_QUOTES for the given date + state.
export function getMirrorQuoteIndex(dateStr: string, state: MirrorTheme): number {
  const dayNum = parseInt(dateStr.replace(/-/g, ''), 10) || 0
  const bucket = MIRROR_QUOTES.map((q, i) => (q.theme === state ? i : -1)).filter((i) => i >= 0)
  if (bucket.length === 0) return dayNum % MIRROR_QUOTES.length
  return bucket[(dayNum + state.length) % bucket.length]
}

export function getAllMirrorQuotes(): MirrorQuote[] {
  return MIRROR_QUOTES
}
