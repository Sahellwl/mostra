'use server'

import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import type { Project, ProjectPhase, Profile } from '@/lib/types'
import type { VideoFile, VideoComment } from '@/app/(dashboard)/projects/video-actions'

export type VideoClientResult = { success: true } | { success: false; error: string }

// ── Storage helpers ───────────────────────────────────────────────

function extractStoragePath(url: string): string | null {
  if (!url) return null
  const match = url.match(/\/project-files\/(.+?)(?:\?|$)/)
  if (match) return match[1]
  return url
}

async function generateSignedUrl(
  admin: ReturnType<typeof createAdminClient>,
  storagePath: string,
): Promise<string> {
  const { data } = await admin.storage.from('project-files').createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? ''
}

// ── Auth helpers ──────────────────────────────────────────────────

async function verifyToken(
  token: string,
): Promise<Pick<Project, 'id' | 'client_id' | 'agency_id' | 'share_token'> | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('projects')
    .select('id, client_id, agency_id, share_token')
    .eq('share_token', token)
    .maybeSingle()
  return data as Pick<Project, 'id' | 'client_id' | 'agency_id' | 'share_token'> | null
}

async function resolveClientUserId(
  admin: ReturnType<typeof createAdminClient>,
  project: Pick<Project, 'id' | 'client_id' | 'agency_id'>,
): Promise<string | null> {
  if (project.client_id) return project.client_id
  const { data } = await admin
    .from('agency_members')
    .select('user_id')
    .eq('agency_id', project.agency_id)
    .eq('role', 'client')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  return (data as { user_id: string } | null)?.user_id ?? null
}

// ── fetchVideoData ────────────────────────────────────────────────

export async function fetchVideoData(
  token: string,
  phaseId: string,
): Promise<{
  currentVideo: VideoFile | null
  allVersions: VideoFile[]
  comments: VideoComment[]
}> {
  noStore()
  const admin = createAdminClient()
  const project = await verifyToken(token)
  if (!project) return { currentVideo: null, allVersions: [], comments: [] }

  // Verify phase belongs to project
  const { data: rawPhase } = await admin
    .from('project_phases')
    .select('id, project_id')
    .eq('id', phaseId)
    .maybeSingle()
  const phase = rawPhase as { id: string; project_id: string } | null
  if (!phase || phase.project_id !== project.id) {
    return { currentVideo: null, allVersions: [], comments: [] }
  }

  const [{ data: rawFiles }, { data: rawComments }] = await Promise.all([
    admin
      .from('phase_files')
      .select(
        'id, phase_id, uploaded_by, file_name, file_url, file_type, file_size, version, is_current, created_at',
      )
      .eq('phase_id', phaseId)
      .order('version', { ascending: false }),
    admin
      .from('comments')
      .select('id, user_id, content, timecode_seconds, video_version, is_resolved, created_at')
      .eq('phase_id', phaseId)
      .not('timecode_seconds', 'is', null)
      .order('timecode_seconds', { ascending: true }),
  ])

  // Sign all file URLs
  const files = await Promise.all(
    ((rawFiles ?? []) as unknown as (Omit<VideoFile, 'file_url'> & { file_url: string })[]).map(async (f) => {
      const storagePath = extractStoragePath(f.file_url)
      if (!storagePath) return { ...f, file_url: '' }
      const signedUrl = await generateSignedUrl(admin, storagePath)
      return { ...f, file_url: signedUrl }
    }),
  )

  const currentVideo = files.find((f) => f.is_current) ?? files[0] ?? null
  const allVersions = files as VideoFile[]

  // Fetch comment authors
  const commentList = (rawComments ?? []) as {
    id: string
    user_id: string
    content: string
    timecode_seconds: number | null
    video_version: number | null
    is_resolved: boolean
    created_at: string
  }[]

  const authorIds = [...new Set(commentList.map((c) => c.user_id))]
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

  const comments: VideoComment[] = commentList.map((c) => ({
    ...c,
    author: authorMap.get(c.user_id) ?? null,
  }))

  return { currentVideo, allVersions, comments }
}

// ── addClientVideoComment ─────────────────────────────────────────

export async function addClientVideoComment(
  token: string,
  phaseId: string,
  content: string,
  timecodeSeconds: number | null,
): Promise<VideoClientResult> {
  const admin = createAdminClient()
  const project = await verifyToken(token)
  if (!project) return { success: false, error: 'Token invalide' }
  if (!content.trim()) return { success: false, error: 'Contenu vide' }

  const userId = await resolveClientUserId(admin, project)
  if (!userId) return { success: false, error: 'Client introuvable' }

  // Verify phase belongs to project
  const { data: rawPhase } = await admin
    .from('project_phases')
    .select('id, project_id, status')
    .eq('id', phaseId)
    .maybeSingle()
  const phase = rawPhase as { id: string; project_id: string; status: string } | null
  if (!phase || phase.project_id !== project.id) {
    return { success: false, error: 'Phase introuvable' }
  }

  // Get current video version
  const { data: rawCurrentFile } = await admin
    .from('phase_files')
    .select('version')
    .eq('phase_id', phaseId)
    .eq('is_current', true)
    .maybeSingle()
  const videoVersion = (rawCurrentFile as { version: number } | null)?.version ?? null

  const { error } = await db(admin).from('comments').insert({
    project_id: project.id,
    phase_id: phaseId,
    sub_phase_id: null,
    block_id: null,
    user_id: userId,
    content: content.trim(),
    timecode_seconds: timecodeSeconds,
    video_version: videoVersion,
    is_resolved: false,
  })

  if (error) return { success: false, error: error.message }
  revalidatePath(`/client/${token}`)
  return { success: true }
}

