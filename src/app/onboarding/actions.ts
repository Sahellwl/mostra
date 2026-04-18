'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'

export type JoinResult = { success: false; error: string } | { success: true; redirectTo: string }

export async function joinWithCode(code: string): Promise<JoinResult> {
  const supabase = createClient()
  const admin = createAdminClient()

  // ── Auth ────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié.' }

  // ── Normaliser le code ───────────────────────────────────────────
  const normalizedCode = code.trim().toUpperCase().replace(/\s/g, '')
  if (!normalizedCode || normalizedCode.length < 8) {
    return { success: false, error: 'Code invalide. Format attendu : XXXX-XXXX' }
  }

  // ── Chercher l'invitation (admin pour bypasser RLS) ──────────────
  const { data: invitation, error: fetchErr } = await db(admin)
    .from('invitations')
    .select('id, agency_id, role, accepted_at, expires_at, email')
    .eq('invite_code', normalizedCode)
    .maybeSingle()

  if (fetchErr) {
    console.error('[joinWithCode] fetch invitation error:', fetchErr)
    return { success: false, error: 'Erreur lors de la vérification du code.' }
  }
  if (!invitation) {
    return { success: false, error: 'Code introuvable. Vérifiez le code et réessayez.' }
  }
  if (invitation.accepted_at) {
    return { success: false, error: 'Ce code a déjà été utilisé.' }
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return { success: false, error: 'Ce code a expiré. Demandez un nouveau code à votre agence.' }
  }

  // ── Garantir que le profil existe ────────────────────────────────
  // agency_members.user_id → FK vers profiles(id), pas auth.users.
  // Le trigger handle_new_user peut ne pas avoir tiré sur /register.
  const { data: authUser } = await admin.auth.admin.getUserById(user.id)
  const userEmail = authUser?.user?.email ?? user.email ?? ''
  const userFullName =
    (authUser?.user?.user_metadata?.full_name as string | undefined) ?? userEmail

  const { error: profileErr } = await db(admin)
    .from('profiles')
    .upsert(
      { id: user.id, email: userEmail, full_name: userFullName },
      { onConflict: 'id', ignoreDuplicates: true },
    )

  if (profileErr) {
    console.error('[joinWithCode] profile upsert error:', profileErr)
    return { success: false, error: 'Erreur lors de la préparation du profil.' }
  }

  // ── Vérifier si déjà membre de cette agence ──────────────────────
  const { data: existingMembership, error: memberCheckErr } = await db(admin)
    .from('agency_members')
    .select('id, is_active')
    .eq('agency_id', invitation.agency_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberCheckErr) {
    console.error('[joinWithCode] membership check error:', memberCheckErr)
  }

  if (existingMembership?.is_active) {
    return { success: false, error: 'Vous êtes déjà membre de cette agence.' }
  }

  const now = new Date().toISOString()

  if (existingMembership) {
    // Réactiver un membership inactif
    const { error: updateErr } = await db(admin)
      .from('agency_members')
      .update({ role: invitation.role, is_active: true, accepted_at: now })
      .eq('id', existingMembership.id)

    if (updateErr) {
      console.error('[joinWithCode] membership update error:', updateErr)
      return { success: false, error: `Erreur lors de la réactivation : ${updateErr.message}` }
    }
  } else {
    // Créer le membership
    const { error: insertErr } = await db(admin).from('agency_members').insert({
      agency_id: invitation.agency_id,
      user_id: user.id,
      role: invitation.role,
      accepted_at: now,
    })

    if (insertErr) {
      console.error('[joinWithCode] membership insert error:', insertErr)
      return { success: false, error: `Erreur lors de l'ajout au membre : ${insertErr.message}` }
    }
  }

  console.log('[joinWithCode] membership created for user', user.id, '→ agency', invitation.agency_id)

  // ── Marquer l'invitation comme acceptée ──────────────────────────
  await db(admin).from('invitations').update({ accepted_at: now }).eq('id', invitation.id)

  // ── Redirection selon rôle ───────────────────────────────────────
  const role = invitation.role as string
  const redirectTo =
    role === 'client'
      ? '/client/dashboard'
      : role === 'super_admin'
        ? '/admin'
        : '/dashboard'

  return { success: true, redirectTo }
}
