import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember, getAgencyMembersWithProfiles } from '@/lib/supabase/queries'
import NewProjectForm from './NewProjectForm'

export default async function NewProjectPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const memberData = await getCurrentMember(supabase, user.id)
  if (!memberData?.member) redirect('/login')

  const { member } = memberData

  // Seuls les admins accèdent à cette page
  if (member.role !== 'super_admin' && member.role !== 'agency_admin') {
    redirect('/dashboard')
  }

  const agencyId = member.agency_id

  const [clients, creatives] = await Promise.all([
    getAgencyMembersWithProfiles(supabase, agencyId, ['client']),
    getAgencyMembersWithProfiles(supabase, agencyId, ['agency_admin', 'creative']),
  ])

  return <NewProjectForm clients={clients} creatives={creatives} />
}
