'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  DEFAULT_FORM_TEMPLATE_NAME,
  DEFAULT_FORM_TEMPLATE_DESCRIPTION,
  DEFAULT_FORM_QUESTIONS,
} from '@/app/settings/forms/schemas'

export type AdminActionResult = { success: true } | { success: false; error: string }
export type CreateAgencyResult =
  | { success: true; agencyId: string; inviteUrl: string }
  | { success: false; error: string }

// ── Permission helper ─────────────────────────────────────────────

async function requireSuperAdmin() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Non authentifié' }

  const membership = await getCurrentMember(supabase, user.id)
  if (!membership || membership.member.role !== 'super_admin') {
    return { error: 'Accès réservé aux super admins' }
  }

  return { supabase, admin: createAdminClient(), userId: user.id }
}

// ── getGlobalStats ────────────────────────────────────────────────

export interface GlobalStats {
  agencyCount: number
  userCount: number
  activeProjectCount: number
  fileCount: number
}

export async function getGlobalStats(): Promise<GlobalStats> {
  const admin = createAdminClient()

  const [agencies, members, projects, files] = await Promise.all([
    db(admin).from('agencies').select('id', { count: 'exact', head: true }),
    db(admin)
      .from('agency_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('is_active', true),
    db(admin).from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    db(admin).from('phase_files').select('id', { count: 'exact', head: true }),
  ])

  return {
    agencyCount: agencies.count ?? 0,
    userCount: members.count ?? 0,
    activeProjectCount: projects.count ?? 0,
    fileCount: files.count ?? 0,
  }
}

// ── getAgenciesWithStats ──────────────────────────────────────────

export interface AgencyWithStats {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  created_at: string
  memberCount: number
  activeProjects: number
}

export async function getAgenciesWithStats(): Promise<AgencyWithStats[]> {
  const admin = createAdminClient()

  const { data: agencies } = await db(admin)
    .from('agencies')
    .select('id, name, slug, logo_url, primary_color, created_at')
    .order('created_at', { ascending: false })

  if (!agencies?.length) return []

  const results = await Promise.all(
    (
      agencies as {
        id: string
        name: string
        slug: string
        logo_url: string | null
        primary_color: string
        created_at: string
      }[]
    ).map(async (a) => {
      const [members, projects] = await Promise.all([
        db(admin)
          .from('agency_members')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', a.id)
          .eq('is_active', true),
        db(admin)
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', a.id)
          .eq('status', 'active'),
      ])
      return {
        ...a,
        memberCount: members.count ?? 0,
        activeProjects: projects.count ?? 0,
      }
    }),
  )

  return results
}

// ── getAgencyStats ────────────────────────────────────────────────

export interface AgencyStats {
  memberCount: number
  projectCount: number
  activeProjects: number
  fileCount: number
}

export async function getAgencyStats(agencyId: string): Promise<AgencyStats> {
  const admin = createAdminClient()

  // Récupérer les project_ids de l'agence
  const { data: projs } = await db(admin)
    .from('projects')
    .select('id, status')
    .eq('agency_id', agencyId)

  const projectIds = (projs ?? []).map((p: { id: string }) => p.id)
  const activeCount = (projs ?? []).filter((p: { status: string }) => p.status === 'active').length

  const [members, phases] = await Promise.all([
    db(admin)
      .from('agency_members')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('is_active', true),
    projectIds.length > 0
      ? db(admin).from('project_phases').select('id').in('project_id', projectIds)
      : Promise.resolve({ data: [] }),
  ])

  const phaseIds = ((phases as { data: { id: string }[] | null }).data ?? []).map(
    (p: { id: string }) => p.id,
  )
  let fileCount = 0
  if (phaseIds.length > 0) {
    const { count } = await db(admin)
      .from('phase_files')
      .select('id', { count: 'exact', head: true })
      .in('phase_id', phaseIds)
    fileCount = count ?? 0
  }

  return {
    memberCount: members.count ?? 0,
    projectCount: (projs ?? []).length,
    activeProjects: activeCount,
    fileCount,
  }
}

// ── createAgency ─────────────────────────────────────────────────

export interface CreateAgencyInput {
  name: string
  slug: string
  adminEmail: string
  adminName: string
  primaryColor: string
}

const DEFAULT_TEMPLATES = [
  { name: 'Script', slug: 'script', icon: 'FileText', sort_order: 1 },
  { name: 'Design', slug: 'design', icon: 'Palette', sort_order: 2 },
  { name: 'Animation', slug: 'animation', icon: 'Film', sort_order: 3 },
  { name: 'Render', slug: 'render', icon: 'MonitorPlay', sort_order: 4 },
]

export async function createAgency(input: CreateAgencyInput): Promise<CreateAgencyResult> {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return { success: false, error: auth.error as string }
  const { admin } = auth

  const name = input.name.trim()
  const slug = input.slug.trim().toLowerCase()
  const email = input.adminEmail.trim().toLowerCase()

  // Vérifier unicité du slug
  const { data: existing } = await db(admin)
    .from('agencies')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return { success: false, error: `Le slug "${slug}" est déjà utilisé.` }

  // Créer l'agence
  const { data: agency, error: agencyErr } = await db(admin)
    .from('agencies')
    .insert({ name, slug, primary_color: input.primaryColor || '#EF4444' })
    .select('id')
    .single()

  if (agencyErr || !agency) {
    console.error('[createAgency] agency insert:', agencyErr)
    return { success: false, error: agencyErr?.message ?? 'Erreur création agence' }
  }

  const agencyId = agency.id

  // Créer les phase templates par défaut
  await db(admin)
    .from('phase_templates')
    .insert(DEFAULT_TEMPLATES.map((t) => ({ ...t, agency_id: agencyId, is_default: true })))

  // Créer le template de formulaire par défaut
  await db(admin).from('form_templates').insert({
    agency_id: agencyId,
    name: DEFAULT_FORM_TEMPLATE_NAME,
    description: DEFAULT_FORM_TEMPLATE_DESCRIPTION,
    questions: DEFAULT_FORM_QUESTIONS,
    is_default: true,
  })

  // Créer ou récupérer le compte admin
  const {
    data: { users: allUsers },
  } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing_user = allUsers.find((u) => u.email === email)

  let adminUserId: string

  if (existing_user) {
    adminUserId = existing_user.id
    await db(admin)
      .from('profiles')
      .upsert(
        { id: adminUserId, email, full_name: input.adminName.trim(), contact_method: 'email' },
        { onConflict: 'id' },
      )
  } else {
    const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: input.adminName.trim() },
    })
    if (createErr || !newUser.user) {
      console.error('[createAgency] createUser:', createErr)
      return { success: false, error: createErr?.message ?? 'Erreur création utilisateur' }
    }
    adminUserId = newUser.user.id
    await db(admin)
      .from('profiles')
      .upsert(
        { id: adminUserId, email, full_name: input.adminName.trim(), contact_method: 'email' },
        { onConflict: 'id' },
      )
  }

  // Ajouter en tant qu'agency_admin (ou réactiver)
  const { data: existingMembership } = await db(admin)
    .from('agency_members')
    .select('id')
    .eq('user_id', adminUserId)
    .eq('agency_id', agencyId)
    .maybeSingle()

  if (existingMembership) {
    await db(admin)
      .from('agency_members')
      .update({ role: 'agency_admin', is_active: true })
      .eq('id', existingMembership.id)
  } else {
    await db(admin).from('agency_members').insert({
      agency_id: agencyId,
      user_id: adminUserId,
      role: 'agency_admin',
      accepted_at: new Date().toISOString(),
    })
  }

  // Créer une invitation pour que l'admin puisse définir son mot de passe
  const { data: invitation } = await db(admin)
    .from('invitations')
    .insert({
      agency_id: agencyId,
      email,
      role: 'agency_admin',
      invited_by: adminUserId, // self-invite technique
    })
    .select('token')
    .single()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const inviteUrl = invitation?.token ? `${appUrl}/invite/${invitation.token}` : ''

  revalidatePath('/admin')
  revalidatePath('/admin/agencies')
  return { success: true, agencyId, inviteUrl }
}

