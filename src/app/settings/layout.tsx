import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember } from '@/lib/supabase/queries'
import Sidebar from '@/components/dashboard/Sidebar'
import AdminHeader from '@/components/dashboard/AdminHeader'
import { Toaster } from 'sonner'
import SettingsNav from './SettingsNav'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const memberData = await getCurrentMember(supabase, user.id)
  const role = memberData?.member.role
  if (role !== 'super_admin' && role !== 'agency_admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <AdminHeader />

      <main className="md:ml-[180px] min-h-screen pt-14">
        <div className="px-4 md:px-8 py-8">
          <SettingsNav />
          {children}
        </div>
      </main>

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
    </div>
  )
}
