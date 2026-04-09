'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteAgency } from '@/app/admin/actions'

interface Props {
  agencyId: string
  agencyName: string
}

export default function DeleteAgencyButton({ agencyId, agencyName }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'idle' | 'confirm'>('idle')
  const [typed, setTyped] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteAgency(agencyId, agencyName, typed)
      if (result.success) {
        toast.success(`Agence "${agencyName}" supprimée`)
        router.push('/admin/agencies')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirm')}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs
          border border-[#1e1e3a] text-[#555577] hover:text-[#EF4444]
          hover:border-[#EF4444]/30 hover:bg-[#EF4444]/5 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5 flex-shrink-0" />
        Supprimer l&apos;agence
      </button>
    )
  }

  const matches = typed.trim() === agencyName.trim()

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#a0a0cc]">
        <span className="text-white font-medium">Action irréversible.</span> Toutes les données de
        cette agence (projets, membres, fichiers) seront supprimées définitivement.
      </p>
      <p className="text-xs text-[#6b6b9a]">
        Tapez <span className="text-white font-mono">{agencyName}</span> pour confirmer :
      </p>
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={agencyName}
        disabled={isPending}
        className="w-full px-3 py-2 rounded-lg text-sm
          bg-[#080810] border text-white placeholder:text-[#333355]
          outline-none transition-colors disabled:opacity-50"
        style={{ borderColor: matches ? '#EF444460' : '#1e1e3a' }}
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            setStep('idle')
            setTyped('')
          }}
          disabled={isPending}
          className="flex-1 py-2 rounded-lg text-xs border border-[#1e1e3a] text-[#6b6b9a] hover:text-white hover:border-[#2e2e5a] transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={handleDelete}
          disabled={!matches || isPending}
          className="flex-1 py-2 rounded-lg text-xs font-medium
            bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]
            hover:bg-[#EF4444]/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
            flex items-center justify-center gap-1.5"
        >
          {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
          Supprimer définitivement
        </button>
      </div>
    </div>
  )
}
