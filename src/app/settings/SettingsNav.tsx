'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { label: 'Général',     href: '/settings' },
  { label: 'Équipe',      href: '/settings/team' },
  { label: 'Pipeline',    href: '/settings/pipeline' },
  { label: 'Formulaires', href: '/settings/forms' },
  { label: 'Branding',    href: '/settings/branding', disabled: true },
]

export default function SettingsNav() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-1 border-b border-[#1a1a1a] mb-6 -mt-2">
      {NAV.map(({ label, href, disabled }) => {
        const isActive = href === '/settings'
          ? pathname === '/settings'
          : pathname.startsWith(href)

        if (disabled) {
          return (
            <span
              key={href}
              className="px-3 py-2.5 text-sm text-[#333333] cursor-not-allowed select-none"
            >
              {label}
            </span>
          )
        }

        return (
          <Link
            key={href}
            href={href}
            className={`
              px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
              ${isActive
                ? 'border-[#00D76B] text-white'
                : 'border-transparent text-[#666666] hover:text-[#a0a0a0]'}
            `}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
