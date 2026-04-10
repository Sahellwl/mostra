import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import FormSubPhaseClient from '@/components/client/FormSubPhaseClient'
import type { Project, ProjectPhase, SubPhase, FormQuestionContent } from '@/lib/types'

interface ClientSubPhasePageProps {
  params: { token: string; phaseId: string; subPhaseId: string }
}

const FORM_SLUGS = ['formulaire', 'form']

export default async function ClientSubPhasePage({ params }: ClientSubPhasePageProps) {
  const admin = createAdminClient()

  // 1. Resolve token → project
  const { data: rawProject } = await admin
    .from('projects')
    .select('id, name, share_token')
    .eq('share_token', params.token)
    .maybeSingle()

  const project = rawProject as Pick<Project, 'id' | 'name'> | null
  if (!project) notFound()

  // 2. Phase (must belong to project)
  const { data: rawPhase } = await admin
    .from('project_phases')
    .select('id, name, slug, status, project_id')
    .eq('id', params.phaseId)
    .eq('project_id', project.id)
    .maybeSingle()

  const phase = rawPhase as Pick<ProjectPhase, 'id' | 'name' | 'slug' | 'status' | 'project_id'> | null
  if (!phase) notFound()

  // 3. Sub-phase (must belong to phase)
  const { data: rawSubPhase } = await admin
    .from('sub_phases')
    .select('id, name, slug, status, phase_id')
    .eq('id', params.subPhaseId)
    .eq('phase_id', params.phaseId)
    .maybeSingle()

  const subPhase = rawSubPhase as Pick<SubPhase, 'id' | 'name' | 'slug' | 'status' | 'phase_id'> | null
  if (!subPhase) notFound()

  // Only form sub-phases are accessible via this route
  if (!FORM_SLUGS.includes(subPhase.slug)) {
    redirect(`/client/${params.token}`)
  }

  // Not yet sent to client
  if (subPhase.status === 'pending') {
    redirect(`/client/${params.token}`)
  }

  // 4. Fetch form blocks
  const { data: rawBlocks } = await admin
    .from('phase_blocks')
    .select('id, content, sort_order')
    .eq('sub_phase_id', params.subPhaseId)
    .eq('type', 'form_question')
    .order('sort_order', { ascending: true })

  const blocks = (rawBlocks as { id: string; content: FormQuestionContent; sort_order: number }[] | null) ?? []

  const clientStatus = subPhase.status as 'in_progress' | 'in_review' | 'completed' | 'approved'

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[#444444] flex-wrap">
          <Link href={`/client/${params.token}`} className="hover:text-white transition-colors">
            {project.name}
          </Link>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
          <span className="text-[#555555]">{phase.name}</span>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
          <span className="text-white font-medium">{subPhase.name}</span>
        </nav>

        {/* Back */}
        <Link
          href={`/client/${params.token}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#666666] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au projet
        </Link>

        {/* Header */}
        <div>
          <p className="text-xs text-[#444444] uppercase tracking-widest mb-1">{phase.name}</p>
          <h1 className="text-xl font-bold text-white">{subPhase.name}</h1>
          <p className="text-xs text-[#555555] mt-1">
            Remplissez ce formulaire pour que notre équipe puisse démarrer votre projet.
          </p>
        </div>

        {/* Form */}
        <FormSubPhaseClient
          token={params.token}
          subPhaseId={subPhase.id}
          status={clientStatus}
          blocks={blocks}
        />

      </div>
    </div>
  )
}
