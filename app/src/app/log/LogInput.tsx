'use client'

import { useState, useRef, FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const CHIPS = [
  "9–11 trading",
  "45 mins YouTube",
  "1:30 to 3 client work",
  "Last 1 hour mostly phone"
]

export default function LogInput({ initialText = '' }: { initialText?: string }) {
  const [text, setText] = useState(initialText)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const handleChipClick = (chipText: string) => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    
    // Insert text at cursor position with a trailing space
    const newText = text.substring(0, start) + chipText + " " + text.substring(end)
    setText(newText)
    
    // Reset cursor position after React re-renders
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + chipText.length + 1
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isParsing) return

    setIsParsing(true)
    setError(null)

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error('Failed to parse text')
      }

      const data = await response.json()
      
      // Navigate to review screen and pass data via state or session storage
      // In a real app, this might be saved to a database and fetched on the review page
      sessionStorage.setItem('pendingParseResult', JSON.stringify(data))
      router.push('/review')
    } catch (err) {
      setError("We had trouble parsing that. Please try again.")
      setIsParsing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 pb-4">
      <div className="relative mb-6">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="9 to 10 — 15 mins wasted, 30 mins study. 11 to 1 charts and backtesting…"
          className="w-full min-h-[160px] p-4 bg-surface border border-border rounded-md text-ink text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 transition-shadow duration-150 ease-out"
          disabled={isParsing}
        />
        {error && (
          <p className="mt-2 text-sm text-ink-muted">
            {error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-auto">
        {CHIPS.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleChipClick(chip)}
            disabled={isParsing}
            className="px-4 py-2 bg-[#F4F4F5] text-ink text-sm rounded-full border border-transparent min-h-[44px] hover:bg-[#E4E4E7] active:bg-[#D4D4D8] transition-colors duration-150 ease-out disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={!text.trim() || isParsing}
        className="w-full mt-6 bg-ink text-background rounded-md py-4 text-lg font-medium disabled:opacity-50 min-h-[44px] transition-opacity duration-150 ease-out"
      >
        {isParsing ? 'Parsing…' : 'Parse my day'}
      </button>
    </form>
  )
}
