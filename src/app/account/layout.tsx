import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/helpers'
import { Toaster } from 'sonner'
import Sidebar from '@/components/dashboard/Sidebar'
import AdminHeader from '@/components/dashboard/AdminHeader'
import Link from 'next/link'
import Logo from '@/components/shared/Logo'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Determine role — mirrors useAuth: active agency_members row → admin/creative.
  // We avoid get_user_role() RPC because it can return null for super_admins
  // who may not have an agency_members record, which would wrongly render the client shell.
  const { data: memberRow } = await db(supabase)
    .from('agency_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('invited_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const memberRole = (memberRow?.role ?? null) as string | null
  const isAdminOrCreative =
    memberRole === 'super_admin' || memberRole === 'agency_admin' || memberRole === 'creative'

  const toaster = (
    <Toaster
      theme="dark"
      position="top-right"
      toastOptions={{
        style: {
          background: '#111111',
          border: '1px solid #2a2a2a',
          color: '#ffffff',
        },
      }}
    />
  )

  if (isAdminOrCreative) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <AdminHeader />
        <main className="md:ml-[180px] min-h-screen pt-14">
          <div className="px-4 md:px-8 py-8">{children}</div>
        </main>
        {toaster}
      </div>
    )
  }

  // Client / public role — minimal header (mirrors client layout)
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-[#1a1a1a] bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-[960px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/client/dashboard" className="flex items-center gap-2.5 select-none">
            <Logo variant="full" color="white" className="h-7" />
          </Link>
          <Link
            href="/client/dashboard"
            className="text-xs text-[#666666] hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-[#2a2a2a] hover:border-[#444444]"
          >
            ← Mes projets
          </Link>
        </div>
      </header>
      <main className="max-w-[960px] mx-auto px-6 py-8">{children}</main>
      {toaster}
    </div>
  )
}
