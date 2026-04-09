'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'

export type CommentActionResult = { success: true } | { success: false; error: string }

// ── addComment ─────────────────────────────────────────────────────

export async function addComment(input: {
  projectId: string
  phaseId?: string
  content: string
  parentId?: string
}): Promise<CommentActionResult> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership) return { success: false, error: 'Membre introuvable' }

  const { error } = await db(supabase)
    .from('comments')
    .insert({
      project_id: input.projectId,
      phase_id: input.phaseId ?? null,
      user_id: user.id,
      content: input.content.trim(),
      parent_id: input.parentId ?? null,
      is_resolved: false,
    })

  if (error) return { success: false, error: error.message }

  await db(supabase)
    .from('activity_logs')
    .insert({
      project_id: input.projectId,
      user_id: user.id,
      action: 'comment_added',
      details: { preview: input.content.slice(0, 80) },
    })

  revalidatePath(`/projects/${input.projectId}`)
  return { success: true }
}

// ── toggleResolveComment ───────────────────────────────────────────

export async function toggleResolveComment(commentId: string): Promise<CommentActionResult> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership) return { success: false, error: 'Membre introuvable' }

  const { data: rawComment } = await supabase
    .from('comments')
    .select('id, project_id, is_resolved')
    .eq('id', commentId)
    .maybeSingle()

  const comment = rawComment as { id: string; project_id: string; is_resolved: boolean } | null
  if (!comment) return { success: false, error: 'Commentaire introuvable' }

  const { role } = membership.member
  const canResolve =
    role === 'super_admin' || role === 'agency_admin' || role === 'creative' || role === 'client'
  if (!canResolve) return { success: false, error: 'Permissions insuffisantes' }

  const { error } = await db(supabase)
    .from('comments')
    .update({ is_resolved: !comment.is_resolved })
    .eq('id', commentId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/projects/${comment.project_id}`)
  return { success: true }
}

// ── deleteComment ──────────────────────────────────────────────────

export async function deleteComment(commentId: string): Promise<CommentActionResult> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership) return { success: false, error: 'Membre introuvable' }

  const { data: rawComment } = await supabase
    .from('comments')
    .select('id, project_id, user_id')
    .eq('id', commentId)
    .maybeSingle()

  const comment = rawComment as { id: string; project_id: string; user_id: string } | null
  if (!comment) return { success: false, error: 'Commentaire introuvable' }

  const { role } = membership.member
  const isAuthor = comment.user_id === user.id
  const isAdminRole = role === 'super_admin' || role === 'agency_admin'

  if (!isAuthor && !isAdminRole) {
    return { success: false, error: 'Vous ne pouvez pas supprimer ce commentaire' }
  }

  const { error } = await db(supabase).from('comments').delete().eq('id', commentId)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/projects/${comment.project_id}`)
  return { success: true }
}
