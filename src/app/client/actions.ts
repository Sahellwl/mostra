'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import { createNotifications, getProjectRecipients } from '@/lib/notifications'
import { sendEmail } from '@/lib/email/send'
import type { PhaseFile, Project, ProjectPhase } from '@/lib/types'

// Admin client uniquement — ces actions sont publiques (pas de session user)
// La sécurité repose sur la vérification du share_token.

export type ClientActionResult = { success: true } | { success: false; error: string }

// ── Helper : résoudre token → projet ─────────────────────────────

async function resolveToken(token: string): Promise<Project | null> {
  const admin = createAdminClient()
  const { data } = await db(admin)
    .from('projects')
    .select('*')
    .eq('share_token', token)
    .maybeSingle()
  return data as Project | null
}

// ── Helper : recalculer progression projet ────────────────────────

async function recalcProgress(
  admin: ReturnType<typeof createAdminClient>,
  projectId: string,
): Promise<void> {
  const { data: rawPhases } = await db(admin)
    .from('project_phases')
    .select('id, status')
    .eq('project_id', projectId)

  const phases = (rawPhases as Pick<ProjectPhase, 'id' | 'status'>[] | null) ?? []
  if (phases.length === 0) return

  const doneCount = phases.filter((p) => p.status === 'completed' || p.status === 'approved').length

  const progress = Math.round((doneCount / phases.length) * 100)
  const allDone = phases.every((p) => p.status === 'completed' || p.status === 'approved')

  const projectUpdate: Record<string, unknown> = { progress }
  if (allDone) projectUpdate.status = 'completed'

  await db(admin).from('projects').update(projectUpdate).eq('id', projectId)
}

// ── approveAsClient ───────────────────────────────────────────────
// Le client approuve une phase "in_review" → statut "approved"

export async function approveAsClient(token: string, phaseId: string): Promise<ClientActionResult> {
  const project = await resolveToken(token)
  if (!project) return { success: false, error: 'Lien invalide' }

  const admin = createAdminClient()

  const { data: rawPhase } = await db(admin)
    .from('project_phases')
    .select('*')
    .eq('id', phaseId)
    .maybeSingle()

  const phase = rawPhase as ProjectPhase | null
  if (!phase) return { success: false, error: 'Phase introuvable' }
  if (phase.project_id !== project.id) return { success: false, error: 'Accès refusé' }
  if (phase.status !== 'in_review')
    return { success: false, error: "Cette phase n'est pas en attente de validation" }

  const now = new Date().toISOString()

  const { error } = await db(admin)
    .from('project_phases')
    .update({ status: 'approved', completed_at: now })
    .eq('id', phaseId)

  if (error) return { success: false, error: error.message }

  await recalcProgress(admin, project.id)

  await db(admin)
    .from('activity_logs')
    .insert({
      project_id: project.id,
      user_id: project.client_id ?? null,
      action: 'phase_approved',
      details: { phase_name: phase.name, via: 'client_token' },
    })

  revalidatePath(`/client/${token}`)
  revalidatePath(`/client/${token}/phases/${phaseId}`)
  revalidatePath(`/projects/${project.id}`)
  revalidatePath(`/dashboard`)
  return { success: true }
}

// ── requestRevisionAsClient ───────────────────────────────────────
// Le client demande des modifications → retour en "in_progress" + commentaire

