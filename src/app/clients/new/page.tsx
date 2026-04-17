import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember } from '@/lib/supabase/queries'
import NewClientForm from './NewClientForm'

export default async function NewClientPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberData = await getCurrentMember(supabase, user.id)
  if (!memberData) redirect('/login')

  const { member } = memberData
  const isAdmin = member.role === 'super_admin' || member.role === 'agency_admin'
  if (!isAdmin) redirect('/clients')

  return <NewClientForm />
}
