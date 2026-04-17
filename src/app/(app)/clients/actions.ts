'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import type { AgencyMember, ContactMethod, Profile, Project } from '@/lib/types'

export type ClientActionResult = { success: true } | { success: false; error: string }

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

// ── createClient ─────────────────────────────────────────────────

export interface CreateClientInput {
  fullName: string
  email: string
  phone?: string
  contactMethod: ContactMethod
}

export async function createClientAction(input: CreateClientInput): Promise<ClientActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const { admin, member } = auth
  const agencyId = member.agency_id

  // Vérifie si l'email existe déjà dans auth
  const {
    data: { users },
  } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = users.find((u) => u.email === input.email.toLowerCase().trim())

  let userId: string

  if (existingUser) {
    userId = existingUser.id
    // Upsert profil avec les nouvelles infos
    await db(admin)
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: input.email.toLowerCase().trim(),
          full_name: input.fullName.trim(),
          phone: input.phone?.trim() || null,
          contact_method: input.contactMethod,
        },
        { onConflict: 'id' },
      )
  } else {
    // Crée le user auth (sans password — connexion via share_token ou magic link)
    const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
      email: input.email.toLowerCase().trim(),
      email_confirm: true,
      user_metadata: { full_name: input.fullName.trim() },
    })
    if (authErr || !newUser.user) {
      console.error('[createClientAction] auth.admin.createUser error:', JSON.stringify(authErr))
      return { success: false, error: authErr?.message ?? 'Erreur lors de la création du compte' }
    }

    userId = newUser.user.id

    await db(admin)
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: input.email.toLowerCase().trim(),
          full_name: input.fullName.trim(),
          phone: input.phone?.trim() || null,
          contact_method: input.contactMethod,
        },
        { onConflict: 'id' },
      )
  }

  // Vérifie si déjà membre de l'agence
  const { data: existing } = await admin
    .from('agency_members')
    .select('id, is_active')
    .eq('user_id', userId)
    .eq('agency_id', agencyId)
    .maybeSingle()

  if (existing) {
    // Réactiver si soft-deleted
    if (!(existing as { is_active: boolean }).is_active) {
      await db(admin)
        .from('agency_members')
        .update({ is_active: true, accepted_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('agency_id', agencyId)
    }
  } else {
    await db(admin).from('agency_members').insert({
      agency_id: agencyId,
      user_id: userId,
      role: 'client',
      accepted_at: new Date().toISOString(),
    })
  }

  revalidatePath('/clients')
  return { success: true as const }
}

// ── updateClient ─────────────────────────────────────────────────

export interface UpdateClientInput {
  fullName: string
  phone?: string
  contactMethod: ContactMethod
}

export async function updateClient(
  clientId: string,
  input: UpdateClientInput,
): Promise<ClientActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const { admin } = auth

  const { error } = await db(admin)
    .from('profiles')
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      contact_method: input.contactMethod,
    })
    .eq('id', clientId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
  return { success: true }
}

// ── deleteClient (soft delete) ────────────────────────────────────

export async function deleteClient(clientId: string): Promise<ClientActionResult> {
  const auth = await requireAdmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const { admin, member } = auth

  const { error } = await db(admin)
    .from('agency_members')
    .update({ is_active: false })
    .eq('user_id', clientId)
    .eq('agency_id', member.agency_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/clients')
  return { success: true }
}

// ── getClientProjects ─────────────────────────────────────────────

export interface ClientProject extends Pick<
  Project,
  'id' | 'name' | 'status' | 'progress' | 'share_token' | 'created_at' | 'updated_at'
> {}

export async function getClientProjects(clientId: string): Promise<ClientProject[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('projects')
    .select('id, name, status, progress, share_token, created_at, updated_at')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  return (data as ClientProject[] | null) ?? []
}

// ── getClientsWithStats ───────────────────────────────────────────
// Fetch tous les clients actifs de l'agence avec leurs stats

export interface ClientWithStats {
  userId: string
  memberId: string
  joinedAt: string
  fullName: string
  email: string
  activeProjects: number
  totalProjects: number
  lastProjectName: string | null
}

export async function getClientsWithStats(agencyId: string): Promise<ClientWithStats[]> {
  const supabase = createClient()

  // 1. Membres clients actifs
  const { data: members } = await supabase
    .from('agency_members')
    .select('id, user_id, accepted_at')
    .eq('agency_id', agencyId)
    .eq('role', 'client')
    .eq('is_active', true)
    .order('accepted_at', { ascending: false })

  if (!members?.length) return []

  const userIds = (members as { id: string; user_id: string; accepted_at: string }[]).map(
    (m) => m.user_id,
  )

  // 2. Profils
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', userIds)

  const profileMap = new Map<string, Pick<Profile, 'id' | 'full_name' | 'email'>>()
  ;(profiles as Pick<Profile, 'id' | 'full_name' | 'email'>[] | null)?.forEach((p) =>
    profileMap.set(p.id, p),
  )

  // 3. Projets par client
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, status, client_id')
    .in('client_id', userIds)

  const projectsByClient = new Map<string, { name: string; active: boolean }[]>()
  ;(projects as { id: string; name: string; status: string; client_id: string }[] | null)?.forEach(
    (p) => {
      const list = projectsByClient.get(p.client_id) ?? []
      list.push({ name: p.name, active: p.status === 'active' })
      projectsByClient.set(p.client_id, list)
    },
  )

  return (members as { id: string; user_id: string; accepted_at: string }[])
    .map((m) => {
      const profile = profileMap.get(m.user_id)
      if (!profile) return null

      const projs = projectsByClient.get(m.user_id) ?? []
      const active = projs.filter((p) => p.active).length
      const lastProject = projs[0]?.name ?? null

      return {
        userId: m.user_id,
        memberId: m.id,
        joinedAt: m.accepted_at,
        fullName: profile.full_name,
        email: profile.email,
        activeProjects: active,
        totalProjects: projs.length,
        lastProjectName: lastProject,
      }
    })
    .filter(Boolean) as ClientWithStats[]
}
