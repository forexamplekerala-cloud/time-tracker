'use client'

import { useState, useRef, FormEvent, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const CHIPS = [
  "9–11 trading",
  "45 mins YouTube",
  "1:30 to 3 client work",
  "Last 1 hour mostly phone"
]

export default function LogInput() {
  const [text, setText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const reparseText = searchParams.get('reparse')
    if (reparseText) {
      setText(reparseText)
    }
  }, [searchParams])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-IN'

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = ''
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            currentTranscript += event.results[i][0].transcript
          }
          
          setText(prev => {
            // Append transcribed text, ensuring space if needed
            const prefix = prev && !prev.endsWith(' ') ? prev + ' ' : prev
            return prefix + currentTranscript
          })
        }

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error)
          setIsListening(false)
        }
        
        recognitionRef.current.onend = () => {
          setIsListening(false)
        }
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const toggleListen = () => {
    if (!recognitionRef.current) return
    
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setText(prev => prev && !prev.endsWith(' ') ? prev + ' ' : prev) // ensure trailing space before dictation starts
      recognitionRef.current.start()
      setIsListening(true)
    }
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
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2 font-medium text-sm">
          <svg className="shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span>{error}</span>
        </div>
      )}
      <div className="relative mb-6">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="9 to 10 — 15 mins wasted, 30 mins study. 11 to 1 charts and backtesting…"
          className="w-full min-h-[160px] p-4 bg-surface border border-border rounded-md text-ink text-base leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-600 transition-shadow duration-150 ease-out pr-12"
          disabled={isParsing}
        />
        {recognitionRef.current && (
          <button
            type="button"
            onClick={toggleListen}
            disabled={isParsing}
            className={`absolute bottom-4 right-4 p-2 rounded-full transition-colors ${
              isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-surface text-ink-muted hover:bg-[#F4F4F5]'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 9h6v6H9z"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            )}
          </button>
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
