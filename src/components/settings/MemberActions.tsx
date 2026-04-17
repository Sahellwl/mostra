'use client'

import { useState, useTransition } from 'react'
import { Trash2, ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { removeMember, changeMemberRole } from '@/app/settings/actions'
import type { UserRole } from '@/lib/types'

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  agency_admin: 'Admin',
  creative: 'Créatif',
}

const SELECTABLE_ROLES = [
  { value: 'agency_admin', label: 'Admin' },
  { value: 'creative', label: 'Créatif' },
] as const

interface Props {
  memberId: string
  memberName: string
  currentRole: string
  isSelf: boolean
  callerRole: UserRole
}

export default function MemberActions({
  memberId,
  memberName,
  currentRole,
  isSelf,
  callerRole,
}: Props) {
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const canManage = !isSelf && !(currentRole === 'super_admin' && callerRole !== 'super_admin')
  const canChangeRole = canManage && currentRole !== 'super_admin'

  function handleRemoveClick() {
    if (!confirmingRemove) {
      setConfirmingRemove(true)
      return
    }

    startTransition(async () => {
      const result = await removeMember(memberId)
      if (result.success) {
        toast.success(`${memberName} retiré de l'équipe`)
      } else {
        toast.error(result.error)
        setConfirmingRemove(false)
      }
    })
  }

  function handleRoleChange(newRole: 'agency_admin' | 'creative') {
    setRoleOpen(false)
    startTransition(async () => {
      const result = await changeMemberRole(memberId, newRole)
      if (result.success) {
        toast.success(`Rôle mis à jour`)
      } else {
        toast.error(result.error)
      }
    })
  }

  if (!canManage) {
    return <span className="text-[11px] text-[#444444]">—</span>
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {isPending && <Loader2 className="h-3.5 w-3.5 text-[#555555] animate-spin" />}

      {/* Role change dropdown */}
      {canChangeRole && (
        <div className="relative">
          <button
            onClick={() => setRoleOpen((v) => !v)}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px]
              border border-[#2a2a2a] text-[#666666] hover:text-white hover:border-[#444444]
              transition-colors disabled:opacity-40"
          >
            {ROLE_LABELS[currentRole] ?? currentRole}
            <ChevronDown className="h-3 w-3" />
          </button>

          {roleOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setRoleOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-[#111111] border border-[#2a2a2a] rounded-lg overflow-hidden shadow-xl min-w-[120px]">
                {SELECTABLE_ROLES.filter((r) => r.value !== currentRole).map((r) => (
                  <button
                    key={r.value}
                    onClick={() => handleRoleChange(r.value)}
                    className="w-full text-left px-3 py-2 text-xs text-[#a0a0a0] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Remove member */}
      {confirmingRemove ? (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setConfirmingRemove(false)}
            disabled={isPending}
            className="px-2 py-1.5 rounded-lg text-[11px] border border-[#2a2a2a] text-[#666666] hover:text-white transition-colors"
          >
            Non
          </button>
          <button
            onClick={handleRemoveClick}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px]
              border border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]
              hover:bg-[#EF4444]/20 transition-colors disabled:opacity-50"
          >
            Oui
          </button>
        </div>
      ) : (
        <button
          onClick={handleRemoveClick}
          disabled={isPending}
          className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg
            border border-[#2a2a2a] text-[#555555] hover:text-[#EF4444] hover:border-[#EF4444]/30
            transition-colors disabled:opacity-40"
          title={`Retirer ${memberName}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
