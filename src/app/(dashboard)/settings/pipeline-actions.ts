'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import type { AgencyMember, SubPhaseDefinition } from '@/lib/types'

export type PipelineActionResult = { success: true } | { success: false; error: string }

export interface PipelinePhaseRow {
  id: string
  name: string
  slug: string
  icon: string
  sort_order: number
  sub_phases: SubPhaseDefinition[]
}

export type ResetResult =
  | { success: true; phases: PipelinePhaseRow[] }
  | { success: false; error: string }

export interface PipelinePhaseInput {
  id: string | null // null = nouvelle phase
  name: string
  slug: string
  icon: string
  sort_order: number
  sub_phases: SubPhaseDefinition[]
}

// ── Permission helper ────────────────────────────────────────────

async function requireAdmin(): Promise<
  { error: string } | { supabase: ReturnType<typeof createClient>; member: AgencyMember }
> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership) return { error: 'Membre introuvable' }

  const { role } = membership.member
  if (role !== 'super_admin' && role !== 'agency_admin') {
    return { error: 'Permissions insuffisantes' }
  }

  return { supabase, member: membership.member }
}

// ── updatePhaseTemplates ─────────────────────────────────────────

export async function updatePhaseTemplates(
  phases: PipelinePhaseInput[],
): Promise<PipelineActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const { supabase, member } = auth
  const agencyId = member.agency_id

  // ── Validation ────────────────────────────────────────────────

  if (phases.length === 0) {
    return { success: false, error: 'Le pipeline doit contenir au moins une phase.' }
  }

  const trimmed = phases.map((p) => ({
    ...p,
    name: p.name.trim(),
    slug: p.slug.trim(),
    sub_phases: (p.sub_phases ?? []).map((sp) => ({
      name: sp.name.trim(),
      slug: sp.slug.trim(),
      sort_order: sp.sort_order,
    })),
  }))

  for (const p of trimmed) {
    if (!p.name) return { success: false, error: 'Toutes les phases doivent avoir un nom.' }
    if (!p.slug) return { success: false, error: 'Toutes les phases doivent avoir un slug.' }
    if (!/^[a-z0-9-]+$/.test(p.slug)) {
      return {
        success: false,
        error: `Slug invalide : "${p.slug}". Uniquement lettres minuscules, chiffres et tirets.`,
      }
    }
  }

  const slugs = trimmed.map((p) => p.slug)
  if (new Set(slugs).size !== slugs.length) {
    return { success: false, error: 'Deux phases ne peuvent pas avoir le même slug.' }
  }

  // ── Récupérer les IDs existants en DB ─────────────────────────

  const { data: existingRows, error: fetchErr } = await db(supabase)
    .from('phase_templates')
    .select('id, slug, is_default')
    .eq('agency_id', agencyId)

  if (fetchErr) {
    console.error('[updatePhaseTemplates] fetch existing error:', fetchErr)
    return { success: false, error: fetchErr.message }
  }

  const existingIds = new Set<string>((existingRows ?? []).map((r: { id: string }) => r.id))

  const incomingIds = new Set<string>(
    trimmed.filter((p) => p.id !== null && existingIds.has(p.id!)).map((p) => p.id!),
  )

  // ── 1. Soft-remove les phases retirées ───────────────────────

  const toDeactivate = [...existingIds].filter((id) => !incomingIds.has(id))

  for (const id of toDeactivate) {
    const { error } = await db(supabase)
      .from('phase_templates')
      .update({ is_default: false })
      .eq('id', id)
      .eq('agency_id', agencyId)

    if (error) {
      return { success: false, error: `Erreur lors de la désactivation : ${error.message}` }
    }
  }

  // ── 2. UPDATE les phases existantes ──────────────────────────

  const toUpdate = trimmed.filter((p) => p.id !== null && existingIds.has(p.id!))

  for (const phase of toUpdate) {
    const { error } = await db(supabase)
      .from('phase_templates')
      .update({
        name: phase.name,
        slug: phase.slug,
        icon: phase.icon,
        sort_order: phase.sort_order,
        is_default: true,
        sub_phases: phase.sub_phases,
      })
      .eq('id', phase.id)
      .eq('agency_id', agencyId)

    if (error) {
      return {
        success: false,
        error: `Erreur lors de la mise à jour de "${phase.name}" : ${error.message}`,
      }
    }
  }

  // ── 3. INSERT les nouvelles phases ────────────────────────────

  const toInsert = trimmed.filter((p) => p.id === null || !existingIds.has(p.id!))

  for (const phase of toInsert) {
    const { error } = await db(supabase)
      .from('phase_templates')
      .insert({
        agency_id: agencyId,
        name: phase.name,
        slug: phase.slug,
        icon: phase.icon,
        sort_order: phase.sort_order,
        is_default: true,
        sub_phases: phase.sub_phases,
      })

    if (error) {
      return {
        success: false,
        error: `Erreur lors de l'ajout de "${phase.name}" : ${error.message}`,
      }
    }
  }

  revalidatePath('/settings/pipeline')
  return { success: true }
}

