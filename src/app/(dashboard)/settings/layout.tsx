import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings, Users, GitBranch, Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember } from '@/lib/supabase/queries'

const NAV = [
  { href: '/settings', label: 'Général', icon: Settings },
  { href: '/settings/team', label: 'Équipe', icon: Users },
  { href: '/settings/pipeline', label: 'Pipeline', icon: GitBranch },
  { href: '/settings/branding', label: 'Branding', icon: Palette, disabled: true },
]

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberData = await getCurrentMember(supabase, user.id)
  if (!memberData) redirect('/login')

  const { member } = memberData
  const isAdmin = member.role === 'super_admin' || member.role === 'agency_admin'
  if (!isAdmin) redirect('/dashboard')

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold text-white">Paramètres</h1>
        <p className="text-sm text-[#666666] mt-0.5">Configuration de votre agence</p>
      </div>

      {/* ── Sub-navigation ── */}
      <nav className="flex items-center gap-1 border-b border-[#1a1a1a] pb-0">
        {NAV.map(({ href, label, icon: Icon, disabled }) =>
          disabled ? (
            <span
              key={href}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-[#333333] cursor-not-allowed rounded-t-lg select-none"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              <span className="text-[9px] text-[#333333] border border-[#2a2a2a] rounded px-1 py-0.5 ml-0.5">
                soon
              </span>
            </span>
          ) : (
            <SettingsNavLink key={href} href={href} label={label} Icon={Icon} />
          ),
        )}
      </nav>

      {/* ── Page content ── */}
      <div>{children}</div>
    </div>
  )
}

// Active-aware nav link — server component reads the pathname via a
// searchParam trick isn't available; we rely on client detection instead.
// We make this a simple Link; active styling is handled via a thin wrapper.
function SettingsNavLink({
  href,
  label,
  Icon,
}: {
  href: string
  label: string
  Icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition-colors
        text-[#666666] hover:text-white hover:bg-[#111111]
        [&.active]:text-white [&.active]:border-b-2 [&.active]:border-[#00D76B] [&.active]:bg-transparent"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </Link>
  )
}
