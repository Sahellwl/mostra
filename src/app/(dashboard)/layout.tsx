import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/dashboard/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />

      {/* Main content — offset par la sidebar */}
      <main className="ml-[180px] min-h-screen">
        <div className="px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