// ── resetToDefaults ──────────────────────────────────────────────

const DEFAULT_PHASES: Array<{
  name: string
  slug: string
  icon: string
  sort_order: number
  sub_phases: SubPhaseDefinition[]
}> = [
  {
    name: 'Analyse',
    slug: 'analyse',
    icon: 'Brain',
    sort_order: 1,
    sub_phases: [
      { name: 'Formulaire', slug: 'formulaire', sort_order: 1 },
      { name: 'Script', slug: 'script', sort_order: 2 },
    ],
  },
  {
    name: 'Design',
    slug: 'design',
    icon: 'Palette',
    sort_order: 2,
    sub_phases: [
      { name: 'Style', slug: 'style', sort_order: 1 },
      { name: 'Storyboard', slug: 'storyboard', sort_order: 2 },
      { name: 'Design', slug: 'design', sort_order: 3 },
    ],
  },
  {
    name: 'Audio',
    slug: 'audio',
    icon: 'Music',
    sort_order: 3,
    sub_phases: [
      { name: 'Voix off', slug: 'vo', sort_order: 1 },
      { name: 'Musique', slug: 'musique', sort_order: 2 },
    ],
  },
  {
    name: 'Animation',
    slug: 'animation',
    icon: 'Film',
    sort_order: 4,
    sub_phases: [],
  },
  {
    name: 'Rendu',
    slug: 'rendu',
    icon: 'MonitorPlay',
    sort_order: 5,
    sub_phases: [],
  },
]

export async function resetToDefaults(): Promise<ResetResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const { supabase, member } = auth
  const agencyId = member.agency_id

  // Soft-remove toutes les phases existantes
  const { error: clearErr } = await db(supabase)
    .from('phase_templates')
    .update({ is_default: false })
    .eq('agency_id', agencyId)

  if (clearErr) {
    return { success: false, error: clearErr.message }
  }

  // Upsert les 5 phases par défaut
  for (const phase of DEFAULT_PHASES) {
    const { data: existing } = await db(supabase)
      .from('phase_templates')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('slug', phase.slug)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await db(supabase)
        .from('phase_templates')
        .update({ ...phase, is_default: true })
        .eq('id', existing.id)
        .eq('agency_id', agencyId)
      if (error) return { success: false, error: error.message }
    } else {
      const { error } = await db(supabase)
        .from('phase_templates')
        .insert({ ...phase, agency_id: agencyId, is_default: true })
      if (error) return { success: false, error: error.message }
    }
  }

  // Relire les phases actives
  const { data: freshRows, error: fetchErr } = await db(supabase)
    .from('phase_templates')
    .select('id, name, slug, icon, sort_order, sub_phases')
    .eq('agency_id', agencyId)
    .eq('is_default', true)
    .order('sort_order', { ascending: true })

  if (fetchErr) {
    revalidatePath('/settings/pipeline')
    return { success: true, phases: [] }
  }

  revalidatePath('/settings/pipeline')
  return { success: true, phases: (freshRows ?? []) as PipelinePhaseRow[] }
}
