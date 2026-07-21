'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Aperture, BarChart2, MessageCircleQuestion, Search, Settings, Tag, Zap } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: BarChart2 },
  { to: '/ask', label: 'Ask', icon: MessageCircleQuestion },
  { to: '/brands', label: 'Brands', icon: Tag },
  { to: '/queries', label: 'Queries', icon: Search },
  { to: '/audits', label: 'Audits', icon: Zap },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname() ?? '/'
  return (
    <aside className="w-16 sm:w-56 shrink-0 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="px-3 sm:px-5 py-5 border-b border-gray-700">
        <span className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
          <Aperture size={21} className="shrink-0 text-amber-400" /> <span className="hidden sm:inline">Aperture</span>
        </span>
        <p className="hidden sm:block text-xs text-gray-400 mt-0.5">AI Visibility Monitor</p>
      </div>
      <nav className="flex-1 px-2 sm:px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => {
          const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to)
          return (
            <Link
              key={to}
              href={to}
              className={`flex items-center justify-center sm:justify-start gap-3 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          )
        })}
      </nav>
      <div className="hidden sm:block px-5 py-4 border-t border-gray-700 text-xs text-gray-500">
        v0.1.0 · MIT License
      </div>
    </aside>
  )
}
