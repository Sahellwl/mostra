'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import { FormTemplateSchema } from './schemas'

export type FormActionResult = { success: true; id?: string } | { success: false; error: string }

// ── Auth helper ───────────────────────────────────────────────────

async function getAdminContext() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership) return null

  const { role } = membership.member
  if (role !== 'super_admin' && role !== 'agency_admin') return null

  return { supabase, membership }
}

// ── createFormTemplate ────────────────────────────────────────────

export async function createFormTemplate(data: unknown): Promise<FormActionResult> {
  const ctx = await getAdminContext()
  if (!ctx) return { success: false, error: 'Permissions insuffisantes' }

  const parsed = FormTemplateSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: 'Données invalides' }

  const { name, description, questions } = parsed.data

  const { data: row, error } = await db(ctx.supabase)
    .from('form_templates')
    .insert({
      agency_id: ctx.membership.member.agency_id,
      name,
      description: description || null,
      questions,
      is_default: false,
    })
    .select('id')
    .single()

  if (error || !row) return { success: false, error: error?.message ?? 'Erreur inconnue' }

  revalidatePath('/settings/forms')
  return { success: true, id: (row as { id: string }).id }
}

// ── updateFormTemplate ────────────────────────────────────────────

export async function updateFormTemplate(id: string, data: unknown): Promise<FormActionResult> {
  const ctx = await getAdminContext()
  if (!ctx) return { success: false, error: 'Permissions insuffisantes' }

  const parsed = FormTemplateSchema.safeParse(data)
  if (!parsed.success) return { success: false, error: 'Données invalides' }

  const { name, description, questions } = parsed.data

  const { error } = await db(ctx.supabase)
    .from('form_templates')
    .update({ name, description: description || null, questions })
    .eq('id', id)
    .eq('agency_id', ctx.membership.member.agency_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/forms')
  revalidatePath(`/settings/forms/${id}`)
  return { success: true }
}

// ── deleteFormTemplate ────────────────────────────────────────────

export async function deleteFormTemplate(id: string): Promise<FormActionResult> {
  const ctx = await getAdminContext()
  if (!ctx) return { success: false, error: 'Permissions insuffisantes' }

  const { error } = await db(ctx.supabase)
    .from('form_templates')
    .delete()
    .eq('id', id)
    .eq('agency_id', ctx.membership.member.agency_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/forms')
  return { success: true }
}

// ── duplicateFormTemplate ─────────────────────────────────────────

export async function duplicateFormTemplate(id: string): Promise<FormActionResult> {
  const ctx = await getAdminContext()
  if (!ctx) return { success: false, error: 'Permissions insuffisantes' }

  const { data: rawTpl } = await ctx.supabase
    .from('form_templates')
    .select('name, description, questions')
    .eq('id', id)
    .eq('agency_id', ctx.membership.member.agency_id)
    .maybeSingle()

  if (!rawTpl) return { success: false, error: 'Template introuvable' }
  const tpl = rawTpl as { name: string; description: string | null; questions: unknown[] }

  const { data: row, error } = await db(ctx.supabase)
    .from('form_templates')
    .insert({
      agency_id: ctx.membership.member.agency_id,
      name: `${tpl.name} (copie)`,
      description: tpl.description,
      questions: tpl.questions,
      is_default: false,
    })
    .select('id')
    .single()

  if (error || !row) return { success: false, error: error?.message ?? 'Erreur inconnue' }

  revalidatePath('/settings/forms')
  return { success: true, id: (row as { id: string }).id }
}

// ── setDefaultFormTemplate ────────────────────────────────────────

export async function setDefaultFormTemplate(id: string): Promise<FormActionResult> {
  const ctx = await getAdminContext()
  if (!ctx) return { success: false, error: 'Permissions insuffisantes' }

  const agencyId = ctx.membership.member.agency_id

  await db(ctx.supabase)
    .from('form_templates')
    .update({ is_default: false })
    .eq('agency_id', agencyId)

  const { error } = await db(ctx.supabase)
    .from('form_templates')
    .update({ is_default: true })
    .eq('id', id)
    .eq('agency_id', agencyId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/forms')
  return { success: true }
}
