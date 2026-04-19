import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatRelative } from '@/lib/utils/dates'
import StatusBadge from '@/components/shared/StatusBadge'
import ProgressBar from '@/components/shared/ProgressBar'
import { FolderOpen } from 'lucide-react'
import type { Project, ProjectPhase } from '@/lib/types'

type ProjectRow = Project & { project_phases: ProjectPhase[] }

export default async function ClientDashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Projets dont cet utilisateur est le client
  const { data: rawProjects } = await admin
    .from('projects')
    .select('*, project_phases(*)')
    .eq('client_id', user.id)
    .order('updated_at', { ascending: false })

  const projects = (rawProjects as unknown as ProjectRow[] | null) ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Mes projets</h1>
        <p className="text-sm text-[#666666] mt-0.5">
          Suivez l&apos;avancement de vos productions
        </p>
      </div>

      {/* Grid de projets */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => {
            const phases = [...project.project_phases].sort(
              (a, b) => a.sort_order - b.sort_order,
            )
            const currentPhase =
              phases.find(
                (ph) => ph.status !== 'completed' && ph.status !== 'approved',
              ) ??
              phases[phases.length - 1] ??
              null

            const href = project.share_token
              ? `/client/${project.share_token}`
              : '#'

            return (
              <Link
                key={project.id}
                href={href}
                className="
                  block bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5
                  hover:bg-[#222222] hover:border-[#3a3a3a]
                  transition-colors group
                "
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-white truncate group-hover:text-white">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-xs text-[#666666] mt-0.5 truncate">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={project.status} className="flex-shrink-0" />
                </div>

                {/* Phase courante */}
                {currentPhase && (
                  <p className="text-xs text-[#a0a0a0] mb-3">
                    <span className="text-[#666666]">Phase actuelle : </span>
                    {currentPhase.name}
                  </p>
                )}

                {/* Progress */}
                <div className="mb-3">
                  <ProgressBar value={project.progress} showLabel size="sm" />
                </div>

                {/* Footer */}
                <p className="text-[11px] text-[#444444]">
                  Mis à jour {formatRelative(project.updated_at)}
                </p>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mb-4">
            <FolderOpen className="h-5 w-5 text-[#444444]" />
          </div>
          <p className="text-sm text-[#666666]">Aucun projet pour le moment</p>
          <p className="text-xs text-[#444444] mt-1">
            Vos projets apparaîtront ici dès qu&apos;ils seront créés par votre agence
          </p>
        </div>
      )}
    </div>
  )
}
