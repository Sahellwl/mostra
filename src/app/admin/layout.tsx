import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember } from '@/lib/supabase/queries'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { Toaster } from 'sonner'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberData = await getCurrentMember(supabase, user.id)
  if (!memberData || memberData.member.role !== 'super_admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#080810]">
      <AdminSidebar />

      <main className="md:ml-[200px] min-h-screen">
        <div className="px-4 md:px-8 py-8">{children}</div>
      </main>

      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#0d0d1a',
            border: '1px solid #1e1e3a',
            color: '#ffffff',
          },
        }}
      />
    </div>
  )
}
