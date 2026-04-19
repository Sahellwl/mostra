// Server-only utility — do NOT import in client components.
// Uses the admin client to bypass RLS when creating notifications for other users.

import { createAdminClient } from '@/lib/supabase/admin'
import { db } from '@/lib/supabase/helpers'

export type NotificationType =
  | 'comment_added'
  | 'phase_approved'
  | 'revision_requested'
  | 'form_submitted'
  | 'phase_ready'
  | 'file_uploaded'
  | 'project_created'
  | 'member_joined'

export interface CreateNotificationInput {
  userId: string
  agencyId?: string | null
  projectId?: string | null
  type: NotificationType
  title: string
  message?: string | null
  link?: string | null
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const admin = createAdminClient()
    await db(admin).from('notifications').insert({
      user_id: input.userId,
      agency_id: input.agencyId ?? null,
      project_id: input.projectId ?? null,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      link: input.link ?? null,
    })
  } catch (err) {
    console.error('[createNotification] error:', err)
  }
}

export async function createNotifications(inputs: CreateNotificationInput[]): Promise<void> {
  if (inputs.length === 0) return
  try {
    const admin = createAdminClient()
    await db(admin).from('notifications').insert(
      inputs.map((input) => ({
        user_id: input.userId,
        agency_id: input.agencyId ?? null,
        project_id: input.projectId ?? null,
        type: input.type,
        title: input.title,
        message: input.message ?? null,
        link: input.link ?? null,
      })),
    )
  } catch (err) {
    console.error('[createNotifications] error:', err)
  }
}

// ── Project recipient helpers ─────────────────────────────────────

export interface ProjectRecipients {
  projectName: string
  agencyId: string
  agencyName: string
  shareToken: string | null
  clientId: string | null
  clientEmail: string | null
  projectManagerId: string | null
  adminIds: string[]
}

export async function getProjectRecipients(projectId: string): Promise<ProjectRecipients> {
  const empty: ProjectRecipients = {
    projectName: '',
    agencyId: '',
    agencyName: '',
    shareToken: null,
    clientId: null,
    clientEmail: null,
    projectManagerId: null,
    adminIds: [],
  }

  try {
    const admin = createAdminClient()

    const { data: rawProject } = await admin
      .from('projects')
      .select('id, name, agency_id, client_id, project_manager_id, share_token')
      .eq('id', projectId)
      .maybeSingle()

    const project = rawProject as {
      id: string
      name: string
      agency_id: string
      client_id: string | null
      project_manager_id: string | null
      share_token: string | null
    } | null

    if (!project) return empty

    const [agencyResult, adminsResult, clientResult] = await Promise.all([
      admin.from('agencies').select('name').eq('id', project.agency_id).maybeSingle(),
      admin
        .from('agency_members')
        .select('user_id')
        .eq('agency_id', project.agency_id)
        .eq('is_active', true)
        .in('role', ['super_admin', 'agency_admin']),
      project.client_id
        ? admin.from('profiles').select('email').eq('id', project.client_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    const agencyName = (agencyResult.data as { name: string } | null)?.name ?? ''
    const adminIds = ((adminsResult.data as { user_id: string }[] | null) ?? []).map(
      (a) => a.user_id,
    )
    const clientEmail = (clientResult.data as { email: string } | null)?.email ?? null

    return {
      projectName: project.name,
      agencyId: project.agency_id,
      agencyName,
      shareToken: project.share_token,
      clientId: project.client_id,
      clientEmail,
      projectManagerId: project.project_manager_id,
      adminIds,
    }
  } catch (err) {
    console.error('[getProjectRecipients] error:', err)
    return empty
  }
}
