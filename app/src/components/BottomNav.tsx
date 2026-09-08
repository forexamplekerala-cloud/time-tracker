'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PenSquare, LayoutDashboard, CalendarDays, Settings } from 'lucide-react'
import clsx from 'clsx'

export default function BottomNav() {
  const pathname = usePathname()

  // Hide nav on login and review pages
  if (pathname === '/login' || pathname === '/review') {
    return null
  }

  const items = [
    { label: 'Log', href: '/log', icon: PenSquare },
    { label: 'Today', href: '/today', icon: LayoutDashboard },
    { label: 'Week', href: '/week', icon: CalendarDays },
    { label: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-surface border-t border-border px-6 py-4 flex justify-between items-center z-50">
      {items.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link 
            key={item.href} 
            href={item.href}
            className={clsx(
              "flex flex-col items-center gap-1 transition-colors",
              isActive ? "text-ink" : "text-ink-muted hover:text-ink"
            )}
          >
            <Icon size={24} />
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
