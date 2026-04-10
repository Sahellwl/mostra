import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import FormSubPhaseClient from '@/components/client/FormSubPhaseClient'
import ScriptViewerClient from '@/components/client/ScriptViewerClient'
import type { Project, ProjectPhase, SubPhase, FormQuestionContent, ScriptSectionContent, Profile } from '@/lib/types'
import type { BlockComment } from '@/lib/hooks/useRealtimeBlockComments'

interface ClientSubPhasePageProps {
  params: { token: string; phaseId: string; subPhaseId: string }
}

const FORM_SLUGS = ['formulaire', 'form']
const SCRIPT_SLUGS = ['script']

export default async function ClientSubPhasePage({ params }: ClientSubPhasePageProps) {
  const admin = createAdminClient()

  // 1. Resolve token → project
  const { data: rawProject } = await admin
    .from('projects')
    .select('id, name, share_token, client_id')
    .eq('share_token', params.token)
    .maybeSingle()

  const project = rawProject as Pick<Project, 'id' | 'name' | 'client_id'> | null
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

  const isForm = FORM_SLUGS.includes(subPhase.slug)
  const isScript = SCRIPT_SLUGS.includes(subPhase.slug)

  // Only form and script sub-phases are accessible via this route
  if (!isForm && !isScript) {
    redirect(`/client/${params.token}`)
  }

  // Script: only accessible when in_review, completed or approved
  if (isScript && (subPhase.status === 'pending' || subPhase.status === 'in_progress')) {
    redirect(`/client/${params.token}`)
  }

  // Form: not yet sent to client
  if (isForm && subPhase.status === 'pending') {
    redirect(`/client/${params.token}`)
  }

  // ── Form path ──────────────────────────────────────────────────

  if (isForm) {
    const { data: rawBlocks } = await admin
      .from('phase_blocks')
      .select('id, content, sort_order')
      .eq('sub_phase_id', params.subPhaseId)
      .eq('type', 'form_question')
      .order('sort_order', { ascending: true })

    const blocks =
      (rawBlocks as { id: string; content: FormQuestionContent; sort_order: number }[] | null) ?? []

    const clientStatus = subPhase.status as 'in_progress' | 'in_review' | 'completed' | 'approved'

    return (
      <PageShell token={params.token} projectName={project.name} phaseName={phase.name} subPhaseName={subPhase.name}>
        <FormSubPhaseClient
          token={params.token}
          subPhaseId={subPhase.id}
          status={clientStatus}
          blocks={blocks}
        />
      </PageShell>
    )
  }

  // ── Script path ────────────────────────────────────────────────

  const { data: rawBlocks } = await admin
    .from('phase_blocks')
    .select('id, content, sort_order')
    .eq('sub_phase_id', params.subPhaseId)
    .eq('type', 'script_section')
    .order('sort_order', { ascending: true })

  const scriptBlocks =
    (rawBlocks as { id: string; content: ScriptSectionContent; sort_order: number }[] | null) ?? []

  // Fetch comments for this sub_phase
  const { data: rawComments } = await admin
    .from('comments')
    .select('*')
    .eq('sub_phase_id', params.subPhaseId)
    .order('created_at', { ascending: true })

  const rawCommentList = (rawComments as (typeof rawComments extends (infer T)[] | null ? T : never)[] | null) ?? []

  // Fetch author profiles
  const authorIds = [...new Set((rawCommentList as { user_id: string }[]).map((c) => c.user_id))]
  const authorMap = new Map<string, Pick<Profile, 'id' | 'full_name' | 'avatar_url'>>()
  if (authorIds.length > 0) {
    const { data: rawAuthors } = await admin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', authorIds)
    ;(rawAuthors as Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[] | null)?.forEach((p) =>
      authorMap.set(p.id, p),
    )
  }

  const initialComments: BlockComment[] = (rawCommentList as {
    id: string
    block_id: string | null
    sub_phase_id: string | null
    phase_id: string | null
    user_id: string
    content: string
    is_resolved: boolean
    created_at: string
    updated_at: string
  }[]).map((c) => ({
    ...c,
    author: authorMap.get(c.user_id) ?? null,
  }))

  const scriptStatus = subPhase.status as 'in_review' | 'completed' | 'approved'

  return (
    <PageShell
      token={params.token}
      projectName={project.name}
      phaseName={phase.name}
      subPhaseName={subPhase.name}
      subtitle="Relisez le script et partagez vos retours section par section."
      wide
    >
      <ScriptViewerClient
        token={params.token}
        projectId={project.id}
        subPhaseId={subPhase.id}
        status={scriptStatus}
        blocks={scriptBlocks}
        initialComments={initialComments}
        clientId={project.client_id ?? null}
      />
    </PageShell>
  )
}

// ── PageShell ─────────────────────────────────────────────────────

function PageShell({
  token,
  projectName,
  phaseName,
  subPhaseName,
  subtitle,
  wide = false,
  children,
}: {
  token: string
  projectName: string
  phaseName: string
  subPhaseName: string
  subtitle?: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8">
      <div className={`${wide ? 'max-w-3xl' : 'max-w-2xl'} mx-auto space-y-6`}>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[#444444] flex-wrap">
          <Link href={`/client/${token}`} className="hover:text-white transition-colors">
            {projectName}
          </Link>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
          <span className="text-[#555555]">{phaseName}</span>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
          <span className="text-white font-medium">{subPhaseName}</span>
        </nav>

        {/* Back */}
        <Link
          href={`/client/${token}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#666666] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au projet
        </Link>

        {/* Header */}
        <div>
          <p className="text-xs text-[#444444] uppercase tracking-widest mb-1">{phaseName}</p>
          <h1 className="text-xl font-bold text-white">{subPhaseName}</h1>
          {subtitle && <p className="text-xs text-[#555555] mt-1">{subtitle}</p>}
        </div>

        {children}
      </div>
    </div>
  )
}
