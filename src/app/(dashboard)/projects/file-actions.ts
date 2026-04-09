'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import type { PhaseFile } from '@/lib/types'

// ─── uploadFile ──────────────────────────────────────────────────
// Reçoit le fichier via FormData, upload dans Storage avec le client
// admin (bypass RLS), puis insère l'enregistrement en base.
// La vérification des permissions se fait entièrement en code.

export type UploadFileResult =
  | { success: true; file: PhaseFile }
  | { success: false; error: string }

export async function uploadFile(formData: FormData): Promise<UploadFileResult> {
  const supabase = createClient()
  const admin = createAdminClient()

  // ── Auth ──────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership) return { success: false, error: 'Membre introuvable' }

  const { role } = membership.member
  if (role !== 'super_admin' && role !== 'agency_admin' && role !== 'creative') {
    return { success: false, error: 'Permissions insuffisantes' }
  }

  // ── Extraction des champs ─────────────────────────────────────────
  const file = formData.get('file') as File | null
  const phaseId = formData.get('phaseId') as string | null
  const projectId = formData.get('projectId') as string | null
  const phaseSlug = formData.get('phaseSlug') as string | null

  if (!file || !phaseId || !projectId || !phaseSlug) {
    return { success: false, error: 'Données manquantes' }
  }

  // ── Calcul de la version ──────────────────────────────────────────
  const { data: lastVersion } = await admin
    .from('phase_files')
    .select('version')
    .eq('phase_id', phaseId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const version = ((lastVersion as { version: number } | null)?.version ?? 0) + 1

  // ── Upload Storage via admin (bypass RLS Storage) ─────────────────
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${projectId}/${phaseSlug}/v${version}/${safeName}`

  const { error: storageError } = await admin.storage
    .from('project-files')
    .upload(storagePath, file, { cacheControl: '3600', upsert: false })

  if (storageError) return { success: false, error: `[Storage] ${storageError.message}` }

  // ── Désactive is_current sur les versions précédentes ────────────
  await db(admin).from('phase_files').update({ is_current: false }).eq('phase_id', phaseId)

  // ── Insère l'enregistrement ───────────────────────────────────────
  const { data: fileRecord, error: dbError } = await db(admin)
    .from('phase_files')
    .insert({
      phase_id: phaseId,
      uploaded_by: user.id,
      file_name: file.name,
      file_url: storagePath,
      file_type: file.type || null,
      file_size: file.size,
      version,
      is_current: true,
    })
    .select('*')
    .single()

  if (dbError) return { success: false, error: `[DB] ${dbError.message}` }

  // ── Log d'activité ────────────────────────────────────────────────
  const { data: phaseRow } = await supabase
    .from('project_phases')
    .select('name')
    .eq('id', phaseId)
    .maybeSingle()

  const phaseName = (phaseRow as { name: string } | null)?.name ?? 'phase'

  await db(admin)
    .from('activity_logs')
    .insert({
      project_id: projectId,
      user_id: user.id,
      action: 'file_uploaded',
      details: { file_name: file.name, phase_name: phaseName, version },
    })

  revalidatePath(`/projects/${projectId}`)
  return { success: true, file: fileRecord as PhaseFile }
}

// ─── getSignedUrl ─────────────────────────────────────────────────
// Génère une URL signée valable 1 heure pour visualiser/télécharger
// un fichier dans le bucket "project-files" (jamais public).

// ─── getPhaseViewData ─────────────────────────────────────────────
// Fetch toutes les données nécessaires pour la page de visualisation.

export interface PhaseViewData {
  projectId: string
  projectName: string
  phaseName: string
  files: PhaseFile[]
  /** URL signée (1 h) pour la version demandée, ou null si aucun fichier */
  signedUrl: string | null
  /** Version actuellement affichée */
  activeVersion: number | null
  /** Profils des uploadeurs (keyed by user_id) */
  uploaders: Record<string, string>
}

export async function getPhaseViewData(
  phaseId: string,
  requestedVersion?: number,
): Promise<PhaseViewData | { error: string }> {
  const supabase = createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Phase + projet
  const { data: rawPhase } = await supabase
    .from('project_phases')
    .select('id, name, project_id')
    .eq('id', phaseId)
    .maybeSingle()

  const phase = rawPhase as { id: string; name: string; project_id: string } | null
  if (!phase) return { error: 'Phase introuvable' }

  const { data: rawProject } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', phase.project_id)
    .maybeSingle()

  const project = rawProject as { id: string; name: string } | null
  if (!project) return { error: 'Projet introuvable' }

  // Fichiers de la phase (desc par version)
  const { data: rawFiles } = await admin
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
      files: [],
      signedUrl: null,
      activeVersion: null,
      uploaders: {},
    }
  }

  // Version à afficher : demandée ou la plus récente (is_current)
  const target =
    requestedVersion !== undefined
      ? files.find((f) => f.version === requestedVersion)
      : (files.find((f) => f.is_current) ?? files[0])

  let signedUrl: string | null = null
  if (target) {
    const { data: signed } = await admin.storage
      .from('project-files')
      .createSignedUrl(target.file_url, 3600)
    signedUrl = signed?.signedUrl ?? null
  }

  // Profils des uploadeurs
  const uploaderIds = [...new Set(files.map((f) => f.uploaded_by))]
  const uploaders: Record<string, string> = {}
  if (uploaderIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', uploaderIds)
    ;(profiles as { id: string; full_name: string }[] | null)?.forEach((p) => {
      uploaders[p.id] = p.full_name
    })
  }

  return {
    projectId: project.id,
    projectName: project.name,
    phaseName: phase.name,
    files,
    signedUrl,
    activeVersion: target?.version ?? null,
    uploaders,
  }
}

export async function getSignedUrl(filePath: string): Promise<{ url: string } | { error: string }> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  // Utilise le client admin pour éviter les blocages RLS Storage
  // sur createSignedUrl (même problème que pour l'upload)
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from('project-files').createSignedUrl(filePath, 3600)

  if (error || !data?.signedUrl) return { error: error?.message ?? 'Erreur inconnue' }
  return { url: data.signedUrl }
}
