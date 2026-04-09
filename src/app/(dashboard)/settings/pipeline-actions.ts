'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import type { AgencyMember } from '@/lib/types'

export type PipelineActionResult = { success: true } | { success: false; error: string }

export interface PipelinePhaseRow {
  id: string
  name: string
  slug: string
  icon: string
  sort_order: number
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
//
// Stratégie fiable sans upsert ambigu :
//   • UPDATE explicite pour les phases existantes (by id)
//   • INSERT pour les nouvelles phases (pas d'id)
//   • UPDATE is_default=false pour les phases retirées (soft-remove)
//
// Cela évite les problèmes de ON CONFLICT DO UPDATE SET id=EXCLUDED.id
// qui peut être silencieusement ignoré par certaines versions de PostgREST.
//
// ────────────────────────────────────────────────────────────────

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

  // IDs présents dans la liste sauvegardée
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
      console.error('[updatePhaseTemplates] deactivate error for id', id, ':', error)
      return { success: false, error: `Erreur lors de la désactivation : ${error.message}` }
    }
  }

  // ── 2. UPDATE les phases existantes ──────────────────────────

  const toUpdate = trimmed.filter((p) => p.id !== null && existingIds.has(p.id!))

  for (const phase of toUpdate) {
    const { data: updated, error } = await db(supabase)
      .from('phase_templates')
      .update({
        name: phase.name,
        slug: phase.slug,
        icon: phase.icon,
        sort_order: phase.sort_order,
        is_default: true,
      })
      .eq('id', phase.id)
      .eq('agency_id', agencyId)
      .select('id, name, sort_order')

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
    const { data: inserted, error } = await db(supabase)
      .from('phase_templates')
      .insert({
        agency_id: agencyId,
        name: phase.name,
        slug: phase.slug,
        icon: phase.icon,
        sort_order: phase.sort_order,
        is_default: true,
      })
      .select('id, name')

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

const DEFAULT_PHASES = [
  { name: 'Script', slug: 'script', icon: 'FileText', sort_order: 1 },
  { name: 'Design', slug: 'design', icon: 'Palette', sort_order: 2 },
  { name: 'Animation', slug: 'animation', icon: 'Film', sort_order: 3 },
  { name: 'Render', slug: 'render', icon: 'MonitorPlay', sort_order: 4 },
] as const

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
    console.error('[resetToDefaults] clear error:', clearErr)
    return { success: false, error: clearErr.message }
  }

  // Upsert les 4 defaults :
  // On utilise ici l'upsert simple sur (agency_id, slug) SANS fournir d'id,
  // ce qui est safe : PostgreSQL insère ou réactive la ligne existante.
  for (const phase of DEFAULT_PHASES) {
    const { data: existing } = await db(supabase)
      .from('phase_templates')
      .select('id')
      .eq('agency_id', agencyId)
      .eq('slug', phase.slug)
      .maybeSingle()

    if (existing?.id) {
      // Réactiver la ligne existante
      const { error } = await db(supabase)
        .from('phase_templates')
        .update({ ...phase, is_default: true })
        .eq('id', existing.id)
        .eq('agency_id', agencyId)
      if (error) return { success: false, error: error.message }
    } else {
      // Insérer une nouvelle ligne
      const { error } = await db(supabase)
        .from('phase_templates')
        .insert({ ...phase, agency_id: agencyId, is_default: true })
      if (error) return { success: false, error: error.message }
    }
  }

  // Relire les phases actives pour les retourner au client (mise à jour du state local)
  const { data: freshRows, error: fetchErr } = await db(supabase)
    .from('phase_templates')
    .select('id, name, slug, icon, sort_order')
    .eq('agency_id', agencyId)
    .eq('is_default', true)
    .order('sort_order', { ascending: true })

  if (fetchErr) {
    console.error('[resetToDefaults] fetch final error:', fetchErr)
    // Le reset a quand même réussi — on retourne sans les phases
    revalidatePath('/settings/pipeline')
    return { success: true, phases: [] }
  }

  revalidatePath('/settings/pipeline')
  return { success: true, phases: (freshRows ?? []) as PipelinePhaseRow[] }
}
