import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember } from '@/lib/supabase/queries'
import AgencySettingsForm from './AgencySettingsForm'

export const metadata: Metadata = {
  title: 'Paramètres — MOSTRA',
  description: 'Configurez les paramètres de votre agence.',
}

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberData = await getCurrentMember(supabase, user.id)
  if (!memberData) redirect('/login')

  const { member, agency } = memberData
  if (!agency) redirect('/dashboard')

  const canEdit = member.role === 'agency_admin' || member.role === 'super_admin'

  return (
    <AgencySettingsForm
      agency={{
        name: agency.name,
        slug: agency.slug,
        logo_url: agency.logo_url ?? null,
        primary_color: agency.primary_color ?? '#00D76B',
      }}
      canEdit={canEdit}
    />
  )
}
