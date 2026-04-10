import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember } from '@/lib/supabase/queries'
import StatusBadge from '@/components/shared/StatusBadge'
import type { Project, ProjectPhase, SubPhase } from '@/lib/types'

interface SubPhasePageProps {
  params: { id: string; phaseId: string; subPhaseId: string }
}

// Descriptions par slug de sous-phase
const SUB_PHASE_META: Record<string, { label: string; description: string; sprint: string }> = {
  formulaire: {
    label: 'Formulaire de brief',
    description:
      'Formulaire dynamique pour collecter les informations du client (objectifs, ton, références…).',
    sprint: 'Sprint 10',
  },
  script: {
    label: 'Éditeur de script',
    description: 'Éditeur de script par sections colorées avec commentaires par bloc.',
    sprint: 'Sprint 11',
  },
  style: {
    label: 'Moodboard / Style',
    description: 'Grille de références visuelles et de directions artistiques à valider.',
    sprint: 'Sprint 12',
  },
  storyboard: {
    label: 'Storyboard',
    description: 'Grille de plans séquentiels avec description et annotations.',
    sprint: 'Sprint 12',
  },
  design: {
    label: 'Maquettes finales',
    description: 'Galerie des fichiers de design final pour approbation.',
    sprint: 'Sprint 12',
  },
  vo: {
    label: 'Voix off',
    description: 'Lecteur audio pour les enregistrements de voix off avec sélection.',
    sprint: 'Sprint 13',
  },
  musique: {
    label: 'Musique',
    description: 'Bibliothèque de pistes musicales avec prévisualisation et sélection.',
    sprint: 'Sprint 13',
  },
}

export async function generateMetadata({ params }: SubPhasePageProps): Promise<Metadata> {
  const supabase = createClient()
  const { data: rawSubPhase } = await supabase
    .from('sub_phases')
    .select('name')
    .eq('id', params.subPhaseId)
    .maybeSingle()
  const name = (rawSubPhase as { name: string } | null)?.name ?? 'Sous-phase'
  return { title: `${name} — MOSTRA` }
}

export default async function SubPhasePage({ params }: SubPhasePageProps) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership) notFound()

  // Projet
  const { data: rawProject } = await supabase
    .from('projects')
    .select('id, name, agency_id')
    .eq('id', params.id)
    .maybeSingle()

  const project = rawProject as Pick<Project, 'id' | 'name' | 'agency_id'> | null
  if (!project) notFound()
  if (project.agency_id !== membership.agency?.id) notFound()

  // Phase
  const { data: rawPhase } = await supabase
    .from('project_phases')
    .select('id, name, slug, status, project_id')
    .eq('id', params.phaseId)
    .eq('project_id', params.id)
    .maybeSingle()

  const phase = rawPhase as Pick<
    ProjectPhase,
    'id' | 'name' | 'slug' | 'status' | 'project_id'
  > | null
  if (!phase) notFound()

  // Sous-phase
  const { data: rawSubPhase } = await supabase
    .from('sub_phases')
    .select('id, name, slug, status, phase_id, started_at, completed_at')
    .eq('id', params.subPhaseId)
    .eq('phase_id', params.phaseId)
    .maybeSingle()

  const subPhase = rawSubPhase as Pick<
    SubPhase,
    'id' | 'name' | 'slug' | 'status' | 'phase_id' | 'started_at' | 'completed_at'
  > | null
  if (!subPhase) notFound()

  const meta = SUB_PHASE_META[subPhase.slug]

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-6 py-8">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[#444444] flex-wrap">
          <Link href="/dashboard" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
          <Link href={`/projects/${project.id}`} className="hover:text-white transition-colors truncate max-w-[150px]">
            {project.name}
          </Link>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
          <span className="text-[#555555]">{phase.name}</span>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
          <span className="text-white font-medium">{subPhase.name}</span>
        </nav>

        {/* Bouton retour */}
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#666666] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au projet
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-[#444444] uppercase tracking-widest mb-1">{phase.name}</p>
            <h1 className="text-xl font-bold text-white">{subPhase.name}</h1>
            {meta && (
              <p className="text-xs text-[#555555] mt-1">{meta.label}</p>
            )}
          </div>
          <StatusBadge status={subPhase.status} className="flex-shrink-0" />
        </div>

        {/* Placeholder */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center mx-auto">
            <Clock className="h-6 w-6 text-[#333333]" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white mb-1">
              Contenu à venir
            </h2>
            <p className="text-xs text-[#555555] max-w-sm mx-auto">
              {meta?.description ?? `L'interface pour la sous-phase "${subPhase.name}" sera disponible dans un prochain sprint.`}
            </p>
          </div>

          {meta && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
              <span className="text-[10px] text-[#444444] uppercase tracking-widest">Développé en</span>
              <span className="text-xs text-[#00D76B] font-medium">{meta.sprint}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-[10px] text-[#333333] font-mono bg-[#0d0d0d] border border-[#1e1e1e] px-2 py-1 rounded">
              slug: {subPhase.slug}
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
