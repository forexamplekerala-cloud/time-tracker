import { createClient } from '@/utils/supabase/server'
import { signOut } from './actions'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex flex-col min-h-screen py-6 px-4">
      <header className="mb-8 flex items-center gap-4">
        <Link href="/log" className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors">
          <ChevronLeft className="w-6 h-6 text-ink" />
        </Link>
        <h1 className="text-2xl text-ink font-semibold">Settings</h1>
      </header>

      <div className="bg-surface border border-border rounded-md divide-y divide-border mb-8">
        <div className="p-4">
          <p className="text-sm text-ink-muted">Account</p>
          <p className="text-ink font-medium mt-1">{user?.email}</p>
        </div>
        
        {/* Export logic would go here in a Client component or API route trigger */}
        <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors">
          <span className="text-ink">Export data (CSV)</span>
        </div>
        <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors">
          <span className="text-ink">Export data (JSON)</span>
        </div>
      </div>
      
      <div className="mb-12">
        <h3 className="text-sm font-medium text-ink-muted mb-2 px-2">Privacy</h3>
        <p className="text-xs text-ink-muted leading-relaxed px-2">
          Your data is entirely private and isolated using Row Level Security. 
          No screen-time connections. No social sharing. No public feeds.
        </p>
      </div>

      <form action={signOut} className="mt-auto">
        <button className="w-full py-4 text-center text-[#DC2626] font-medium bg-surface border border-border rounded-md hover:bg-gray-50 transition-colors">
          Sign out
        </button>
      </form>
    </div>
  )
}