export async function requestRevisionAsClient(
  token: string,
  phaseId: string,
  message: string,
): Promise<ClientActionResult> {
  const project = await resolveToken(token)
  if (!project) return { success: false, error: 'Lien invalide' }

  const admin = createAdminClient()

  const { data: rawPhase } = await db(admin)
    .from('project_phases')
    .select('*')
    .eq('id', phaseId)
    .maybeSingle()

  const phase = rawPhase as ProjectPhase | null
  if (!phase) return { success: false, error: 'Phase introuvable' }
  if (phase.project_id !== project.id) return { success: false, error: 'Accès refusé' }
  if (phase.status !== 'in_review')
    return { success: false, error: "Cette phase n'est pas en attente de validation" }

  // Phase repart en production
  const { error: phaseError } = await db(admin)
    .from('project_phases')
    .update({ status: 'in_progress' })
    .eq('id', phaseId)

  if (phaseError) return { success: false, error: phaseError.message }

  // Commentaire avec le message du client
  // user_id est requis (NOT NULL) — on ne peut créer le commentaire que si
  // le projet a un client assigné. Si client_id est null, on log sans commenter.
  const trimmed = message.trim()
  if (trimmed) {
    if (project.client_id) {
      const { error: commentError } = await db(admin).from('comments').insert({
        project_id: project.id,
        phase_id: phaseId,
        user_id: project.client_id,
        content: trimmed,
        is_resolved: false,
      })
      if (commentError) {
        console.error('[requestRevisionAsClient] comment insert failed:', commentError.message)
      }
    } else {
      console.warn(
        '[requestRevisionAsClient] project.client_id is null — comment skipped, revision message lost',
      )
    }
  }

  await db(admin)
    .from('activity_logs')
    .insert({
      project_id: project.id,
      user_id: project.client_id ?? null,
      action: 'phase_review',
      details: {
        phase_name: phase.name,
        revision_requested: true,
        message: trimmed,
        via: 'client_token',
      },
    })

  // ── Notify admins / PM (fire-and-forget) ─────────────────────────
  void (async () => {
    const r = await getProjectRecipients(project.id)
    if (!r.projectName) return

    const recipientIds = [
      ...new Set([...r.adminIds, ...(r.projectManagerId ? [r.projectManagerId] : [])]),
    ]
    if (recipientIds.length === 0) return

    const link = `/projects/${project.id}/phases/${phaseId}`
    const notifTitle = `🔄 Révision demandée — ${phase.name}`
    const notifMsg = trimmed || 'Le client a demandé des modifications.'

    await createNotifications(
      recipientIds.map((uid) => ({
        userId: uid,
        agencyId: r.agencyId,
        projectId: project.id,
        type: 'revision_requested' as const,
        title: notifTitle,
        message: notifMsg,
        link,
      })),
    )

    if (r.projectManagerId) {
      const { data: pmRaw } = await admin
        .from('profiles')
        .select('email')
        .eq('id', r.projectManagerId)
        .maybeSingle()
      const pmEmail = (pmRaw as { email: string } | null)?.email
      if (pmEmail) {
        void sendEmail({
          to: pmEmail,
          template: 'revision_requested',
          data: {
            projectName: r.projectName,
            agencyName: r.agencyName,
            phaseName: phase.name,
            clientName: 'Le client',
          },
          link,
        })
      }
    }
  })()

  revalidatePath(`/client/${token}`)
  revalidatePath(`/client/${token}/phases/${phaseId}`)
  revalidatePath(`/projects/${project.id}`)
  revalidatePath(`/dashboard`)
  return { success: true }
}

// ── getClientSignedUrl ────────────────────────────────────────────
// Génère une URL signée sans session — vérifie le token d'abord

export async function getClientSignedUrl(
  token: string,
  filePath: string,
): Promise<{ url: string } | { error: string }> {
  const project = await resolveToken(token)
  if (!project) return { error: 'Lien invalide' }

  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('project-files').createSignedUrl(filePath, 3600)

  if (error || !data?.signedUrl) return { error: error?.message ?? 'Erreur inconnue' }
  return { url: data.signedUrl }
}

// ── getClientPhaseViewData ────────────────────────────────────────
// Version publique de getPhaseViewData — s'authentifie via token

export interface ClientPhaseViewData {
  projectId: string
  projectName: string
  phaseName: string
  phaseStatus: ProjectPhase['status']
  completedAt: string | null
  files: PhaseFile[]
  signedUrl: string | null
  activeVersion: number | null
  uploaders: Record<string, string>
  token: string
}

export async function getClientPhaseViewData(
  token: string,
  phaseId: string,
  requestedVersion?: number,
): Promise<ClientPhaseViewData | { error: string }> {
  const project = await resolveToken(token)
  if (!project) return { error: 'Lien invalide' }

  const admin = createAdminClient()

  const { data: rawPhase } = await db(admin)
    .from('project_phases')
    .select('*')
    .eq('id', phaseId)
    .maybeSingle()

  const phase = rawPhase as ProjectPhase | null
  if (!phase) return { error: 'Phase introuvable' }
  if (phase.project_id !== project.id) return { error: 'Accès refusé' }

  const { data: rawFiles } = await db(admin)
    .from('phase_files')
    .select('*')
    .eq('phase_id', phaseId)
    .order('version', { ascending: false })

  const files = (rawFiles as PhaseFile[] | null) ?? []

  if (files.length === 0) {
    return {
      projectId: project.id,
      projectName: project.name,
      phaseName: phase.name,
      phaseStatus: phase.status,
      completedAt: phase.completed_at,
      files: [],
      signedUrl: null,
      activeVersion: null,
      uploaders: {},
      token,
    }
  }

  const target =
    requestedVersion !== undefined
      ? (files.find((f) => f.version === requestedVersion) ?? files[0])
      : (files.find((f) => f.is_current) ?? files[0])

  let signedUrl: string | null = null
  if (target) {
    const { data: signed } = await admin.storage
      .from('project-files')
      .createSignedUrl(target.file_url, 3600)
    signedUrl = signed?.signedUrl ?? null
  }

  const uploaderIds = [...new Set(files.map((f) => f.uploaded_by))]
  const uploaders: Record<string, string> = {}
  if (uploaderIds.length > 0) {
    const { data: profiles } = await db(admin)
      .from('profiles')
      .select('id, full_name')
      .in('id', uploaderIds)
    ;(profiles as { id: string; full_name: string }[] | null)?.forEach(
      (p: { id: string; full_name: string }) => {
        uploaders[p.id] = p.full_name
      },
    )
  }

  return {
    projectId: project.id,
    projectName: project.name,
    phaseName: phase.name,
    phaseStatus: phase.status,
    completedAt: phase.completed_at,
    files,
    signedUrl,
    activeVersion: target?.version ?? null,
    uploaders,
    token,
  }
}
