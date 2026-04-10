'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import type { SubPhase, ProjectPhase } from '@/lib/types'

export type SubPhaseActionResult = { success: true } | { success: false; error: string }

// ── Helper auth ───────────────────────────────────────────────────

async function getAuthContext() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership) return null

  return { supabase, user, membership }
}

// ── Résoudre la sous-phase + sa phase parente ─────────────────────

async function resolveSubPhase(supabase: ReturnType<typeof createClient>, subPhaseId: string) {
  const { data: rawSp } = await supabase
    .from('sub_phases')
    .select('id, phase_id, name, slug, status, sort_order')
    .eq('id', subPhaseId)
    .maybeSingle()

  const sp = rawSp as Pick<SubPhase, 'id' | 'phase_id' | 'name' | 'slug' | 'status' | 'sort_order'> | null
  if (!sp) return null

  const { data: rawPhase } = await supabase
    .from('project_phases')
    .select('id, project_id, name, slug, status')
    .eq('id', sp.phase_id)
    .maybeSingle()

  const phase = rawPhase as Pick<ProjectPhase, 'id' | 'project_id' | 'name' | 'slug' | 'status'> | null
  if (!phase) return null

  return { sp, phase }
}

// ── startSubPhase ─────────────────────────────────────────────────

export async function startSubPhase(subPhaseId: string): Promise<SubPhaseActionResult> {
  const ctx = await getAuthContext()
  if (!ctx) return { success: false, error: 'Non authentifié' }
  const { supabase, user, membership } = ctx

  const { role } = membership.member
  if (role !== 'super_admin' && role !== 'agency_admin' && role !== 'creative') {
    return { success: false, error: 'Permissions insuffisantes' }
  }

  const resolved = await resolveSubPhase(supabase, subPhaseId)
  if (!resolved) return { success: false, error: 'Sous-phase introuvable' }
  const { sp, phase } = resolved

  if (sp.status !== 'pending') {
    return { success: false, error: 'La sous-phase doit être en attente pour être démarrée' }
  }

  // Vérifie que la sous-phase précédente (si elle existe) est completed/approved
  const { data: rawSiblings } = await supabase
    .from('sub_phases')
    .select('id, sort_order, status')
    .eq('phase_id', sp.phase_id)
    .order('sort_order', { ascending: true })

  const siblings = (rawSiblings as Pick<SubPhase, 'id' | 'sort_order' | 'status'>[] | null) ?? []
  const idx = siblings.findIndex((s) => s.id === subPhaseId)

  if (idx > 0) {
    const prev = siblings[idx - 1]
    if (prev.status !== 'completed' && prev.status !== 'approved') {
      return {
        success: false,
        error: 'La sous-phase précédente doit être terminée avant de démarrer celle-ci',
      }
    }
  }

  // Démarre la sous-phase
  const { error: spErr } = await db(supabase)
    .from('sub_phases')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', subPhaseId)

  if (spErr) return { success: false, error: spErr.message }

  // Auto-démarre la phase parente si elle est encore pending
  if (phase.status === 'pending') {
    await db(supabase)
      .from('project_phases')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', phase.id)
  }

  await db(supabase).from('activity_logs').insert({
    project_id: phase.project_id,
    user_id: user.id,
    action: 'phase_started',
    details: { phase_name: `${phase.name} › ${sp.name}` },
  })

  revalidatePath(`/projects/${phase.project_id}`)
  revalidatePath(`/projects/${phase.project_id}/phases/${phase.id}/sub/${subPhaseId}`)
  return { success: true }
}

// ── sendSubPhaseToReview ──────────────────────────────────────────

