'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ClientPortalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
      <div className="w-12 h-12 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center">
        <AlertTriangle className="h-5 w-5 text-[#EF4444]" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold text-white">Une erreur est survenue</h2>
        <p className="text-sm text-[#666666] max-w-sm">
          {error.message || 'Impossible de charger cette page. Réessayez dans un moment.'}
        </p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          bg-[#111111] border border-[#2a2a2a] text-[#a0a0a0] hover:text-white hover:border-[#3a3a3a]
          transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Réessayer
      </button>
    </div>
  )
}
