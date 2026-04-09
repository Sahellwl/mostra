'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ClientLogout() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="
        text-xs text-[#666666] hover:text-[#00D76B] transition-colors
        px-3 py-1.5 rounded-lg border border-[#2a2a2a] hover:border-[#00D76B]/30
      "
    >
      Déconnexion
    </button>
  )
}
