import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: member } = await supabase
    .from('agency_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('invited_at', { ascending: false })
    .limit(1)
    .single()

  if (member?.role === 'super_admin') redirect('/admin')
  if (member?.role === 'client') redirect('/client/dashboard')

  redirect('/dashboard')
}
