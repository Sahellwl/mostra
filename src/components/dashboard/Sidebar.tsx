'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients',   label: 'Clients',   icon: Users },
  { href: '/settings',  label: 'Settings',  icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { signOut } = useAuth()

  return (
    <aside className="fixed top-0 left-0 h-screen w-[180px] bg-[#111111] border-r border-[#2a2a2a] flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#2a2a2a]">
        <span className="text-[15px] font-bold tracking-[0.3em] text-white select-none">
          MO<span className="text-[#EF4444]">ST</span>RA
        </span>
        <p className="mt-0.5 text-[10px] tracking-widest text-[#444444] uppercase">
          Studio
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                ${
                  isActive
                    ? 'bg-[#EF4444]/10 text-[#EF4444] font-medium'
                    : 'text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a]'
                }
              `}
            >
              <Icon
                className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#EF4444]' : ''}`}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-[#2a2a2a]">
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[#666666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
        >
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  )
}
