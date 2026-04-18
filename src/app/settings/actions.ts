'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import type { AgencyMember } from '@/lib/types'

export type ActionResult = { success: true } | { success: false; error: string }
export type InviteResult =
  | { success: true; token: string; email: string; role: string; invite_code: string }
  | { success: false; error: string }

// Alphabet sans caractères ambigus : pas de 0/O, 1/I/L
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateInviteCode(): string {
  const pick = () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return `${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}`
}

// ── Permission helper ────────────────────────────────────────────

async function requireAdmin(): Promise<
  | { error: string }
  | {
      supabase: ReturnType<typeof createClient>
      admin: ReturnType<typeof createAdminClient>
      member: AgencyMember
    }
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

  return { supabase, admin: createAdminClient(), member: membership.member }
}

// ── sendInvitation ───────────────────────────────────────────────

export async function sendInvitation(input: {
  email?: string
  role: 'agency_admin' | 'creative' | 'client'
}): Promise<InviteResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const { supabase, member } = auth

  const email = input.email?.toLowerCase().trim() || null
  const agencyId = member.agency_id

  // Vérifications liées à l'email (uniquement si un email est fourni)
  if (email) {
    // Vérifier si l'email est déjà membre actif
    const { data: profiles } = await db(supabase)
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (profiles) {
      const { data: alreadyMember } = await db(supabase)
        .from('agency_members')
        .select('id, role')
        .eq('agency_id', agencyId)
        .eq('user_id', profiles.id)
        .eq('is_active', true)
        .maybeSingle()

      if (alreadyMember) {
        return { success: false, error: "Cette personne est déjà membre de l'agence." }
      }
    }

    // Vérifier si une invitation non expirée existe déjà pour cet email
    const { data: existingInvite } = await db(supabase)
      .from('invitations')
      .select('id, expires_at')
      .eq('agency_id', agencyId)
      .eq('email', email)
      .is('accepted_at', null)
      .maybeSingle()

    if (existingInvite) {
      const expired = new Date(existingInvite.expires_at) < new Date()
      if (!expired) {
        return { success: false, error: 'Une invitation est déjà en attente pour cet email.' }
      }
      await db(supabase).from('invitations').delete().eq('id', existingInvite.id)
    }
  }

  // Créer l'invitation — token auto-généré par la DB, code court généré ici
  const inviteCode = generateInviteCode()

  const { data: invitation, error: insertErr } = await db(supabase)
    .from('invitations')
    .insert({
      agency_id: agencyId,
      email,
      role: input.role,
      invited_by: member.user_id,
      invite_code: inviteCode,
    })
    .select('token, invite_code')
    .single()

  if (insertErr || !invitation) {
    console.error('[sendInvitation] insert error:', JSON.stringify(insertErr))
    return {
      success: false,
      error: insertErr?.message ?? "Erreur lors de la création de l'invitation",
    }
  }

  revalidatePath('/settings/team')
  return {
    success: true,
    token: invitation.token,
    email: email ?? '',
    role: input.role,
    invite_code: invitation.invite_code ?? inviteCode,
  }
}

// ── revokeInvitation ─────────────────────────────────────────────

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const { supabase } = auth

  const { error } = await db(supabase).from('invitations').delete().eq('id', invitationId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/team')
  return { success: true }
}

// ── removeMember ─────────────────────────────────────────────────

export async function removeMember(memberId: string): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const { supabase, member: caller } = auth

  // Vérifier qu'on ne se supprime pas soi-même
  if (memberId === caller.id) {
    return { success: false, error: 'Vous ne pouvez pas vous retirer vous-même.' }
  }

  // Vérifier que la cible est dans la même agence
  const { data: target } = await db(supabase)
    .from('agency_members')
    .select('id, role, agency_id, user_id')
    .eq('id', memberId)
    .eq('agency_id', caller.agency_id)
    .maybeSingle()

  if (!target) return { success: false, error: 'Membre introuvable.' }

  // Un agency_admin ne peut pas retirer un super_admin
  if (target.role === 'super_admin' && caller.role !== 'super_admin') {
    return { success: false, error: 'Permissions insuffisantes pour retirer un super admin.' }
  }

  const { error } = await db(supabase)
    .from('agency_members')
    .update({ is_active: false })
    .eq('id', memberId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/team')
  return { success: true }
}

// ── changeMemberRole ─────────────────────────────────────────────

