import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import ClientProjectView from '@/components/client/ClientProjectView'
import ContactManager from '@/components/client/ContactManager'
import type { Profile, Project, ProjectPhase } from '@/lib/types'

interface ClientProjectPageProps {
  params: { token: string }
}

export default async function ClientProjectPage({ params }: ClientProjectPageProps) {
  // Admin client pour bypass RLS — share_token est un accès public légitme
  const admin = createAdminClient()

  // 1. Projet par share_token
  const { data: rawProject } = await admin
    .from('projects')
    .select('*')
    .eq('share_token', params.token)
    .maybeSingle()

  const project = rawProject as Project | null
  if (!project) notFound()

  // 2. Phases (ordonnées)
  const { data: rawPhases } = await admin
    .from('project_phases')
    .select('*')
    .eq('project_id', project.id)
    .order('sort_order', { ascending: true })

  const phases = (rawPhases as ProjectPhase[] | null) ?? []

  // 3. Project Manager
  let projectManager: Profile | null = null
  if (project.project_manager_id) {
    const { data: rawPm } = await admin
      .from('profiles')
      .select('*')
      .eq('id', project.project_manager_id)
      .maybeSingle()
    projectManager = rawPm as Profile | null
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      {/* Gauche — vue projet */}
      <ClientProjectView project={project} phases={phases} token={params.token} />

      {/* Droite — contact PM */}
      <div className="space-y-4">
        <ContactManager projectManager={projectManager} />
      </div>
    </div>
  )
}
