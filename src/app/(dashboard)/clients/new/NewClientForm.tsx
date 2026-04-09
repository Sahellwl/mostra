'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClientAction } from '../actions'
import type { ContactMethod } from '@/lib/types'

// ── Zod schema ───────────────────────────────────────────────────

const schema = z.object({
  fullName: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
  email: z.string().min(1, "L'email est requis").email('Email invalide'),
  phone: z.string().max(30, 'Numéro trop long').optional(),
  contactMethod: z.enum(['email', 'whatsapp', 'phone'] as const),
})

type FormValues = z.infer<typeof schema>

// ── Helpers ──────────────────────────────────────────────────────

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-[#a0a0a0] mb-1.5">
      {children}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-[#EF4444]">{message}</p>
}

const inputClass = `
  w-full px-3 py-2.5 rounded-lg text-sm
  bg-[#111111] border border-[#2a2a2a] text-white placeholder:text-[#444444]
  outline-none transition-colors
  focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30
  disabled:opacity-50
`

const selectClass = `
  w-full px-3 py-2.5 rounded-lg text-sm
  bg-[#111111] border border-[#2a2a2a] text-white
  outline-none transition-colors
  focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30
  disabled:opacity-50
`

// ── Composant ────────────────────────────────────────────────────

export default function NewClientForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { contactMethod: 'email' },
  })

  async function onSubmit(values: FormValues) {
    setServerError(null)

    const result = await createClientAction({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone || undefined,
      contactMethod: values.contactMethod as ContactMethod,
    })

    if (!result.success) {
      setServerError(result.error)
      return
    }

    toast.success(`Client "${values.fullName}" créé !`)
    router.push('/clients')
    router.refresh()
  }

  return (
    <div className="max-w-xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-[#666666] hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour aux clients
        </Link>
        <h1 className="text-xl font-semibold text-white">Nouveau client</h1>
        <p className="text-sm text-[#666666] mt-0.5">
          Un compte sera créé. Le client pourra accéder à ses projets via un lien de partage.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* ── Nom ── */}
        <div>
          <Label htmlFor="fullName">
            Nom complet <span className="text-[#EF4444]">*</span>
          </Label>
          <input
            id="fullName"
            type="text"
            placeholder="ex. Marie Dupont"
            {...register('fullName')}
            className={inputClass}
            disabled={isSubmitting}
          />
          <FieldError message={errors.fullName?.message} />
        </div>

        {/* ── Email ── */}
        <div>
          <Label htmlFor="email">
            Email <span className="text-[#EF4444]">*</span>
          </Label>
          <input
            id="email"
            type="email"
            placeholder="client@entreprise.com"
            {...register('email')}
            className={inputClass}
            disabled={isSubmitting}
          />
          <FieldError message={errors.email?.message} />
        </div>

        {/* ── Téléphone ── */}
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <input
            id="phone"
            type="tel"
            placeholder="+33 6 00 00 00 00"
            {...register('phone')}
            className={inputClass}
            disabled={isSubmitting}
          />
          <FieldError message={errors.phone?.message} />
        </div>

        {/* ── Moyen de contact préféré ── */}
        <div>
          <Label htmlFor="contactMethod">Contact préféré</Label>
          <select
            id="contactMethod"
            {...register('contactMethod')}
            className={selectClass}
            disabled={isSubmitting}
          >
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="phone">Téléphone</option>
          </select>
          <FieldError message={errors.contactMethod?.message} />
        </div>

        {/* ── Erreur serveur ── */}
        {serverError && (
          <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 px-4 py-3">
            <p className="text-sm text-[#EF4444]">{serverError}</p>
          </div>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/clients"
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-center
              border border-[#2a2a2a] text-[#a0a0a0] hover:text-white hover:border-[#444444]
              transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium
              bg-[#EF4444] text-white hover:bg-[#DC2626] active:bg-[#B91C1C]
              transition-colors disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer le client
          </button>
        </div>
      </form>
    </div>
  )
}