// ── updateAgency ──────────────────────────────────────────────────

export async function updateAgency(
  agencyId: string,
  input: { name?: string; slug?: string; primary_color?: string },
): Promise<AdminActionResult> {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return { success: false, error: auth.error as string }
  const { admin } = auth

  const { error } = await db(admin)
    .from('agencies')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', agencyId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/agencies')
  revalidatePath(`/admin/agencies/${agencyId}`)
  return { success: true }
}

// ── deleteAgency ──────────────────────────────────────────────────
// Confirmation forte : l'appelant doit passer le nom exact de l'agence.

export async function deleteAgency(
  agencyId: string,
  agencyName: string,
  typedConfirm: string,
): Promise<AdminActionResult> {
  if (typedConfirm.trim() !== agencyName.trim()) {
    return { success: false, error: "Le nom saisi ne correspond pas au nom de l'agence." }
  }

  const auth = await requireSuperAdmin()
  if ('error' in auth) return { success: false, error: auth.error as string }
  const { admin } = auth

  // Vérifier que l'agence existe
  const { data: agency } = await db(admin)
    .from('agencies')
    .select('id, name')
    .eq('id', agencyId)
    .maybeSingle()
  if (!agency) return { success: false, error: 'Agence introuvable.' }

  // Supprimer l'agence (cascade : projects → phases → files → comments → logs, members, templates, invitations)
  const { error } = await db(admin).from('agencies').delete().eq('id', agencyId)
  if (error) {
    console.error('[deleteAgency] error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin')
  revalidatePath('/admin/agencies')
  return { success: true }
}

// ── getRecentActivity ─────────────────────────────────────────────

export interface CrossAgencyActivity {
  id: string
  action: string
  created_at: string
  project_name: string
  agency_name: string
  user_name: string | null
}

export async function getRecentActivity(limit = 10): Promise<CrossAgencyActivity[]> {
  const admin = createAdminClient()

  const { data: logs } = await db(admin)
    .from('activity_logs')
    .select(
      `
      id, action, created_at,
      projects!inner ( name, agencies!inner ( name ) ),
      profiles ( full_name )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((logs ?? []) as any[]).map((l: any) => ({
    id: l.id,
    action: l.action,
    created_at: l.created_at,
    project_name: l.projects?.name ?? '—',
    agency_name: l.projects?.agencies?.name ?? '—',
    user_name: l.profiles?.full_name ?? null,
  }))
}

// ── getProjectsByAgencyThisMonth ──────────────────────────────────

export interface AgencyProjectCount {
  agencyName: string
  count: number
}

export async function getProjectsByAgencyThisMonth(): Promise<AgencyProjectCount[]> {
  const admin = createAdminClient()

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const { data: projects } = await db(admin)
    .from('projects')
    .select('id, agencies!inner ( name )')
    .gte('created_at', startOfMonth.toISOString())

  const counts: Record<string, number> = {}
  for (const p of (projects ?? []) as any[]) {
    const name = p.agencies?.name ?? 'Inconnu'
    counts[name] = (counts[name] ?? 0) + 1
  }

  return Object.entries(counts)
    .map(([agencyName, count]) => ({ agencyName, count }))
    .sort((a, b) => b.count - a.count)
}

// ═══════════════════════════════════════════════════════════════════
// ANALYTICS
// ═══════════════════════════════════════════════════════════════════

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '12m' | 'all'
type Granularity = 'day' | 'week' | 'month'

export interface TimeSeries {
  label: string
  count: number
}

export interface AnalyticsData {
  projectsOverTime: TimeSeries[]
  usersOverTime: TimeSeries[]
  projectsByAgency: { name: string; count: number }[]
  projectsByStatus: { name: string; value: number }[]
  kpis: {
    avgCompletion: number
    avgDurationDays: number | null
    avgPhasesPerProject: number
    totalFileSizeGB: number
  }
}

function periodToStartDate(period: AnalyticsPeriod): Date | null {
  const now = new Date()
  if (period === '7d') return new Date(now.getTime() - 7 * 86400000)
  if (period === '30d') return new Date(now.getTime() - 30 * 86400000)
  if (period === '90d') return new Date(now.getTime() - 90 * 86400000)
  if (period === '12m') {
    const d = new Date(now)
    d.setFullYear(d.getFullYear() - 1)
    return d
  }
  return null
}

function toGranularity(period: AnalyticsPeriod): Granularity {
  if (period === '7d' || period === '30d') return 'day'
  if (period === '90d') return 'week'
  return 'month'
}

function toIsoKey(date: Date, gran: Granularity): string {
  if (gran === 'day') return date.toISOString().slice(0, 10)
  if (gran === 'week') {
    const d = new Date(date)
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)) // lundi UTC
    return d.toISOString().slice(0, 10)
  }
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function isoKeyToLabel(key: string, gran: Granularity): string {
  if (gran === 'month') {
    const [y, m] = key.split('-')
    return format(new Date(parseInt(y), parseInt(m) - 1, 1), 'MMM yy', { locale: fr })
  }
  return format(new Date(key + 'T12:00:00Z'), 'dd MMM', { locale: fr })
}

function buildTimeSeries(period: AnalyticsPeriod, dates: string[]): TimeSeries[] {
  const gran = toGranularity(period)
  const start = periodToStartDate(period)
  const now = new Date()
  const buckets = new Map<string, number>()

  if (gran === 'day') {
    const days = period === '7d' ? 7 : 30
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000)
      buckets.set(d.toISOString().slice(0, 10), 0)
    }
  } else if (gran === 'week') {
    for (let i = 12; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 86400000)
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
      buckets.set(d.toISOString().slice(0, 10), 0)
    }
  } else {
    const months = period === 'all' ? 24 : 12
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
      buckets.set(d.toISOString().slice(0, 7), 0)
    }
  }

  for (const dateStr of dates) {
    if (start && new Date(dateStr) < start) continue
    const key = toIsoKey(new Date(dateStr), gran)
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  return Array.from(buckets.entries()).map(([key, count]) => ({
    label: isoKeyToLabel(key, gran),
    count,
  }))
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
  on_hold: 'En pause',
}

export async function getAnalytics(period: AnalyticsPeriod = '12m'): Promise<AnalyticsData> {
  const admin = createAdminClient()
  const start = periodToStartDate(period)

  // Projets dans la période
  let pq = db(admin)
    .from('projects')
    .select('id, status, progress, created_at, updated_at, agency_id')
  if (start) pq = pq.gte('created_at', start.toISOString())
  const { data: rawProjects } = await pq

  const projects = (rawProjects ?? []) as {
    id: string
    status: string
    progress: number
    created_at: string
    updated_at: string
    agency_id: string
  }[]

  // Agences (pour les noms)
  const { data: rawAgencies } = await db(admin).from('agencies').select('id, name')
  const agencyNames = new Map(
    ((rawAgencies ?? []) as { id: string; name: string }[]).map((a) => [a.id, a.name]),
  )

  // Membres dans la période (pour usersOverTime — hors clients, dédupliqués)
  let mq = db(admin)
    .from('agency_members')
    .select('user_id, invited_at')
    .not('role', 'eq', 'client')
  if (start) mq = mq.gte('invited_at', start.toISOString())
  const { data: rawMembers } = await mq

  // Déduplique par user_id → garde la date la plus ancienne
  const userDatesMap = new Map<string, string>()
  for (const m of (rawMembers ?? []) as { user_id: string; invited_at: string }[]) {
    const prev = userDatesMap.get(m.user_id)
    if (!prev || m.invited_at < prev) userDatesMap.set(m.user_id, m.invited_at)
  }

  // Taille totale des fichiers (toujours global)
  const { data: rawFiles } = await db(admin).from('phase_files').select('file_size')
  const totalFileSizeGB =
    Math.round(
      (((rawFiles ?? []) as { file_size: number | null }[]).reduce(
        (s, f) => s + (f.file_size ?? 0),
        0,
      ) /
        (1024 * 1024 * 1024)) *
        100,
    ) / 100

  // Phases et projets globaux (pour avgPhases)
  const [{ count: totalProjectCount }, { count: totalPhaseCount }] = await Promise.all([
    db(admin).from('projects').select('id', { count: 'exact', head: true }),
    db(admin).from('project_phases').select('id', { count: 'exact', head: true }),
  ])

  // ── Time series ────────────────────────────────────────────────
  const projectsOverTime = buildTimeSeries(
    period,
    projects.map((p) => p.created_at),
  )
  const usersOverTime = buildTimeSeries(period, Array.from(userDatesMap.values()))

  // ── Par agence (top 10) ────────────────────────────────────────
  const countByAgency: Record<string, number> = {}
  for (const p of projects) {
    const name = agencyNames.get(p.agency_id) ?? 'Inconnu'
    countByAgency[name] = (countByAgency[name] ?? 0) + 1
  }
  const projectsByAgency = Object.entries(countByAgency)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // ── Par statut ─────────────────────────────────────────────────
  const countByStatus: Record<string, number> = {}
  for (const p of projects) {
    countByStatus[p.status] = (countByStatus[p.status] ?? 0) + 1
  }
  const projectsByStatus = Object.entries(countByStatus).map(([status, value]) => ({
    name: STATUS_LABELS[status] ?? status,
    value,
  }))

  // ── KPIs ───────────────────────────────────────────────────────
  const avgCompletion =
    projects.length > 0
      ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
      : 0

  const completed = projects.filter((p) => p.status === 'completed')
  let avgDurationDays: number | null = null
  if (completed.length > 0) {
    const total = completed.reduce(
      (s, p) => s + (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()),
      0,
    )
    avgDurationDays = Math.round(total / completed.length / 86400000)
  }

  const avgPhasesPerProject =
    totalProjectCount && totalPhaseCount
      ? Math.round((totalPhaseCount / totalProjectCount) * 10) / 10
      : 0

  return {
    projectsOverTime,
    usersOverTime,
    projectsByAgency,
    projectsByStatus,
    kpis: { avgCompletion, avgDurationDays, avgPhasesPerProject, totalFileSizeGB },
  }
}

// ═══════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════

export interface UserRow {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  createdAt: string
  isActive: boolean
  agencies: { id: string; name: string; role: string; isActive: boolean }[]
}

export interface GetUsersResult {
  users: UserRow[]
  total: number
}

export interface UserFilters {
  search?: string
  role?: string
  agencyId?: string
  page?: number
}

import { USERS_PER_PAGE } from './constants'

export async function getUsers(filters: UserFilters = {}): Promise<GetUsersResult> {
  const admin = createAdminClient()
  const { search = '', role, agencyId, page = 0 } = filters

  let q = db(admin)
    .from('agency_members')
    .select(
      `
      id, role, is_active, invited_at, user_id, agency_id,
      profiles!inner ( id, email, full_name, avatar_url, created_at ),
      agencies!inner ( id, name )
    `,
    )
    .order('invited_at', { ascending: false })

  if (role) q = q.eq('role', role)
  if (agencyId) q = q.eq('agency_id', agencyId)

  const { data: rows } = await q

  // Regroupe par user_id
  const userMap = new Map<string, UserRow>()
  for (const m of (rows ?? []) as any[]) {
    const uid = m.profiles.id as string
    if (!userMap.has(uid)) {
      userMap.set(uid, {
        id: uid,
        email: m.profiles.email,
        fullName: m.profiles.full_name,
        avatarUrl: m.profiles.avatar_url,
        createdAt: m.profiles.created_at,
        isActive: false,
        agencies: [],
      })
    }
    const user = userMap.get(uid)!
    user.agencies.push({
      id: m.agencies.id,
      name: m.agencies.name,
      role: m.role,
      isActive: m.is_active,
    })
    if (m.is_active) user.isActive = true
  }

  let users = Array.from(userMap.values())

  if (search) {
    const q = search.toLowerCase()
    users = users.filter(
      (u) => u.email.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q),
    )
  }

  users.sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
    return a.fullName.localeCompare(b.fullName, 'fr')
  })

  const total = users.length
  const paginated = users.slice(page * USERS_PER_PAGE, (page + 1) * USERS_PER_PAGE)
  return { users: paginated, total }
}

export interface UserMembership {
  membershipId: string
  agencyId: string
  agencyName: string
  role: string
  isActive: boolean
  joinedAt: string | null
}

export interface UserProjectRow {
  id: string
  name: string
  status: string
  progress: number
  agencyName: string
  asRole: 'pm' | 'client'
  createdAt: string
}

export interface UserDetails {
  id: string
  email: string
  fullName: string
  avatarUrl: string | null
  createdAt: string
  lastSignIn: string | null
  isActive: boolean
  memberships: UserMembership[]
  projects: UserProjectRow[]
  recentActivity: { id: string; action: string; projectName: string; createdAt: string }[]
}

export async function getUserDetails(userId: string): Promise<UserDetails | null> {
  const admin = createAdminClient()

  const [profileRes, memberRes, pmRes, clientRes, activityRes, authRes] = await Promise.all([
    db(admin).from('profiles').select('*').eq('id', userId).maybeSingle(),
    db(admin)
      .from('agency_members')
      .select('id, role, is_active, accepted_at, agency_id, agencies!inner(id, name)')
      .eq('user_id', userId)
      .order('accepted_at', { ascending: false }),
    db(admin)
      .from('projects')
      .select('id, name, status, progress, created_at, agency_id, agencies!inner(name)')
      .eq('project_manager_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    db(admin)
      .from('projects')
      .select('id, name, status, progress, created_at, agency_id, agencies!inner(name)')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    db(admin)
      .from('activity_logs')
      .select('id, action, created_at, projects!inner(name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    admin.auth.admin.getUserById(userId),
  ])

  const profile = profileRes.data as {
    id: string
    email: string
    full_name: string
    avatar_url: string | null
    created_at: string
  } | null
  if (!profile) return null

  const allProjects: UserProjectRow[] = [
    ...((pmRes.data ?? []) as any[]).map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      progress: p.progress,
      agencyName: p.agencies.name,
      asRole: 'pm' as const,
      createdAt: p.created_at,
    })),
    ...((clientRes.data ?? []) as any[]).map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      progress: p.progress,
      agencyName: p.agencies.name,
      asRole: 'client' as const,
      createdAt: p.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15)

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    avatarUrl: profile.avatar_url,
    createdAt: profile.created_at,
    lastSignIn: authRes.data?.user?.last_sign_in_at ?? null,
    isActive: ((memberRes.data ?? []) as any[]).some((m: any) => m.is_active),
    memberships: ((memberRes.data ?? []) as any[]).map((m: any) => ({
      membershipId: m.id,
      agencyId: m.agency_id,
      agencyName: m.agencies.name,
      role: m.role,
      isActive: m.is_active,
      joinedAt: m.accepted_at,
    })),
    projects: allProjects,
    recentActivity: ((activityRes.data ?? []) as any[]).map((a: any) => ({
      id: a.id,
      action: a.action,
      projectName: a.projects?.name ?? '—',
      createdAt: a.created_at,
    })),
  }
}

// ── deactivateUser / reactivateUser ───────────────────────────────

export async function deactivateUser(userId: string): Promise<AdminActionResult> {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return { success: false, error: auth.error as string }

  const { error } = await db(auth.admin)
    .from('agency_members')
    .update({ is_active: false })
    .eq('user_id', userId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}`)
  return { success: true }
}

export async function reactivateUser(userId: string): Promise<AdminActionResult> {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return { success: false, error: auth.error as string }

  const { error } = await db(auth.admin)
    .from('agency_members')
    .update({ is_active: true })
    .eq('user_id', userId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/users')
  revalidatePath(`/admin/users/${userId}`)
  return { success: true }
}

// ── resetUserPassword ─────────────────────────────────────────────

export type ResetPasswordResult =
  | { success: true; resetLink: string }
  | { success: false; error: string }

export async function resetUserPassword(userId: string): Promise<ResetPasswordResult> {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return { success: false, error: auth.error as string }

  const { data: profile } = await db(auth.admin)
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) return { success: false, error: 'Utilisateur introuvable.' }

  const { data, error } = await auth.admin.auth.admin.generateLink({
    type: 'recovery',
    email: (profile as { email: string }).email,
  })

  if (error || !data) return { success: false, error: error?.message ?? 'Erreur génération lien' }
  return { success: true, resetLink: data.properties.action_link }
}

// ── deleteUser ────────────────────────────────────────────────────

export async function deleteUser(
  userId: string,
  userEmail: string,
  typedConfirm: string,
): Promise<AdminActionResult> {
  if (typedConfirm.trim() !== userEmail.trim()) {
    return { success: false, error: "L'email saisi ne correspond pas." }
  }

  const auth = await requireSuperAdmin()
  if ('error' in auth) return { success: false, error: auth.error as string }

  const { error } = await auth.admin.auth.admin.deleteUser(userId)
  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/users')
  return { success: true }
}

// ── updateUserRole ────────────────────────────────────────────────

export async function updateUserRole(
  userId: string,
  agencyId: string,
  newRole: string,
): Promise<AdminActionResult> {
  const auth = await requireSuperAdmin()
  if ('error' in auth) return { success: false, error: auth.error as string }

  const { error } = await db(auth.admin)
    .from('agency_members')
    .update({ role: newRole })
    .eq('user_id', userId)
    .eq('agency_id', agencyId)

  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/users/${userId}`)
  return { success: true }
}
