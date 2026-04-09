'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import type { PhaseTemplate } from '@/lib/types'

export type CreateProjectInput = {
  name: string
  description?: string
  clientMode: 'none' | 'existing' | 'new'
  existingClientId?: string
  newClientName?: string
  newClientEmail?: string
  projectManagerId?: string
}

export type CreateProjectResult = { data: { id: string; name: string } } | { error: string }

export async function createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
  const supabase = createClient()
  const admin = createAdminClient()

  // ── Auth ────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié.' }

  // ── Permission : admin seulement ────────────────────────────────
  const { data: rawMember } = await supabase
    .from('agency_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('invited_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!rawMember) return { error: 'Membre introuvable.' }
  const member = rawMember as { id: string; agency_id: string; role: string }

  if (member.role !== 'super_admin' && member.role !== 'agency_admin') {
    return { error: 'Seuls les admins peuvent créer des projets.' }
  }

  const agencyId = member.agency_id

  // ── Unicité du nom dans l'agence ────────────────────────────────
  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('agency_id', agencyId)
    .ilike('name', input.name.trim())
    .maybeSingle()

  if (existing) {
    return { error: 'Un projet avec ce nom existe déjà dans votre agence.' }
  }

  // ── Résolution du client ─────────────────────────────────────────
  let clientId: string | null = null

  if (input.clientMode === 'existing' && input.existingClientId) {
    clientId = input.existingClientId
  } else if (input.clientMode === 'new' && input.newClientEmail && input.newClientName) {
    const email = input.newClientEmail.trim().toLowerCase()
    const name = input.newClientName.trim()

    // Cherche si l'email existe déjà dans auth
    const {
      data: { users: allUsers },
    } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const existingAuthUser = allUsers.find((u) => u.email === email)

    if (existingAuthUser) {
      clientId = existingAuthUser.id

      // S'assurer qu'il a un profil
      await db(admin)
        .from('profiles')
        .upsert(
          { id: clientId, email, full_name: name },
          { onConflict: 'id', ignoreDuplicates: true },
        )

      // L'ajouter à l'agence s'il n'y est pas encore
      const { data: existingMembership } = await admin
        .from('agency_members')
        .select('id')
        .eq('user_id', clientId)
        .eq('agency_id', agencyId)
        .maybeSingle()

      if (!existingMembership) {
        await db(admin).from('agency_members').insert({
          agency_id: agencyId,
          user_id: clientId,
          role: 'client',
          accepted_at: new Date().toISOString(),
        })
      }
    } else {
      // Crée un nouveau user (sans mot de passe → invite flow ou magic link ultérieur)
      const { data: newUser, error: authError } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name },
      })

      if (authError || !newUser.user) {
        return {
          error: `Impossible de créer le client : ${authError?.message ?? 'erreur inconnue'}`,
        }
      }

      clientId = newUser.user.id

      // Upsert profil (le trigger handle_new_user peut avoir ou non tiré)
      await db(admin)
        .from('profiles')
        .upsert({ id: clientId, email, full_name: name }, { onConflict: 'id' })

      // Ajout en membre de l'agence
      await db(admin).from('agency_members').insert({
        agency_id: agencyId,
        user_id: clientId,
        role: 'client',
        accepted_at: new Date().toISOString(),
      })
    }
  }

  // ── Création du projet ───────────────────────────────────────────
  const { data: project, error: projError } = await db(supabase)
    .from('projects')
    .insert({
      agency_id: agencyId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      client_id: clientId,
      project_manager_id: input.projectManagerId || null,
      status: 'active',
      progress: 0,
    })
    .select('id, name')
    .single()

  if (projError || !project) {
    return { error: `Erreur lors de la création : ${projError?.message ?? 'erreur inconnue'}` }
  }

  const proj = project as { id: string; name: string }

  // ── Création des phases depuis les templates ─────────────────────
  const { data: templates } = await supabase
    .from('phase_templates')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_default', true)
    .order('sort_order', { ascending: true })

  if (templates && templates.length > 0) {
    const phases = (templates as PhaseTemplate[]).map((tpl) => ({
      project_id: proj.id,
      phase_template_id: tpl.id,
      name: tpl.name,
      slug: tpl.slug,
      sort_order: tpl.sort_order,
      status: 'pending' as const,
    }))

    await db(supabase).from('project_phases').insert(phases)
  }

  // ── Log d'activité ───────────────────────────────────────────────
  await db(supabase)
    .from('activity_logs')
    .insert({
      project_id: proj.id,
      user_id: user.id,
      action: 'project_created',
      details: { project_name: proj.name },
    })

  return { data: { id: proj.id, name: proj.name } }
}

