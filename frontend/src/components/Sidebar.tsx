import { NavLink } from 'react-router-dom'
import { BarChart2, Search, Settings, Tag, Zap } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: BarChart2 },
  { to: '/brands', label: 'Brands', icon: Tag },
  { to: '/queries', label: 'Queries', icon: Search },
  { to: '/audits', label: 'Audits', icon: Zap },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-700">
        <span className="text-xl font-bold tracking-tight text-white">🔭 Aperture</span>
        <p className="text-xs text-gray-400 mt-0.5">AI Visibility Monitor</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-5 py-4 border-t border-gray-700 text-xs text-gray-500">
        v0.1.0 · MIT License
      </div>
    </aside>
  )
}
