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

  // Si pas de membre actif → sign out pour éviter la boucle middleware ↔ dashboard
  if (!memberData?.member) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  const { member, agency } = memberData
  const agencyId = member.agency_id

  const [projects, stats] = await Promise.all([
    getProjects(supabase, agencyId),
    getProjectStats(supabase, agencyId),
  ])

  return <DashboardClient projects={projects} stats={stats} />
}
