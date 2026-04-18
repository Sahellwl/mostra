'use client'

import { useState, useRef, useEffect } from 'react'
import { X, UserPlus, Loader2, Copy, Check, ExternalLink } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { sendInvitation } from '@/app/settings/actions'

const schema = z.object({
  email: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
      message: 'Adresse email invalide',
    }),
  role: z.enum(['agency_admin', 'creative', 'client'] as const),
})
type FormValues = z.infer<typeof schema>

const inputClass = `
  w-full px-3 py-2.5 rounded-lg text-sm
  bg-[#0a0a0a] border border-[#2a2a2a] text-white placeholder:text-[#444444]
  outline-none transition-colors
  focus:border-[#00D76B] focus:ring-1 focus:ring-[#00D76B]/30
  disabled:opacity-50
`

interface InviteSuccessData {
  token: string
  email: string
  role: string
  invite_code: string
}

export default function InviteModal() {
  const [open, setOpen] = useState(false)
  const [success, setSuccess] = useState<InviteSuccessData | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'creative' },
  })

  // Fermer avec Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  function handleClose() {
    setOpen(false)
    setTimeout(() => {
      setSuccess(null)
      setServerError(null)
      setLinkCopied(false)
      setCodeCopied(false)
      reset()
    }, 200)
  }

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const result = await sendInvitation({ email: values.email || undefined, role: values.role })
    if (!result.success) {
      setServerError(result.error)
      return
    }
    setSuccess({ token: result.token, email: result.email, role: result.role, invite_code: result.invite_code })
    toast.success(result.email ? `Invitation créée pour ${result.email}` : 'Code d\'invitation généré')
  }

  const inviteUrl = success
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/invite/${success.token}`
    : ''

  async function copyLink() {
    await navigator.clipboard.writeText(inviteUrl)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  async function copyCode() {
    if (!success?.invite_code) return
    await navigator.clipboard.writeText(success.invite_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  const ROLE_LABELS: Record<string, string> = {
    agency_admin: 'Admin',
    creative: 'Créatif',
    client: 'Client',
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          bg-[#00D76B]/10 border border-[#00D76B]/20 text-[#00D76B]
          hover:bg-[#00D76B]/20 transition-colors"
      >
        <UserPlus className="h-4 w-4" />
        Inviter un membre
      </button>

      {/* Overlay */}
      {open && (
        <div
          ref={overlayRef}
          onClick={(e) => {
            if (e.target === overlayRef.current) handleClose()
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md bg-[#111111] border border-[#2a2a2a] rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
              <h2 className="text-sm font-semibold text-white">
                {success ? 'Invitation créée' : 'Inviter un membre'}
              </h2>
              <button
                onClick={handleClose}
                className="text-[#555555] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              {success ? (
                /* ── Succès ── */
                <div className="space-y-4">
                  <p className="text-sm text-[#a0a0a0]">
                    {success.email ? (
                      <>
                        Invitation créée pour{' '}
                        <span className="text-white font-medium">{success.email}</span>{' '}
                        en tant que{' '}
                        <span className="text-white font-medium">{ROLE_LABELS[success.role] ?? success.role}</span>.
                      </>
                    ) : (
                      <>
                        Code généré pour un{' '}
                        <span className="text-white font-medium">{ROLE_LABELS[success.role] ?? success.role}</span>.
                        Envoyez-le à la personne concernée.
                      </>
                    )}
                  </p>

                  {/* Code court — toujours affiché en premier */}
                  <div className="rounded-lg bg-[#0a0a0a] border border-[#00D76B]/20 p-4">
                    <p className="text-[11px] text-[#555555] mb-2.5">
                      Code d&apos;invitation — à envoyer par WhatsApp, SMS ou email
                    </p>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-2xl font-mono font-bold text-white tracking-[0.2em]">
                        {success.invite_code}
                      </span>
                      <button
                        onClick={copyCode}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px]
                          bg-[#00D76B] text-white hover:bg-[#00C061] transition-colors flex-shrink-0 font-medium"
                      >
                        {codeCopied ? (
                          <><Check className="h-3 w-3" />Copié !</>
                        ) : (
                          <><Copy className="h-3 w-3" />Copier</>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#444444]">
                      La personne le saisit sur <span className="text-[#555555]">/onboarding</span> après s&apos;être inscrite
                    </p>
                  </div>

                  {/* Lien long — uniquement si email fourni */}
                  {success.email && (
                    <>
                      <div className="rounded-lg bg-[#0a0a0a] border border-[#2a2a2a] p-3">
                        <p className="text-[11px] text-[#555555] mb-1.5">
                          Ou lien direct (valable 7 jours)
                        </p>
                        <p className="text-xs text-[#a0a0a0] break-all font-mono leading-relaxed">
                          {inviteUrl}
                        </p>
                      </div>
                      <button
                        onClick={copyLink}
                        className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg text-sm
                          border border-[#2a2a2a] text-[#666666] hover:text-white hover:border-[#444444]
                          transition-colors"
                      >
                        {linkCopied ? (
                          <><Check className="h-3.5 w-3.5 text-[#22C55E]" /><span className="text-[#22C55E]">Lien copié !</span></>
                        ) : (
                          <><Copy className="h-3.5 w-3.5" />Copier le lien</>
                        )}
                      </button>
                    </>
                  )}

                  <button
                    onClick={handleClose}
                    className="w-full py-2.5 rounded-lg text-sm border border-[#2a2a2a] text-[#666666] hover:text-white hover:border-[#444444] transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                /* ── Formulaire ── */
                <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#a0a0a0] mb-1.5">
                      Email{' '}
                      <span className="text-[#444444] font-normal">(optionnel)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="collaborateur@agence.com"
                      {...register('email')}
                      className={inputClass}
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-xs text-[#EF4444]">{errors.email.message}</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-[#444444]">
                      Sans email, seul le code d&apos;invitation est généré.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#a0a0a0] mb-1.5">
                      Rôle <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          {
                            value: 'client',
                            label: 'Client',
                            desc: 'Portail client',
                          },
                          {
                            value: 'creative',
                            label: 'Créatif',
                            desc: 'Upload & phases',
                          },
                          {
                            value: 'agency_admin',
                            label: 'Admin',
                            desc: 'Accès complet',
                          },
                        ] as const
                      ).map(({ value, label, desc }) => (
                        <label
                          key={value}
                          className="relative flex flex-col gap-0.5 p-3 rounded-lg border border-[#2a2a2a] cursor-pointer
                            has-[:checked]:border-[#00D76B]/40 has-[:checked]:bg-[#00D76B]/5
                            hover:border-[#444444] transition-colors"
                        >
                          <input
                            type="radio"
                            value={value}
                            {...register('role')}
                            className="sr-only"
                            disabled={isSubmitting}
                          />
                          <span className="text-sm font-medium text-white">{label}</span>
                          <span className="text-[10px] text-[#555555]">{desc}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {serverError && (
                    <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 px-3 py-2.5">
                      <p className="text-xs text-[#EF4444]">{serverError}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-2.5 rounded-lg text-sm border border-[#2a2a2a] text-[#666666] hover:text-white hover:border-[#444444] transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 py-2.5 rounded-lg text-sm font-medium
                        bg-[#00D76B] text-white hover:bg-[#00C061] transition-colors
                        disabled:opacity-60 disabled:cursor-not-allowed
                        flex items-center justify-center gap-2"
                    >
                      {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                      Générer le code
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
