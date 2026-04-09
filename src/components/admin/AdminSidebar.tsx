'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/shared/Logo'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/agencies', label: 'Agences', icon: Building2 },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
]

const ACCENT = '#8B5CF6'

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const close = () => setMobileOpen(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Hamburger — mobile only */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Ouvrir le menu"
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
        style={{ backgroundColor: '#0d0d1a', border: '1px solid #1e1e3a', color: '#6b6b9a' }}
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
          fixed top-0 left-0 h-screen w-[200px] bg-[#0d0d1a] border-r border-[#1e1e3a]
          flex flex-col z-50 transition-transform duration-200 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        {/* Logo + badge Super Admin */}
        <div className="px-5 py-5 border-b border-[#1e1e3a] flex items-start justify-between">
          <div>
            <Logo variant="full" color="white" className="h-7" />
            <div
              className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${ACCENT}20`, border: `1px solid ${ACCENT}40` }}
            >
              <Shield className="h-2.5 w-2.5" style={{ color: ACCENT }} />
              <span
                className="text-[9px] font-bold tracking-widest uppercase"
                style={{ color: ACCENT }}
              >
                Super Admin
              </span>
            </div>
          </div>
          <button
            onClick={close}
            aria-label="Fermer le menu"
            className="md:hidden w-6 h-6 flex items-center justify-center transition-colors"
            style={{ color: '#555577' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={close}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors"
                style={
                  isActive
                    ? {
                        backgroundColor: `${ACCENT}15`,
                        color: ACCENT,
                        fontWeight: 500,
                      }
                    : undefined
                }
                {...(!isActive && {
                  className:
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-[#6b6b9a] hover:text-white hover:bg-[#1a1a2e]',
                })}
              >
                <Icon
                  className="h-4 w-4 flex-shrink-0"
                  style={isActive ? { color: ACCENT } : undefined}
                />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Retour + logout */}
        <div className="px-3 py-4 border-t border-[#1e1e3a] space-y-1">
          <Link
            href="/dashboard"
            onClick={close}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-[#555577] hover:text-white hover:bg-[#1a1a2e] transition-colors"
          >
            ← Dashboard agence
          </Link>
          <button
            onClick={handleSignOut}
            aria-label="Se déconnecter"
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-[#555577] hover:text-white hover:bg-[#1a1a2e] transition-colors"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}
