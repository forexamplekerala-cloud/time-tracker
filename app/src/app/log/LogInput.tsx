'use client'

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  loadPhraseHistory,
  getTopChips,
  getActiveSuggestions,
  SuggestionItem
} from '@/lib/suggestions'

export default function LogInput({ initialText = '' }: { initialText?: string }) {
  const [text, setText] = useState(initialText)
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [phraseHistory, setPhraseHistory] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  // Load offline phrase memory on mount
  useEffect(() => {
    setPhraseHistory(loadPhraseHistory())
  }, [])

  // Autofocus on desktop only — on mobile the popping keyboard is jarring.
  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) {
      textareaRef.current?.focus()
    }
  }, [])

  const updateSuggestions = (newText: string, cursorPos: number) => {
    const items = getActiveSuggestions(newText, cursorPos, phraseHistory)
    setSuggestions(items)
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)
    updateSuggestions(newText, e.target.selectionStart)
  }

  const handleCursorMove = () => {
    if (!textareaRef.current) return
    updateSuggestions(text, textareaRef.current.selectionStart)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Desktop Tab shortcut to accept top suggestion
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault()
      handleSuggestionClick(suggestions[0])
    }
  }

  const handleSuggestionClick = (item: SuggestionItem) => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    const cursor = textarea.selectionStart

    const before = text.substring(0, Math.max(0, cursor - item.replaceLength))
    const after = text.substring(cursor)
    const newText = before + item.insertText + " " + after
    setText(newText)

    const newCursor = before.length + item.insertText.length + 1
    setSuggestions([])

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(newCursor, newCursor)
    }, 0)
  }

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
      updateSuggestions(newText, newCursorPos)
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
        let errorMsg = 'Failed to parse text'
        try {
          const errData = await response.json()
          if (errData?.error) errorMsg = errData.error
        } catch (_) {}
        throw new Error(errorMsg)
      }

      const data = await response.json()
      
      sessionStorage.setItem('pendingParseResult', JSON.stringify(data))
      router.push('/review')
    } catch (err: any) {
      setError(err?.message || "We had trouble parsing that. Please try again.")
      setIsParsing(false)
    }
  }

  const chips = getTopChips(phraseHistory)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 pb-4">
      <div className="relative mb-4 flex-1 flex flex-col">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyUp={handleCursorMove}
          onClick={handleCursorMove}
          onKeyDown={handleKeyDown}
          placeholder="e.g., woke up late, traded for 2 hours, then got distracted on YouTube…"
          className="w-full flex-1 min-h-[220px] p-4 bg-surface border border-border rounded-md text-ink text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 transition-shadow duration-150 ease-out"
          disabled={isParsing}
          autoCapitalize="sentences"
          spellCheck={true}
          autoCorrect="on"
        />
        {error && (
          <p className="mt-2 text-sm text-ink-muted leading-snug">
            {error}
          </p>
        )}
      </div>

      {/* Typing Suggestions Strip */}
      {suggestions.length > 0 && (
        <div 
          className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-2 no-scrollbar"
          role="region"
          aria-label="Typing suggestions"
        >
          <span className="text-[10px] uppercase font-mono tracking-wider text-ink-muted pl-0.5 shrink-0">
            Suggest:
          </span>
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestionClick(item)}
              disabled={isParsing}
              className="px-3 py-1.5 bg-[#FAF9F6] border border-border text-ink font-mono text-xs rounded-md whitespace-nowrap hover:bg-[#F4F4F5] active:bg-[#E4E4E7] transition-colors min-h-[38px] flex items-center shadow-2xs"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Phrase Memory Chips */}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip, idx) => (
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
