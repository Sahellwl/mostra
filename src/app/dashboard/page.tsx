import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember, getProjects, getProjectStats } from '@/lib/supabase/queries'
import DashboardClient from './DashboardClient'

export const metadata: Metadata = {
  title: 'Dashboard — MOSTRA',
  description: "Vue d'ensemble de vos projets de production vidéo.",
}

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const memberData = await getCurrentMember(supabase, user.id)

  // Si pas de membre actif → onboarding (saisie d'un code d'invitation)
  if (!memberData?.member) {
    redirect('/onboarding')
  }

  const { member, agency } = memberData
  const agencyId = member.agency_id

  const [projects, stats] = await Promise.all([
    getProjects(supabase, agencyId),
    getProjectStats(supabase, agencyId),
  ])

  return <DashboardClient projects={projects} stats={stats} />
}