export async function changeMemberRole(
  memberId: string,
  newRole: 'super_admin' | 'agency_admin' | 'creative',
): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const { supabase, member: caller } = auth

  if (memberId === caller.id) {
    return { success: false, error: 'Vous ne pouvez pas modifier votre propre rôle.' }
  }

  const { data: target } = await db(supabase)
    .from('agency_members')
    .select('id, role, agency_id')
    .eq('id', memberId)
    .eq('agency_id', caller.agency_id)
    .maybeSingle()

  if (!target) return { success: false, error: 'Membre introuvable.' }

  // Seul un super_admin peut promouvoir/rétrograder un super_admin
  if (
    (target.role === 'super_admin' || newRole === 'super_admin') &&
    caller.role !== 'super_admin'
  ) {
    return { success: false, error: 'Seul un super admin peut gérer ce rôle.' }
  }

  const { error } = await db(supabase)
    .from('agency_members')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/team')
  return { success: true }
}

// ── updateAgencySettings ─────────────────────────────────────────

export async function updateAgencySettings(formData: FormData): Promise<ActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const { supabase, admin, member } = auth

  const agencyId = member.agency_id
  const name = (formData.get('name') as string | null)?.trim()
  const primaryColor = formData.get('primaryColor') as string | null
  const logoFile = formData.get('logo') as File | null

  if (!name) return { success: false, error: 'Le nom est requis.' }

  const updates: Record<string, string> = { name, updated_at: new Date().toISOString() }
  if (primaryColor) updates.primary_color = primaryColor

  // Logo upload
  if (logoFile && logoFile.size > 0) {
    const ext = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png'
    if (!['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
      return { success: false, error: 'Format non supporté. Utilisez PNG, JPG, WebP ou SVG.' }
    }
    const buffer = Buffer.from(await logoFile.arrayBuffer())
    const path = `${agencyId}/logo.${ext}`

    const { error: uploadErr } = await db(admin)
      .storage.from('agency-assets')
      .upload(path, buffer, { contentType: logoFile.type, upsert: true })

    if (uploadErr) return { success: false, error: `Upload logo : ${uploadErr.message}` }

    const { data: pub } = db(supabase).storage.from('agency-assets').getPublicUrl(path)
    if (pub?.publicUrl) updates.logo_url = pub.publicUrl
  }

  const { error } = await db(supabase).from('agencies').update(updates).eq('id', agencyId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

// ── acceptInvitation (public — utilisé depuis la page /invite/[token]) ──

export type AcceptResult = { success: true } | { success: false; error: string }

export async function acceptInvitation(
  token: string,
  fullName: string,
  password: string,
): Promise<AcceptResult> {
  const admin = createAdminClient()

  // Lire l'invitation (service role pour bypasser RLS)
  const { data: invitation, error: invErr } = await db(admin)
    .from('invitations')
    .select('id, agency_id, email, role, accepted_at, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (invErr || !invitation) {
    return { success: false, error: 'Invitation introuvable ou invalide.' }
  }
  if (invitation.accepted_at) {
    return { success: false, error: 'Cette invitation a déjà été utilisée.' }
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return { success: false, error: 'Cette invitation a expiré.' }
  }

  const email = invitation.email as string

  // Vérifier si l'utilisateur existe déjà dans auth
  const {
    data: { users },
  } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = users.find((u) => u.email === email)

  let userId: string

  if (existingUser) {
    userId = existingUser.id
    // Mettre à jour le mot de passe et le nom
    await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: { full_name: fullName.trim() },
    })
    await db(admin).from('profiles').update({ full_name: fullName.trim() }).eq('id', userId)
  } else {
    // Créer le compte
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() },
    })
    if (createErr || !newUser.user) {
      console.error('[acceptInvitation] createUser error:', JSON.stringify(createErr))
      return { success: false, error: createErr?.message ?? 'Erreur lors de la création du compte' }
    }
    userId = newUser.user.id

    // Upsert profil (le trigger a peut-être déjà créé un profil partiel)
    await db(admin)
      .from('profiles')
      .upsert(
        { id: userId, email, full_name: fullName.trim(), contact_method: 'email' },
        { onConflict: 'id' },
      )
  }

  // Vérifier si déjà membre de l'agence
  const { data: existingMembership } = await db(admin)
    .from('agency_members')
    .select('id, is_active')
    .eq('agency_id', invitation.agency_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingMembership) {
    await db(admin)
      .from('agency_members')
      .update({ role: invitation.role, is_active: true, accepted_at: new Date().toISOString() })
      .eq('id', existingMembership.id)
  } else {
    await db(admin).from('agency_members').insert({
      agency_id: invitation.agency_id,
      user_id: userId,
      role: invitation.role,
      accepted_at: new Date().toISOString(),
    })
  }

  // Marquer l'invitation comme acceptée
  await db(admin)
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return { success: true }
}
