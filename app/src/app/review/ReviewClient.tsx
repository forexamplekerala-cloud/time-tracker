'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Edit2, AlertCircle } from 'lucide-react'
import clsx from 'clsx'

type ParsedEntry = {
  id?: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  category: string;
  activity: string;
  raw_fragment: string;
  confidence: string;
  needs_review: boolean;
  violations?: string[];
  ai_misread?: boolean;
  impact_rating?: 'good' | 'mid' | 'bad' | null;
  edited?: boolean;
}

const categoryColors: Record<string, { bg: string, text: string, dot: string }> = {
  'Trading/Deep Work': { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]', dot: 'bg-[#16A34A]' },
  'Agency/Business': { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]', dot: 'bg-[#2563EB]' },
  'Life/Fuel': { bg: 'bg-[#FEF3C7]', text: 'text-[#B45309]', dot: 'bg-[#F59E0B]' },
  'Distraction': { bg: 'bg-[#FEE2E2]', text: 'text-[#B91C1C]', dot: 'bg-[#DC2626]' },
  'Unclear': { bg: 'bg-[#F4F4F5]', text: 'text-[#52525B]', dot: 'bg-[#A1A1AA]' },
}

export default function ReviewClient() {
  const router = useRouter()
  const [entries, setEntries] = useState<ParsedEntry[]>([])
  const [unparsed, setUnparsed] = useState<string[]>([])
  const [date, setDate] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const dataStr = sessionStorage.getItem('pendingParseResult')
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr)
        setDate(data.date)
        setEntries(data.entries.map((e: any, i: number) => ({ ...e, id: `temp-${i}` })))
        setUnparsed(data.unparsed_fragments || [])
      } catch (e) {
        console.error("Failed to parse session data", e)
      }
    }
  }, [])

  const toggleMisread = (id: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ai_misread: !e.ai_misread } : e))
  }

  const setImpactRating = (id: string, rating: 'good' | 'mid' | 'bad') => {
    setEntries(prev => prev.map(e => e.id === id ? { 
      ...e, 
      impact_rating: e.impact_rating === rating ? null : rating 
    } : e))
  }

  const setCategory = (id: string, newCategory: string) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, category: newCategory, edited: true } : e))
  }

  const handleDelete = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, entries })
      })

      if (!response.ok) throw new Error("Failed to save")
      
      sessionStorage.removeItem('pendingParseResult')
      router.push('/today')
    } catch (e) {
      alert("Error saving entries")
      setIsSaving(false)
    }
  }

  if (entries.length === 0 && unparsed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-ink-muted mb-4">No data to review right now.</p>
        <button 
          onClick={() => router.push('/today')} 
          className="px-6 py-2 bg-[#F4F4F5] text-ink rounded-md font-medium hover:bg-[#E4E4E7] transition-colors"
        >
          Back to Timeline
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      {unparsed.length > 0 && (
        <div className="mb-6 p-4 bg-[#F4F4F5] border border-border rounded-md">
          <p className="text-sm font-medium text-ink mb-2 flex items-center gap-2">
            <AlertCircle size={16} /> Unparsed fragments (ignored)
          </p>
          <ul className="text-sm text-ink-muted list-disc pl-4 space-y-1">
            {unparsed.map((text, i) => <li key={i}>{text}</li>)}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-4 mb-8">
        {entries.map((entry) => {
          const colors = categoryColors[entry.category] || categoryColors['Unclear']
          const formatTime = (t: string | null) => t ? t : '--:--'
          
          return (
            <div key={entry.id} className={clsx("p-4 bg-surface border rounded-md shadow-sm", entry.needs_review ? "border-amber-400 ring-1 ring-amber-400" : "border-border")}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="font-mono text-lg text-ink">
                    {formatTime(entry.start_time)} – {formatTime(entry.end_time)}
                  </div>
                  {entry.violations && entry.violations.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap">
                      {entry.violations.includes('V9_FUTURE_END_TIME') && (
                        <span className="text-[10px] uppercase font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                          ⏰ End time was future
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <AlertCircle size={12} /> Check me
                      </span>
                    </div>
                  )}
                </div>
                {entry.duration_minutes && (
                  <div className="font-mono text-sm text-ink-muted">
                    {entry.duration_minutes} min
                  </div>
                )}
              </div>
              
              {entry.violations && entry.violations.length > 0 && (
                <div className="mb-3 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
                  Possible issues: {entry.violations.map(v => v.replace('V2_', '').replace('V3_', '').replace('V4_', '').replace('V5_', '').replace('V9_', '').replace(/_/g, ' ')).join(', ')}
                </div>
              )}

              <div className="text-ink mb-4">{entry.activity}</div>
              
              <div className="mb-4">
                <p className="text-xs font-medium text-ink-muted mb-2">Impact on your goals?</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setImpactRating(entry.id!, 'good')}
                    className={clsx("flex-1 py-1.5 rounded text-xs font-medium border transition-colors", entry.impact_rating === 'good' ? "bg-green-100 border-green-300 text-green-800" : "bg-surface border-border text-ink hover:bg-[#F4F4F5]")}
                  >
                    {entry.impact_rating === 'good' ? '✓ Good' : 'Good'}
                  </button>
                  <button 
                    onClick={() => setImpactRating(entry.id!, 'mid')}
                    className={clsx("flex-1 py-1.5 rounded text-xs font-medium border transition-colors", entry.impact_rating === 'mid' ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-surface border-border text-ink hover:bg-[#F4F4F5]")}
                  >
                    {entry.impact_rating === 'mid' ? '~ Mid' : 'Mid'}
                  </button>
                  <button 
                    onClick={() => setImpactRating(entry.id!, 'bad')}
                    className={clsx("flex-1 py-1.5 rounded text-xs font-medium border transition-colors", entry.impact_rating === 'bad' ? "bg-red-100 border-red-300 text-red-800" : "bg-surface border-border text-ink hover:bg-[#F4F4F5]")}
                  >
                    {entry.impact_rating === 'bad' ? '✗ Bad' : 'Bad'}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className={clsx("flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium relative focus-within:ring-2 focus-within:ring-ink transition-all", colors.bg, colors.text)}>
                  <div className={clsx("w-2 h-2 rounded-full shrink-0", colors.dot)}></div>
                  <select 
                    value={entry.category} 
                    onChange={(e) => setCategory(entry.id!, e.target.value)}
                    className={clsx("appearance-none bg-transparent border-none outline-none cursor-pointer pr-4 font-medium", colors.text)}
                  >
                    {Object.keys(categoryColors).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <svg className="w-3 h-3 absolute right-2 pointer-events-none opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-ink-muted cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={entry.ai_misread || false}
                      onChange={() => toggleMisread(entry.id!)}
                      className="rounded border-border"
                    />
                    AI misread
                  </label>
                  <button onClick={() => handleDelete(entry.id!)} className="text-ink-muted hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full mt-auto bg-ink text-background rounded-md py-4 text-lg font-medium disabled:opacity-50 transition-opacity"
      >
        {isSaving ? 'Saving…' : 'Save to timeline'}
      </button>
    </div>
  )
}
