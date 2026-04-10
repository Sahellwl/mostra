import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/helpers'
import { getCurrentMember } from '@/lib/supabase/queries'
import DraggablePhaseList from '@/components/settings/DraggablePhaseList'
import type { PhaseTemplate } from '@/lib/types'

export default async function PipelineSettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const memberData = await getCurrentMember(supabase, user.id)
  if (!memberData) redirect('/login')

  const { member } = memberData
  const isAdmin = member.role === 'super_admin' || member.role === 'agency_admin'
  if (!isAdmin) redirect('/dashboard')

  // Fetch les templates actifs (is_default = true), triés par sort_order
  const { data: rawTemplates } = await db(supabase)
    .from('phase_templates')
    .select('id, agency_id, name, slug, icon, sort_order, is_default, sub_phases, created_at')
    .eq('agency_id', member.agency_id)
    .eq('is_default', true)
    .order('sort_order', { ascending: true })

  const templates: PhaseTemplate[] = (rawTemplates ?? []) as PhaseTemplate[]

  return (
    <div className="max-w-2xl">
      <DraggablePhaseList initialTemplates={templates} />
    </div>
  )
}