// ── deleteProject ────────────────────────────────────────────────

export type ProjectActionResult = { success: true } | { success: false; error: string }

export async function deleteProject(projectId: string): Promise<ProjectActionResult> {
  const supabase = createClient()
  const adminClient = createAdminClient()

  // Auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié.' }

  // Membre + rôle
  const { data: rawMember } = await supabase
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('invited_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!rawMember) return { success: false, error: 'Membre introuvable.' }
  const member = rawMember as { agency_id: string; role: string }

  if (member.role !== 'super_admin' && member.role !== 'agency_admin') {
    return { success: false, error: 'Permissions insuffisantes.' }
  }

  // Vérifier que le projet appartient à l'agence du user
  const { data: project } = await db(supabase)
    .from('projects')
    .select('id, name, agency_id')
    .eq('id', projectId)
    .maybeSingle()

  if (!project) return { success: false, error: 'Projet introuvable.' }
  if (project.agency_id !== member.agency_id) {
    return { success: false, error: 'Accès refusé.' }
  }

  // Supprimer les fichiers Storage du projet (éviter les orphelins)
  // Path : project-files/{projectId}/...
  const { data: storageFiles } = await adminClient.storage
    .from('project-files')
    .list(projectId, { limit: 1000 })

  if (storageFiles && storageFiles.length > 0) {
    // list() retourne les dossiers de premier niveau (slugs de phase).
    // On doit les parcourir récursivement pour tout supprimer.
    const allPaths: string[] = []

    for (const folder of storageFiles) {
      if (folder.id === null) {
        // C'est un dossier — lister son contenu
        const { data: subFiles } = await adminClient.storage
          .from('project-files')
          .list(`${projectId}/${folder.name}`, { limit: 1000 })

        if (subFiles) {
          for (const sub of subFiles) {
            if (sub.id === null) {
              // Sous-dossier versioning (v1, v2...)
              const { data: vFiles } = await adminClient.storage
                .from('project-files')
                .list(`${projectId}/${folder.name}/${sub.name}`, { limit: 1000 })
              if (vFiles) {
                allPaths.push(
                  ...vFiles.map((f) => `${projectId}/${folder.name}/${sub.name}/${f.name}`),
                )
              }
            } else {
              allPaths.push(`${projectId}/${folder.name}/${sub.name}`)
            }
          }
        }
      } else {
        allPaths.push(`${projectId}/${folder.name}`)
      }
    }

    if (allPaths.length > 0) {
      const { error: storageErr } = await adminClient.storage.from('project-files').remove(allPaths)

      if (storageErr) {
        console.error('[deleteProject] storage cleanup error:', storageErr)
        // Non bloquant — on continue la suppression du projet
      }
    }
  }

  // Hard delete du projet (cascade FK : phases, files, comments, activity_logs)
  const { error: deleteErr } = await db(supabase)
    .from('projects')
    .delete()
    .eq('id', projectId)
    .eq('agency_id', member.agency_id)

  if (deleteErr) {
    console.error('[deleteProject] delete error:', deleteErr)
    return { success: false, error: deleteErr.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/projects')
  return { success: true }
}

// ── archiveProject ───────────────────────────────────────────────

export async function archiveProject(projectId: string): Promise<ProjectActionResult> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Non authentifié.' }

  const { data: rawMember } = await supabase
    .from('agency_members')
    .select('agency_id, role')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('invited_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!rawMember) return { success: false, error: 'Membre introuvable.' }
  const member = rawMember as { agency_id: string; role: string }

  if (member.role !== 'super_admin' && member.role !== 'agency_admin') {
    return { success: false, error: 'Permissions insuffisantes.' }
  }

  const { error } = await db(supabase)
    .from('projects')
    .update({ status: 'archived' })
    .eq('id', projectId)
    .eq('agency_id', member.agency_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
