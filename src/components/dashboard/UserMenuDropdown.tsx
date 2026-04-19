'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface UserMenuDropdownProps {
  name: string
  email: string
  initials: string
  avatarUrl: string | null
}

export default function UserMenuDropdown({
  name,
  email,
  initials,
  avatarUrl,
}: UserMenuDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger — avatar + name */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[#1a1a1a] transition-colors"
        aria-label="Menu utilisateur"
      >
        <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] font-bold text-[#777777] leading-none">{initials}</span>
          )}
        </div>
        <span className="hidden sm:block text-xs text-[#777777] truncate max-w-[120px]">{name}</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-[#111111] border border-[#2a2a2a] rounded-xl shadow-2xl shadow-black/60 overflow-hidden">
          {/* User info — read-only */}
          <div className="px-4 py-3 border-b border-[#1a1a1a]">
            <p className="text-xs font-semibold text-white truncate">{name}</p>
            <p className="text-[11px] text-[#555555] truncate mt-0.5">{email}</p>
          </div>

          {/* Actions */}
          <div className="py-1">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            >
              <User className="h-3.5 w-3.5 flex-shrink-0" />
              Mon compte
            </Link>

            <div className="h-px bg-[#1a1a1a] mx-3 my-1" />

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-[#a0a0a0] hover:text-red-400 hover:bg-[#1a1a1a] transition-colors text-left"
            >
              <LogOut className="h-3.5 w-3.5 flex-shrink-0" />
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
