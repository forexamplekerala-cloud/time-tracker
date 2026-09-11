'use client'

import { useState } from 'react'
import { getAllMirrorQuotes } from '@/lib/dashboard/quotes'

// Quiet footnote at the very bottom — an afterthought, never a buffer before the truth.
// Tappable to cycle (invisible affordance — no button chrome, no timer, still deterministic).
export default function MirrorQuote({ initialIndex }: { initialIndex: number }) {
  const quotes = getAllMirrorQuotes()
  const count = quotes.length
  const [i, setI] = useState(initialIndex)
  const q = quotes[((i % count) + count) % count]

  return (
    <button
      onClick={() => setI((x) => x + 1)}
      className="block w-full mt-6 py-3 min-h-[44px] text-center text-xs italic leading-snug text-[#A8A29E]"
      title="Tap for another"
      aria-label={`Quote by ${q.author}. Tap for another.`}
    >
      &ldquo;{q.text}&rdquo; — {q.author}
    </button>
  )
}
