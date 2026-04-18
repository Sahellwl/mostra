import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember } from '@/lib/supabase/queries'
import OnboardingClient from './OnboardingClient'

export default async function OnboardingPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Non authentifié → login
  if (!user) redirect('/login')

  // Déjà membre → dashboard approprié
  const memberData = await getCurrentMember(supabase, user.id)
  if (memberData?.member) {
    const { role } = memberData.member
    if (role === 'super_admin') redirect('/admin')
    if (role === 'client') redirect('/client/dashboard')
    redirect('/dashboard')
  }

  return <OnboardingClient />
}
