'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { joinWithCode } from './actions'

const inputClass = `
  w-full px-3 py-2.5 rounded-lg text-sm
  bg-[#111111] border border-[#2a2a2a] text-white placeholder:text-[#444444]
  outline-none transition-colors tracking-widest font-mono text-center uppercase
  focus:border-[#00D76B] focus:ring-1 focus:ring-[#00D76B]/30
  disabled:opacity-50
`

export default function OnboardingClient() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function formatCode(raw: string): string {
    // Garder uniquement alphanumérique, max 8 chars, insérer tiret au milieu
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    if (clean.length > 4) return `${clean.slice(0, 4)}-${clean.slice(4)}`
    return clean
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const normalized = code.replace(/\s/g, '')
    if (normalized.length < 9) {
      setError('Le code doit contenir 8 caractères (format XXXX-XXXX).')
      return
    }

    setLoading(true)
    const result = await joinWithCode(code)

    if (!result.success) {
      setLoading(false)
      setError(result.error)
      return
    }

    // Hard reload obligatoire : forcer un nouveau cycle middleware complet
    // avec une session rafraîchie qui voit le nouveau membership.
    // router.push() + router.refresh() ne suffit pas car le RLS lit agency_members
    // via le JWT courant, et le router cache peut cacher la nouvelle row.
    window.location.href = result.redirectTo
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / titre */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#00D76B]/10 border border-[#00D76B]/20 mb-4">
            <span className="text-2xl">🎬</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Bienvenue sur MOSTRA</h1>
          <p className="text-sm text-[#666666] mt-1.5">
            Entrez le code d&apos;invitation fourni par votre agence.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#111111] border border-[#1a1a1a] rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#a0a0a0] mb-1.5">
                Code d&apos;invitation
              </label>
              <input
                type="text"
                placeholder="XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(formatCode(e.target.value))}
                className={inputClass}
                maxLength={9}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={loading}
              />
              <p className="mt-1.5 text-[11px] text-[#444444]">
                8 caractères, majuscules et chiffres — exemple : ABCD-EF2G
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 px-3 py-2.5">
                <p className="text-xs text-[#EF4444]">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.replace('-', '').length < 8}
              className="w-full py-2.5 rounded-lg text-sm font-medium
                bg-[#00D76B] text-white hover:bg-[#00C061] transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Rejoindre l&apos;agence
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[#444444] mt-5">
          Vous n&apos;avez pas de code ?{' '}
          <span className="text-[#666666]">
            Contactez l&apos;administrateur de votre agence.
          </span>
        </p>
      </div>
    </div>
  )
}
