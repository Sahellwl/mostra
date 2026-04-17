'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import type { Profile, ProjectPhase } from '@/lib/types'

export type VideoActionResult = { success: true } | { success: false; error: string }

// ── Types ─────────────────────────────────────────────────────────

export interface VideoFile {
  id: string
  phase_id: string
  uploaded_by: string
  file_name: string
  file_url: string       // signed URL
  file_type: string | null
  file_size: number | null
  version: number
  is_current: boolean
  created_at: string
}

export interface VideoComment {
  id: string
  user_id: string
  content: string
  timecode_seconds: number | null
  video_version: number | null
  is_resolved: boolean
  created_at: string
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

// ── Auth helper ───────────────────────────────────────────────────

async function getCreativeContext() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership) return null

  const { role } = membership.member
  if (role !== 'super_admin' && role !== 'agency_admin' && role !== 'creative') return null

  return { supabase, user, membership }
}

// ── Video MIME types ──────────────────────────────────────────────

const VIDEO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
}

const VALID_VIDEO_MIMES = new Set([
  'video/mp4', 'video/quicktime', 'video/webm',
  'video/x-msvideo', 'video/mpeg', '',
])

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

// ── getVideoData ──────────────────────────────────────────────────

export async function getVideoData(phaseId: string): Promise<{
  currentVideo: VideoFile | null
  allVersions: VideoFile[]
  comments: VideoComment[]
}> {
  const ctx = await getCreativeContext()
  if (!ctx) return { currentVideo: null, allVersions: [], comments: [] }

  const admin = createAdminClient()

  const [{ data: rawFiles }, { data: rawComments }] = await Promise.all([
    admin
      .from('phase_files')
      .select('id, phase_id, uploaded_by, file_name, file_url, file_type, file_size, version, is_current, created_at')
      .eq('phase_id', phaseId)
      .order('version', { ascending: false }),
    admin
      .from('comments')
      .select('id, user_id, content, timecode_seconds, video_version, is_resolved, created_at')
      .eq('phase_id', phaseId)
      .not('timecode_seconds', 'is', null)
      .order('timecode_seconds', { ascending: true }),
  ])

  // Generate signed URLs
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

// ── uploadVideo ───────────────────────────────────────────────────

export async function uploadVideo(formData: FormData): Promise<
  { success: true; file: VideoFile } | { success: false; error: string }
> {
  const ctx = await getCreativeContext()
  if (!ctx) return { success: false, error: 'Permissions insuffisantes' }
  const { user, supabase } = ctx

  const phaseId = formData.get('phaseId') as string
  const projectId = formData.get('projectId') as string
  const file = formData.get('file') as File

  if (!phaseId || !projectId) return { success: false, error: 'Données manquantes' }
  if (!file || file.size === 0) return { success: false, error: 'Aucun fichier sélectionné' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const canonicalMime = VIDEO_MIME[ext]
  if (!canonicalMime) {
    return { success: false, error: `Format non supporté : ${file.name} — MP4, MOV, WebM uniquement` }
  }
  if (file.type && !VALID_VIDEO_MIMES.has(file.type)) {
    return { success: false, error: `Type MIME non supporté : ${file.type}` }
  }
  if (file.size > 500 * 1024 * 1024) {
    return { success: false, error: `Fichier trop lourd : ${file.name} (max 500 MB)` }
  }

  const admin = createAdminClient()

  // Compute next version number
  const { data: maxRow } = await admin
    .from('phase_files')
    .select('version')
    .eq('phase_id', phaseId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = ((maxRow as { version: number } | null)?.version ?? 0) + 1
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${projectId}/animation/v${nextVersion}/${safeFileName}`

  const fileBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await admin.storage
    .from('project-files')
    .upload(storagePath, fileBuffer, { contentType: canonicalMime, upsert: false })

  if (uploadErr) return { success: false, error: `Erreur upload : ${uploadErr.message}` }

  // Mark previous version as not current
  if (nextVersion > 1) {
    await db(admin).from('phase_files').update({ is_current: false }).eq('phase_id', phaseId)
  }

  const { data: rawFile, error: insertErr } = await db(admin)
    .from('phase_files')
    .insert({
      phase_id: phaseId,
      uploaded_by: user.id,
      file_name: file.name,
      file_url: storagePath,
      file_type: canonicalMime,
      file_size: file.size,
      version: nextVersion,
      is_current: true,
    })
    .select('id, phase_id, uploaded_by, file_name, file_url, file_type, file_size, version, is_current, created_at')
    .single()

  if (insertErr || !rawFile) {
    await admin.storage.from('project-files').remove([storagePath])
    return { success: false, error: 'Erreur lors de la création du fichier' }
  }

  // Get phase for project_id revalidation
  const { data: rawPhase } = await supabase
    .from('project_phases')
    .select('project_id')
    .eq('id', phaseId)
    .maybeSingle()
  const projectIdFromPhase = (rawPhase as Pick<ProjectPhase, 'project_id'> | null)?.project_id

  if (projectIdFromPhase) {
    await db(admin).from('activity_logs').insert({
      project_id: projectIdFromPhase,
      user_id: user.id,
      action: 'file_uploaded',
      details: { file_name: file.name, version: nextVersion },
    })
    revalidatePath(`/projects/${projectIdFromPhase}`)
  }

  const signedUrl = await generateSignedUrl(admin, storagePath)
  const resultFile = { ...(rawFile as Omit<VideoFile, 'file_url'>), file_url: signedUrl } as VideoFile

  return { success: true, file: resultFile }
}

// ── addTimecodedComment ───────────────────────────────────────────

export async function addTimecodedComment(
  phaseId: string,
  content: string,
  timecodeSeconds: number | null,
  videoVersion: number | null,
): Promise<VideoActionResult> {
  const ctx = await getCreativeContext()
  if (!ctx) return { success: false, error: 'Permissions insuffisantes' }
  const { supabase, user } = ctx

  if (!content.trim()) return { success: false, error: 'Contenu vide' }

  // Get project_id from phase
  const { data: rawPhase } = await supabase
    .from('project_phases')
    .select('project_id')
    .eq('id', phaseId)
    .maybeSingle()

  const projectId = (rawPhase as Pick<ProjectPhase, 'project_id'> | null)?.project_id
  if (!projectId) return { success: false, error: 'Phase introuvable' }

  const { error } = await db(supabase)
    .from('comments')
    .insert({
      project_id: projectId,
      phase_id: phaseId,
      sub_phase_id: null,
      block_id: null,
      user_id: user.id,
      content: content.trim(),
      timecode_seconds: timecodeSeconds,
      video_version: videoVersion,
      is_resolved: false,
    })

  if (error) return { success: false, error: error.message }
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

// ── resolveVideoComment ───────────────────────────────────────────

export async function resolveVideoComment(commentId: string): Promise<VideoActionResult> {
  const ctx = await getCreativeContext()
  if (!ctx) return { success: false, error: 'Permissions insuffisantes' }

  const admin = createAdminClient()

  const { data: rawComment } = await admin
    .from('comments')
    .select('id, project_id, user_id, is_resolved')
    .eq('id', commentId)
    .maybeSingle()

  const comment = rawComment as { id: string; project_id: string; user_id: string; is_resolved: boolean } | null
  if (!comment) return { success: false, error: 'Commentaire introuvable' }

  const { error } = await db(admin)
    .from('comments')
    .update({ is_resolved: !comment.is_resolved })
    .eq('id', commentId)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/projects/${comment.project_id}`)
  return { success: true }
}

// ── deleteVideoComment ────────────────────────────────────────────

export async function deleteVideoComment(commentId: string): Promise<VideoActionResult> {
  const ctx = await getCreativeContext()
  if (!ctx) return { success: false, error: 'Permissions insuffisantes' }

  const { user } = ctx
  const isAdmin =
    ctx.membership.member.role === 'super_admin' ||
    ctx.membership.member.role === 'agency_admin'

  const admin = createAdminClient()

  const { data: rawComment } = await admin
    .from('comments')
    .select('id, project_id, user_id')
    .eq('id', commentId)
    .maybeSingle()

  const comment = rawComment as { id: string; project_id: string; user_id: string } | null
  if (!comment) return { success: false, error: 'Commentaire introuvable' }

  if (!isAdmin && comment.user_id !== user.id) {
    return { success: false, error: 'Vous ne pouvez pas supprimer ce commentaire' }
  }

  const { error } = await admin.from('comments').delete().eq('id', commentId)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/projects/${comment.project_id}`)
  return { success: true }
}
