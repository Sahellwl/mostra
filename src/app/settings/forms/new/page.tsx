import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember } from '@/lib/supabase/queries'
import FormBuilder from '@/components/settings/FormBuilder'

export const metadata = { title: 'Nouveau template — MOSTRA' }

export default async function NewFormTemplatePage() {
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

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/settings/forms"
          className="inline-flex items-center gap-1 text-xs text-[#555555] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour aux templates
        </Link>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white">Nouveau template de formulaire</h2>
        <p className="text-xs text-[#555555] mt-0.5">
          Définissez les questions qui seront posées au client lors du brief.
        </p>
      </div>

      <FormBuilder />
    </div>
  )
}
