'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'

export type CommentActionResult = { success: true } | { success: false; error: string }

// ── addComment ─────────────────────────────────────────────────────

export async function addComment(input: {
  projectId: string
  phaseId?: string
  subPhaseId?: string
  blockId?: string
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
      sub_phase_id: input.subPhaseId ?? null,
      block_id: input.blockId ?? null,
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
// Admins can resolve any comment on their agency's projects.
// Creatives can resolve their own comments only.
// Uses admin client for the UPDATE to bypass RLS when the resolver is not the author.

export async function toggleResolveComment(commentId: string): Promise<CommentActionResult> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership) return { success: false, error: 'Membre introuvable' }

  const { role } = membership.member
  const isAdminRole = role === 'super_admin' || role === 'agency_admin'
  const canResolve = isAdminRole || role === 'creative'
  if (!canResolve) return { success: false, error: 'Permissions insuffisantes' }

  // Use admin client to read + write so RLS never blocks an admin resolving a client comment
  const admin = createAdminClient()

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
  if (!comment) return { success: false, error: 'Commentaire introuvable' }

  // Non-admins can only resolve their own comments
  if (!isAdminRole && comment.user_id !== user.id) {
    return { success: false, error: 'Vous ne pouvez résoudre que vos propres commentaires' }
  }

  const { error } = await db(admin)
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

  const { role } = membership.member
  const isAdminRole = role === 'super_admin' || role === 'agency_admin'

  // Admin client bypasses RLS so admin can delete any comment
  const admin = createAdminClient()

  const { data: rawComment } = await admin
    .from('comments')
    .select('id, project_id, user_id')
    .eq('id', commentId)
    .maybeSingle()

  const comment = rawComment as { id: string; project_id: string; user_id: string } | null
  if (!comment) return { success: false, error: 'Commentaire introuvable' }

  const isAuthor = comment.user_id === user.id

  if (!isAuthor && !isAdminRole) {
    return { success: false, error: 'Vous ne pouvez pas supprimer ce commentaire' }
  }

  const { error } = await db(admin).from('comments').delete().eq('id', commentId)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/projects/${comment.project_id}`)
  return { success: true }
}
