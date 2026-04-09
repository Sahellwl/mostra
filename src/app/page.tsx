import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
    return null
  }

  const { data } = await supabase
    .from('agency_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('invited_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const role = (data as { role: string } | null)?.role

  if (role === 'super_admin') redirect('/admin')
  if (role === 'client') redirect('/client/dashboard')

  redirect('/dashboard')
}
