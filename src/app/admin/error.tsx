'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AdminError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: '#8B5CF620', border: '1px solid #8B5CF640' }}
      >
        <AlertTriangle className="h-5 w-5" style={{ color: '#8B5CF6' }} />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-base font-semibold text-white">Une erreur est survenue</h2>
        <p className="text-sm max-w-sm" style={{ color: '#6b6b9a' }}>
          {error.message || 'Quelque chose a mal tourné. Réessayez ou contactez le support.'}
        </p>
      </div>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ backgroundColor: '#0d0d1a', border: '1px solid #1e1e3a', color: '#6b6b9a' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = '#ffffff'
          e.currentTarget.style.borderColor = '#2e2e5a'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = '#6b6b9a'
          e.currentTarget.style.borderColor = '#1e1e3a'
        }}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Réessayer
      </button>
    </div>
  )
}