export async function sendSubPhaseToReview(subPhaseId: string): Promise<SubPhaseActionResult> {
  const ctx = await getAuthContext()
  if (!ctx) return { success: false, error: 'Non authentifié' }
  const { supabase, user, membership } = ctx

  const { role } = membership.member
  if (role !== 'super_admin' && role !== 'agency_admin' && role !== 'creative') {
    return { success: false, error: 'Permissions insuffisantes' }
  }

  const resolved = await resolveSubPhase(supabase, subPhaseId)
  if (!resolved) return { success: false, error: 'Sous-phase introuvable' }
  const { sp, phase } = resolved

  if (sp.status !== 'in_progress') {
    return { success: false, error: 'La sous-phase doit être en cours pour être envoyée en review' }
  }

  const { error } = await db(supabase)
    .from('sub_phases')
    .update({ status: 'in_review' })
    .eq('id', subPhaseId)

  if (error) return { success: false, error: error.message }

  await db(supabase).from('activity_logs').insert({
    project_id: phase.project_id,
    user_id: user.id,
    action: 'phase_review',
    details: { phase_name: `${phase.name} › ${sp.name}` },
  })

  revalidatePath(`/projects/${phase.project_id}`)
  revalidatePath(`/projects/${phase.project_id}/phases/${phase.id}/sub/${subPhaseId}`)
  return { success: true }
}

// ── approveSubPhase ───────────────────────────────────────────────

export async function approveSubPhase(subPhaseId: string): Promise<SubPhaseActionResult> {
  const ctx = await getAuthContext()
  if (!ctx) return { success: false, error: 'Non authentifié' }
  const { supabase, user, membership } = ctx

  const { role } = membership.member
  if (role !== 'super_admin' && role !== 'agency_admin') {
    return { success: false, error: 'Seul un admin peut approuver une sous-phase' }
  }

  const resolved = await resolveSubPhase(supabase, subPhaseId)
  if (!resolved) return { success: false, error: 'Sous-phase introuvable' }
  const { sp, phase } = resolved

  if (sp.status !== 'in_review') {
    return { success: false, error: "La sous-phase doit être en review pour être approuvée" }
  }

  // Approuve la sous-phase
  const { error } = await db(supabase)
    .from('sub_phases')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', subPhaseId)

  if (error) return { success: false, error: error.message }

  // Vérifie si toutes les sous-phases de la phase parente sont terminées
  const { data: rawAllSps } = await supabase
    .from('sub_phases')
    .select('id, status')
    .eq('phase_id', phase.id)

  const allSps = (rawAllSps as Pick<SubPhase, 'id' | 'status'>[] | null) ?? []
  const updatedSps = allSps.map((s) =>
    s.id === subPhaseId ? { ...s, status: 'completed' as const } : s,
  )
  const allDone = updatedSps.every((s) => s.status === 'completed' || s.status === 'approved')

  if (allDone) {
    // Complete la phase parente
    await db(supabase)
      .from('project_phases')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', phase.id)

    // Recalcule la progression du projet
    const { data: rawAllPhases } = await supabase
      .from('project_phases')
      .select('id, status')
      .eq('project_id', phase.project_id)

    const allPhases = (rawAllPhases as Pick<ProjectPhase, 'id' | 'status'>[] | null) ?? []
    const updatedPhases = allPhases.map((p) =>
      p.id === phase.id ? { ...p, status: 'completed' as const } : p,
    )
    const doneCount = updatedPhases.filter(
      (p) => p.status === 'completed' || p.status === 'approved',
    ).length
    const progress =
      allPhases.length > 0 ? Math.round((doneCount / allPhases.length) * 100) : 0
    const projectAllDone = updatedPhases.every(
      (p) => p.status === 'completed' || p.status === 'approved',
    )

    const projectUpdate: Record<string, unknown> = { progress }
    if (projectAllDone) projectUpdate.status = 'completed'

    await db(supabase).from('projects').update(projectUpdate).eq('id', phase.project_id)
  }

  await db(supabase).from('activity_logs').insert({
    project_id: phase.project_id,
    user_id: user.id,
    action: 'phase_approved',
    details: { phase_name: `${phase.name} › ${sp.name}` },
  })

  revalidatePath(`/projects/${phase.project_id}`)
  revalidatePath(`/projects/${phase.project_id}/phases/${phase.id}/sub/${subPhaseId}`)
  return { success: true }
}
