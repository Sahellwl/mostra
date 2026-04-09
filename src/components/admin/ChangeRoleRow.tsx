'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateUserRole } from '@/app/admin/actions'

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'agency_admin', label: 'Admin' },
  { value: 'creative', label: 'Créatif' },
  { value: 'client', label: 'Client' },
]
const ROLE_COLORS: Record<string, string> = {
  super_admin: '#EF4444',
  agency_admin: '#F59E0B',
  creative: '#3B82F6',
  client: '#555577',
}

interface Props {
  userId: string
  agencyId: string
  currentRole: string
}

export default function ChangeRoleRow({ userId, agencyId, currentRole }: Props) {
  const router = useRouter()
  const [role, setRole] = useState(currentRole)
  const [isPending, start] = useTransition()

  function handleChange(newRole: string) {
    if (newRole === role) return
    setRole(newRole)
    start(async () => {
      const result = await updateUserRole(userId, agencyId, newRole)
      if (result.success) {
        toast.success('Rôle mis à jour.')
        router.refresh()
      } else {
        toast.error(result.error)
        setRole(role) // revert
      }
    })
  }

  const color = ROLE_COLORS[role] ?? '#555577'

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={role}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="text-[11px] px-2 py-0.5 rounded-full border cursor-pointer
          bg-transparent outline-none disabled:opacity-50 transition-colors"
        style={{
          backgroundColor: `${color}15`,
          color,
          borderColor: `${color}40`,
        }}
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value} className="bg-[#0d0d1a] text-white">
            {r.label}
          </option>
        ))}
      </select>
      {isPending && <Loader2 className="h-3 w-3 animate-spin text-[#555577]" />}
    </div>
  )
}
