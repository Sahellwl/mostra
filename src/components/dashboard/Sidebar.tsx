'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Settings, LogOut, Shield, Menu, X } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { signOut, isSuperAdmin } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const close = () => setMobileOpen(false)

  return (
    <>
      {/* Hamburger — mobile only */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-lg bg-[#111111] border border-[#2a2a2a]
          flex items-center justify-center text-[#a0a0a0] hover:text-white transition-colors"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Backdrop — mobile only */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-[180px] bg-[#111111] border-r border-[#2a2a2a]
          flex flex-col z-50 transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-[#2a2a2a] flex items-center justify-between">
          <div>
            <span className="text-[15px] font-bold tracking-[0.3em] text-white select-none">
              MO<span className="text-[#EF4444]">ST</span>RA
            </span>
            <p className="mt-0.5 text-[10px] tracking-widest text-[#444444] uppercase">Studio</p>
          </div>
          <button
            onClick={close}
            aria-label="Fermer le menu"
            className="md:hidden w-6 h-6 flex items-center justify-center text-[#555555] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${
                    isActive
                      ? 'bg-[#EF4444]/10 text-[#EF4444] font-medium'
                      : 'text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a]'
                  }
                `}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#EF4444]' : ''}`} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-[#2a2a2a] space-y-1">
          {isSuperAdmin && (
            <Link
              href="/admin"
              onClick={close}
              aria-label="Vue Super Admin"
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: '#8B5CF620',
                border: '1px solid #8B5CF640',
                color: '#8B5CF6',
              }}
            >
              <Shield className="h-3.5 w-3.5 flex-shrink-0" />
              Vue Super Admin
            </Link>
          )}
          <button
            onClick={signOut}
            aria-label="Se déconnecter"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[#666666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}
