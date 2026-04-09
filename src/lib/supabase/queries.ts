import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'
import type {
  ActivityLog,
  Agency,
  AgencyMember,
  Comment,
  PhaseFile,
  PhaseTemplate,
  Profile,
  Project,
  ProjectPhase,
  ProjectSummary,
  UserRole,
} from '@/lib/types'

type Client = SupabaseClient<Database>

// ─────────────────────────────────────────────────────────────────
// Membre courant + agence
// ─────────────────────────────────────────────────────────────────

export async function getCurrentMember(supabase: Client, userId: string) {
  const { data: rawMember } = await supabase
    .from('agency_members')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('invited_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const member = rawMember as AgencyMember | null
  if (!member) return null

  const { data: rawAgency } = await supabase
    .from('agencies')
    .select('*')
    .eq('id', member.agency_id)
    .maybeSingle()

  const agency = rawAgency as Agency | null

  return { member, agency }
}

// ─────────────────────────────────────────────────────────────────
// Stats dashboard
// ─────────────────────────────────────────────────────────────────

export async function getProjectStats(supabase: Client, agencyId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('agency_id', agencyId)

  if (error || !data) return { total: 0, active: 0, completed: 0 }

  const projects = data as Project[]
  return {
    total:     projects.length,
    active:    projects.filter((p) => p.status === 'active').length,
    completed: projects.filter((p) => p.status === 'completed').length,
  }
}

// ─────────────────────────────────────────────────────────────────
// Liste des projets (dashboard)
// ─────────────────────────────────────────────────────────────────

type ProjectRow = Project & {
  project_phases: ProjectPhase[]
}

export async function getProjects(
  supabase: Client,
  agencyId: string,
): Promise<ProjectSummary[]> {
  const { data: rawProjects, error } = await supabase
    .from('projects')
    .select('*, project_phases(*)')
    .eq('agency_id', agencyId)
    .order('updated_at', { ascending: false })

  if (error || !rawProjects) return []

  const projects = rawProjects as unknown as ProjectRow[]

  // Collect client profile IDs
  const clientIds = [...new Set(
    projects.map((p) => p.client_id).filter(Boolean) as string[]
  )]

  // Fetch client profiles separately
  const clientMap = new Map<string, Pick<Profile, 'id' | 'full_name' | 'avatar_url'>>()
  if (clientIds.length > 0) {
    const { data: rawProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', clientIds)

    const profiles = rawProfiles as Profile[] | null
    profiles?.forEach((p) => clientMap.set(p.id, { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url }))
  }

  return projects.map((project) => {
    const phases = [...project.project_phases].sort(
      (a, b) => a.sort_order - b.sort_order,
    )

    // Current phase = first non-completed/approved, or last phase if all done
    const currentPhase =
      phases.find((ph) => ph.status !== 'completed' && ph.status !== 'approved') ??
      phases[phases.length - 1] ??
      null

    const client = project.client_id ? (clientMap.get(project.client_id) ?? null) : null

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      progress: project.progress,
      current_phase: currentPhase,
      client,
      updated_at: project.updated_at,
    }
  })
}

// ─────────────────────────────────────────────────────────────────
// Membres d'une agence avec leur profil (pour les dropdowns)
// ─────────────────────────────────────────────────────────────────

export interface MemberWithProfile {
  memberId: string
  userId: string
  role: UserRole
  profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>
}

export async function getAgencyMembersWithProfiles(
  supabase: Client,
  agencyId: string,
  roles: UserRole[],
): Promise<MemberWithProfile[]> {
  const { data: members } = await supabase
    .from('agency_members')
    .select('*')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .in('role', roles)

  if (!members?.length) return []

  const userIds = (members as AgencyMember[]).map((m) => m.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .in('id', userIds)

  const profileMap = new Map<string, Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>>()
  ;(profiles as Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>[] | null)?.forEach(
    (p) => profileMap.set(p.id, p),
  )

  return (members as AgencyMember[])
    .map((m) => {
      const profile = profileMap.get(m.user_id)
      if (!profile) return null
      return { memberId: m.id, userId: m.user_id, role: m.role, profile }
    })
    .filter(Boolean) as MemberWithProfile[]
}

// ─────────────────────────────────────────────────────────────────
// Phase templates d'une agence
// ─────────────────────────────────────────────────────────────────

export async function getPhaseTemplates(
  supabase: Client,
  agencyId: string,
): Promise<PhaseTemplate[]> {
  const { data } = await supabase
    .from('phase_templates')
    .select('*')
    .eq('agency_id', agencyId)
    .order('sort_order', { ascending: true })

  return (data as PhaseTemplate[] | null) ?? []
}

// ─────────────────────────────────────────────────────────────────
// Détail complet d'un projet (page admin)
// ─────────────────────────────────────────────────────────────────

export interface CommentWithDetails extends Comment {
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
  /** Nom de la phase parente (pour le contexte sur la page projet) */
  phase_name: string | null
}

export interface ActivityWithUser extends ActivityLog {
  user: Pick<Profile, 'id' | 'full_name'> | null
}

export interface ProjectDetailData {
  project: Project
  client: Profile | null
  projectManager: Profile | null
  phases: ProjectPhase[]
  filesByPhase: Record<string, PhaseFile[]>
  comments: CommentWithDetails[]
  activity: ActivityWithUser[]
}

export async function getProjectDetail(
  supabase: Client,
  projectId: string,
): Promise<ProjectDetailData | null> {
  // 1. Project
  const { data: rawProject } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .maybeSingle()

  const project = rawProject as Project | null
  if (!project) return null

  // 2. Phases (ordonnées)
  const { data: rawPhases } = await supabase
    .from('project_phases')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  const phases = (rawPhases as ProjectPhase[] | null) ?? []

  // 2b. Fichiers par phase (ordonnés par version décroissante)
  const filesByPhase: Record<string, PhaseFile[]> = {}
  if (phases.length > 0) {
    const phaseIds = phases.map((p) => p.id)
    const { data: phaseFiles } = await supabase
      .from('phase_files')
      .select('*')
      .in('phase_id', phaseIds)
      .order('version', { ascending: false })
    ;(phaseFiles as PhaseFile[] | null)?.forEach((f) => {
      if (!filesByPhase[f.phase_id]) filesByPhase[f.phase_id] = []
      filesByPhase[f.phase_id].push(f)
    })
  }

  // 3. Profils client + PM en une seule requête
  const profileIds = [project.client_id, project.project_manager_id].filter(Boolean) as string[]
  const profileMap = new Map<string, Profile>()
  if (profileIds.length > 0) {
    const { data: rawProfiles } = await supabase
      .from('profiles').select('*').in('id', profileIds)
    ;(rawProfiles as Profile[] | null)?.forEach((p) => profileMap.set(p.id, p))
  }

  const client = project.client_id ? (profileMap.get(project.client_id) ?? null) : null
  const projectManager = project.project_manager_id
    ? (profileMap.get(project.project_manager_id) ?? null)
    : null

  // 4. Commentaires du projet (avec phase_id optionnel)
  const phaseNameMap = new Map(phases.map((ph) => [ph.id, ph.name]))

  const { data: rawComments } = await supabase
    .from('comments')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(100)

  const comments = (rawComments as Comment[] | null) ?? []

  // Auteurs des commentaires
  const authorIds = [...new Set(comments.map((c) => c.user_id).filter(Boolean))]
  const authorMap = new Map<string, Pick<Profile, 'id' | 'full_name' | 'avatar_url'>>()
  if (authorIds.length > 0) {
    const { data: rawAuthors } = await supabase
      .from('profiles').select('id, full_name, avatar_url').in('id', authorIds)
    ;(rawAuthors as Pick<Profile, 'id' | 'full_name' | 'avatar_url'>[] | null)
      ?.forEach((p) => authorMap.set(p.id, p))
  }

  // 5. Activity logs (15 dernières)
  const { data: rawActivity } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(15)

  const activity = (rawActivity as ActivityLog[] | null) ?? []

  // Profils des acteurs (récupère ceux qu'on n'a pas encore)
  const actorIds = [...new Set(activity.map((a) => a.user_id).filter(Boolean) as string[])]
  const actorMap = new Map<string, Pick<Profile, 'id' | 'full_name'>>()
  const missingActorIds = actorIds.filter((id) => !profileMap.has(id) && !authorMap.has(id))
  if (missingActorIds.length > 0) {
    const { data: rawActors } = await supabase
      .from('profiles').select('id, full_name').in('id', missingActorIds)
    ;(rawActors as Pick<Profile, 'id' | 'full_name'>[] | null)?.forEach((p) =>
      actorMap.set(p.id, p),
    )
  }

  const getActor = (id: string | null) =>
    id ? (profileMap.get(id) ?? actorMap.get(id) ?? null) : null

  return {
    project,
    client,
    projectManager,
    phases,
    filesByPhase,
    comments: comments.map((c) => ({
      ...c,
      author:     authorMap.get(c.user_id) ?? null,
      phase_name: c.phase_id ? (phaseNameMap.get(c.phase_id) ?? null) : null,
    })),
    activity: activity.map((a) => ({
      ...a,
      user: getActor(a.user_id),
    })),
  }
}