// ── resolveClientVideoComment ─────────────────────────────────────

export async function resolveClientVideoComment(
  token: string,
  commentId: string,
): Promise<VideoClientResult> {
  const admin = createAdminClient()
  const project = await verifyToken(token)
  if (!project) return { success: false, error: 'Token invalide' }

  const userId = await resolveClientUserId(admin, project)

  const { data: rawComment } = await admin
    .from('comments')
    .select('id, project_id, user_id, is_resolved')
    .eq('id', commentId)
    .maybeSingle()
  const comment = rawComment as {
    id: string
    project_id: string
    user_id: string
    is_resolved: boolean
  } | null
  if (!comment || comment.project_id !== project.id) {
    return { success: false, error: 'Commentaire introuvable' }
  }

  // Clients can only toggle their own comments
  if (userId && comment.user_id !== userId) {
    return { success: false, error: 'Vous ne pouvez résoudre que vos propres commentaires' }
  }

  const { error } = await db(admin)
    .from('comments')
    .update({ is_resolved: !comment.is_resolved })
    .eq('id', commentId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── approveAnimationPhase ─────────────────────────────────────────

export async function approveAnimationPhase(
  token: string,
  phaseId: string,
): Promise<VideoClientResult> {
  const admin = createAdminClient()
  const project = await verifyToken(token)
  if (!project) return { success: false, error: 'Token invalide' }

  const { data: rawPhase } = await admin
    .from('project_phases')
    .select('id, project_id, name, status')
    .eq('id', phaseId)
    .maybeSingle()
  const phase = rawPhase as ProjectPhase | null
  if (!phase || phase.project_id !== project.id) {
    return { success: false, error: 'Phase introuvable' }
  }
  if (phase.status !== 'in_review') {
    return { success: false, error: "Cette phase n'est pas en attente de validation" }
  }

  const { error } = await db(admin)
    .from('project_phases')
    .update({ status: 'approved', completed_at: new Date().toISOString() })
    .eq('id', phaseId)
  if (error) return { success: false, error: error.message }

  // Recalc project progress
  const { data: rawAllPhases } = await admin
    .from('project_phases')
    .select('id, status')
    .eq('project_id', project.id)
  const allPhases = (rawAllPhases as Pick<ProjectPhase, 'id' | 'status'>[] | null) ?? []
  const updated = allPhases.map((p) =>
    p.id === phaseId ? { ...p, status: 'approved' as const } : p,
  )
  const doneCount = updated.filter(
    (p) => p.status === 'completed' || p.status === 'approved',
  ).length
  const progress = allPhases.length > 0 ? Math.round((doneCount / allPhases.length) * 100) : 0
  const allDone = updated.every((p) => p.status === 'completed' || p.status === 'approved')
  await db(admin)
    .from('projects')
    .update({ progress, ...(allDone ? { status: 'completed' } : {}) })
    .eq('id', project.id)

  const userId = await resolveClientUserId(admin, project)
  await db(admin).from('activity_logs').insert({
    project_id: project.id,
    user_id: userId ?? null,
    action: 'phase_approved',
    details: { phase_name: phase.name, via: 'client_token' },
  })

  revalidatePath(`/client/${token}`)
  revalidatePath(`/client/${token}/phases/${phaseId}`)
  revalidatePath(`/projects/${project.id}`)
  return { success: true }
}

// ── requestAnimationRevisions ─────────────────────────────────────

export async function requestAnimationRevisions(
  token: string,
  phaseId: string,
  message: string,
): Promise<VideoClientResult> {
  const admin = createAdminClient()
  const project = await verifyToken(token)
  if (!project) return { success: false, error: 'Token invalide' }

  const userId = await resolveClientUserId(admin, project)
  if (!userId) return { success: false, error: 'Client introuvable' }

  const { data: rawPhase } = await admin
    .from('project_phases')
    .select('id, project_id, name, status')
    .eq('id', phaseId)
    .maybeSingle()
  const phase = rawPhase as ProjectPhase | null
  if (!phase || phase.project_id !== project.id) {
    return { success: false, error: 'Phase introuvable' }
  }
  if (phase.status !== 'in_review') {
    return { success: false, error: "Cette phase n'est pas en attente de validation" }
  }

  const { error } = await db(admin)
    .from('project_phases')
    .update({ status: 'in_progress' })
    .eq('id', phaseId)
  if (error) return { success: false, error: error.message }

  const trimmed = message.trim()
  if (trimmed) {
    await db(admin).from('comments').insert({
      project_id: project.id,
      phase_id: phaseId,
      sub_phase_id: null,
      block_id: null,
      user_id: userId,
      content: `[Demande de modification] ${trimmed}`,
      is_resolved: false,
    })
  }

  await db(admin).from('activity_logs').insert({
    project_id: project.id,
    user_id: userId,
    action: 'status_changed',
    details: { phase_name: phase.name, message: 'Demande de modifications client (vidéo)' },
  })

  revalidatePath(`/client/${token}`)
  revalidatePath(`/client/${token}/phases/${phaseId}`)
  revalidatePath(`/projects/${project.id}`)
  return { success: true }
}
