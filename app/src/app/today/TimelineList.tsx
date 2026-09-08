'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Entry = {
  id: string
  category: string
  activity: string
  raw_fragment: string
  duration_minutes: number | null
  start_time: string | null
  end_time: string | null
}

const CATEGORY_COLORS: Record<string, string> = {
  'Trading/Deep Work': 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/20',
  'Agency/Business': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Life/Fuel': 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
  'Distraction': 'bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/20',
  'Unclear': 'bg-[#A1A1AA]/10 text-[#A1A1AA] border-[#A1A1AA]/20'
}

export default function TimelineList({ initialEntries }: { initialEntries: Entry[] }) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const formatDuration = (mins: number | null, start: string | null, end: string | null) => {
    let m = mins || 0
    if (!m && start && end) {
      const [h1, m1] = start.split(':').map(Number)
      const [h2, m2] = end.split(':').map(Number)
      m = (h2 * 60 + m2) - (h1 * 60 + m1)
      if (m < 0) m += 24 * 60
    }
    if (m === 0) return ''
    if (m < 60) return `${m}m`
    return `${Math.floor(m/60)}h ${m%60}m`
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    setLoadingId(id)
    try {
      const res = await fetch(`/api/entries/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      router.refresh() // re-fetch data on the server component
    } catch (e) {
      console.error(e)
      alert('Could not delete entry.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleEdit = async (entry: Entry) => {
    // Edit flow: Take it back to the parser. Delete it here, then redirect.
    if (!confirm('Edit this entry? It will be removed from your timeline so you can parse it again.')) return
    setLoadingId(entry.id)
    try {
      const res = await fetch(`/api/entries/${entry.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      
      const params = new URLSearchParams()
      params.set('reparse', entry.raw_fragment)
      router.push(`/log?${params.toString()}`)
    } catch (e) {
      console.error(e)
      alert('Could not prepare edit.')
      setLoadingId(null)
    }
  }

  if (!initialEntries || initialEntries.length === 0) {
    return (
      <div className="text-center p-8 bg-surface border border-border rounded-md">
        <p className="text-ink-muted text-sm">No entries logged today.</p>
      </div>
    )
  }

  // Sort by created_at or start time if needed, but assuming DB order or sequential insert is fine
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-1">Timeline</h3>
      {initialEntries.map(entry => {
        const colorClass = CATEGORY_COLORS[entry.category] || CATEGORY_COLORS['Unclear']
        const duration = formatDuration(entry.duration_minutes, entry.start_time, entry.end_time)
        
        return (
          <div key={entry.id} className={`p-4 bg-surface border border-border rounded-md relative ${loadingId === entry.id ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-start mb-2">
              <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
                {entry.category}
              </span>
              <div className="flex gap-2 text-ink-muted">
                <button onClick={() => handleEdit(entry)} className="hover:text-ink transition-colors" title="Edit text">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                </button>
                <button onClick={() => handleDelete(entry.id)} className="hover:text-red-500 transition-colors" title="Delete entry">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
              </div>
            </div>
            
            <p className="text-base text-ink font-medium mb-1">{entry.activity}</p>
            
            <div className="flex justify-between items-end mt-2">
              <p className="text-xs text-ink-muted italic line-clamp-2 pr-4 w-4/5">"{entry.raw_fragment}"</p>
              <span className="text-sm font-mono text-ink shrink-0">{duration}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
