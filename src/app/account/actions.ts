'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import type { ContactMethod } from '@/lib/types'

export type AccountActionResult =
  | { success: true; message: string }
  | { success: false; error: string }

// ── updateProfile ─────────────────────────────────────────────────

export async function updateProfile(formData: FormData): Promise<AccountActionResult> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return { success: false, error: 'Le nom est requis' }

  let avatarUrl: string | undefined

  const avatarFile = formData.get('avatar') as File | null
  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 2 * 1024 * 1024) {
      return { success: false, error: "L'avatar ne doit pas dépasser 2 Mo" }
    }

    const ext = avatarFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const admin = createAdminClient()

    const { data: uploadData, error: uploadErr } = await admin.storage
      .from('avatars')
      .upload(`${user.id}/avatar.${ext}`, avatarFile, {
        upsert: true,
        contentType: avatarFile.type,
      })

    if (uploadErr) {
      console.error('[updateProfile] avatar upload error:', uploadErr)
      return { success: false, error: `Erreur upload : ${uploadErr.message}` }
    }

    const { data: urlData } = admin.storage.from('avatars').getPublicUrl(uploadData.path)
    avatarUrl = urlData.publicUrl
  }

  const patch: Record<string, unknown> = { full_name: name }
  if (avatarUrl) patch.avatar_url = avatarUrl

  const { error } = await db(supabase).from('profiles').update(patch).eq('id', user.id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/account')
  return { success: true, message: 'Profil mis à jour ✓' }
}

// ── changePassword ────────────────────────────────────────────────

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<AccountActionResult> {
  if (!currentPassword) return { success: false, error: 'Mot de passe actuel requis' }
  if (newPassword.length < 8) {
    return { success: false, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères' }
  }
  if (currentPassword === newPassword) {
    return { success: false, error: 'Le nouveau mot de passe doit être différent de l\'actuel' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return { success: false, error: 'Non authentifié' }

  // Verify current password by re-authenticating
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (signInErr) return { success: false, error: 'Mot de passe actuel incorrect' }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { success: false, error: error.message }

  return { success: true, message: 'Mot de passe modifié ✓' }
}

// ── updatePreferences ─────────────────────────────────────────────

export async function updatePreferences(
  contactMethod: string,
): Promise<AccountActionResult> {
  const VALID: ContactMethod[] = ['email', 'whatsapp', 'phone']
  if (!VALID.includes(contactMethod as ContactMethod)) {
    return { success: false, error: 'Méthode de contact invalide' }
  }

  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié' }

  const { error } = await db(supabase)
    .from('profiles')
    .update({ contact_method: contactMethod })
    .eq('id', user.id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/account')
  return { success: true, message: 'Préférences mises à jour ✓' }
}
