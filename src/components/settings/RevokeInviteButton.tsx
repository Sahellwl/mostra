'use client'

import { useState, useTransition } from 'react'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { revokeInvitation } from '@/app/(app)/settings/actions'

export default function RevokeInviteButton({
  invitationId,
  email,
}: {
  invitationId: string
  email: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirming) {
      setConfirming(true)
      return
    }

    startTransition(async () => {
      const result = await revokeInvitation(invitationId)
      if (result.success) {
        toast.success(`Invitation de ${email} révoquée`)
      } else {
        toast.error(result.error)
        setConfirming(false)
      }
    })
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="px-2 py-1.5 rounded-lg text-[11px] border border-[#2a2a2a] text-[#666666] hover:text-white transition-colors"
        >
          Non
        </button>
        <button
          onClick={handleClick}
          disabled={isPending}
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px]
            border border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]
            hover:bg-[#EF4444]/20 transition-colors disabled:opacity-50"
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Oui
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-lg
        border border-[#2a2a2a] text-[#555555] hover:text-[#EF4444] hover:border-[#EF4444]/30
        transition-colors"
      title="Révoquer l'invitation"
      aria-label={`Révoquer l'invitation de ${email}`}
    >
      <X className="h-3.5 w-3.5" />
    </button>
  )
}
