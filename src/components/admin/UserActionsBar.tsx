'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Power, PowerOff, KeyRound, Trash2, Copy, Check, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { deactivateUser, reactivateUser, resetUserPassword, deleteUser } from '@/app/admin/actions'

interface Props {
  userId: string
  userEmail: string
  isActive: boolean
}

export default function UserActionsBar({ userId, userEmail, isActive }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Deactivate / Reactivate
  function handleToggleActive() {
    startTransition(async () => {
      const fn = isActive ? deactivateUser : reactivateUser
      const result = await fn(userId)
      if (result.success) {
        toast.success(isActive ? 'Compte désactivé.' : 'Compte réactivé.')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleToggleActive}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
          border border-[#1e1e3a] transition-colors disabled:opacity-50
          hover:border-[#2e2e5a] text-[#6b6b9a] hover:text-white"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isActive ? (
          <PowerOff className="h-3.5 w-3.5 text-[#F59E0B]" />
        ) : (
          <Power className="h-3.5 w-3.5 text-[#22C55E]" />
        )}
        {isActive ? 'Désactiver' : 'Réactiver'}
      </button>

      <ResetPasswordButton userId={userId} />

      <DeleteUserButton userId={userId} userEmail={userEmail} />
    </div>
  )
}

// ── Reset password ────────────────────────────────────────────────

function ResetPasswordButton({ userId }: { userId: string }) {
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, start] = useTransition()

  function handleReset() {
    start(async () => {
      const result = await resetUserPassword(userId)
      if (result.success) {
        setLink(result.resetLink)
        toast.success('Lien de réinitialisation généré.')
      } else {
        toast.error(result.error)
      }
    })
  }

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (link) {
    return (
      <div className="flex items-center gap-1.5 bg-[#0d0d1a] border border-[#1e1e3a] rounded-lg px-3 py-2 max-w-xs">
        <p className="text-[10px] text-[#6b6b9a] font-mono truncate flex-1">{link}</p>
        <button
          onClick={handleCopy}
          className="text-[#555577] hover:text-white transition-colors flex-shrink-0"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-[#22C55E]" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#555577] hover:text-white transition-colors flex-shrink-0"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    )
  }

  return (
    <button
      onClick={handleReset}
      disabled={isPending}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
        border border-[#1e1e3a] text-[#6b6b9a] hover:text-white hover:border-[#2e2e5a]
        transition-colors disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <KeyRound className="h-3.5 w-3.5" />
      )}
      Réinitialiser MDP
    </button>
  )
}

// ── Delete user ───────────────────────────────────────────────────

function DeleteUserButton({ userId, userEmail }: { userId: string; userEmail: string }) {
  const router = useRouter()
  const [step, setStep] = useState<'idle' | 'confirm'>('idle')
  const [typed, setTyped] = useState('')
  const [isPending, start] = useTransition()

  function handleDelete() {
    start(async () => {
      const result = await deleteUser(userId, userEmail, typed)
      if (result.success) {
        toast.success('Compte supprimé.')
        router.push('/admin/users')
      } else {
        toast.error(result.error)
      }
    })
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('confirm')}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium
          border border-[#1e1e3a] text-[#555577] hover:text-[#EF4444]
          hover:border-[#EF4444]/30 hover:bg-[#EF4444]/5 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Supprimer
      </button>
    )
  }

  const matches = typed.trim() === userEmail.trim()

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={`Tapez "${userEmail}" pour confirmer`}
        disabled={isPending}
        className="px-3 py-2 rounded-lg text-xs bg-[#080810] border text-white
          placeholder:text-[#333355] outline-none transition-colors disabled:opacity-50 w-52"
        style={{ borderColor: matches ? '#EF444460' : '#1e1e3a' }}
      />
      <button
        onClick={handleDelete}
        disabled={!matches || isPending}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
          bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444]
          hover:bg-[#EF4444]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Confirmer
      </button>
      <button
        onClick={() => {
          setStep('idle')
          setTyped('')
        }}
        disabled={isPending}
        className="px-3 py-2 rounded-lg text-xs border border-[#1e1e3a] text-[#6b6b9a]
          hover:text-white hover:border-[#2e2e5a] transition-colors"
      >
        Annuler
      </button>
    </div>
  )
}
