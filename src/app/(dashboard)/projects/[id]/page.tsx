import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember, getProjectDetail } from '@/lib/supabase/queries'
import StatusBadge from '@/components/shared/StatusBadge'
import PhaseCard from '@/components/project/PhaseCard'
import ProjectInfo from '@/components/project/ProjectInfo'
import ActivityLog from '@/components/project/ActivityLog'
import CommentSection from '@/components/project/CommentSection'
import DangerZone from '@/components/project/DangerZone'

interface ProjectPageProps {
  params: { id: string }
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const supabase = createClient()
  const data = await getProjectDetail(supabase, params.id)
  if (!data) return { title: 'Projet — MOSTRA' }
  return {
    title: `${data.project.name} — MOSTRA`,
    description: data.project.description ?? `Suivi du projet ${data.project.name}.`,
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership) notFound()

  const data = await getProjectDetail(supabase, params.id)
  if (!data) notFound()

  // Sécurité : le projet doit appartenir à l'agence de l'utilisateur
  if (data.project.agency_id !== membership.agency?.id) notFound()

  const { project, client, projectManager, phases, filesByPhase, comments, activity } = data
  const userRole = membership.member.role

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back + Header */}
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-[#666666] hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-white truncate">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-[#666666] mt-1 line-clamp-2">{project.description}</p>
              )}
            </div>
            <StatusBadge status={project.status} className="flex-shrink-0 mt-0.5" />
          </div>

          {/* Barre de progression globale */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-[#444444] uppercase tracking-widest">
                Progression globale
              </span>
              <span className="text-xs font-medium text-white tabular-nums">
                {project.progress}%
              </span>
            </div>
            <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#EF4444] rounded-full transition-all duration-500"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Layout 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* Gauche — pipeline + commentaires */}
          <div className="space-y-6">
            {/* Pipeline */}
            <section>
              <h2 className="text-sm font-semibold text-white mb-3">Pipeline</h2>
              {phases.length === 0 ? (
                <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
                  <p className="text-xs text-[#444444] italic">Aucune phase configurée.</p>
                </div>
              ) : (
                <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
                  {phases.map((phase, i) => {
                    const prev = phases[i - 1]
                    const canStart =
                      i === 0 || prev?.status === 'completed' || prev?.status === 'approved'

                    return (
                      <PhaseCard
                        key={phase.id}
                        phase={phase}
                        projectId={project.id}
                        isLast={i === phases.length - 1}
                        canStart={canStart}
                        files={filesByPhase[phase.id] ?? []}
                        userRole={userRole}
                      />
                    )
                  })}
                </div>
              )}
            </section>

            {/* Commentaires */}
            <CommentSection
              comments={comments}
              projectId={project.id}
              phases={phases.map((p) => ({ id: p.id, name: p.name }))}
              userId={user.id}
              userRole={userRole}
            />
          </div>

          {/* Droite — infos + activité */}
          <div className="space-y-4">
            <ProjectInfo project={project} client={client} projectManager={projectManager} />
            <ActivityLog activity={activity} projectId={project.id} />
            {(userRole === 'super_admin' || userRole === 'agency_admin') && (
              <DangerZone
                projectId={project.id}
                projectName={project.name}
                isArchived={project.status === 'archived'}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
