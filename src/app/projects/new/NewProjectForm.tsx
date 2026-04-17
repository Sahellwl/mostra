'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createProject } from '../actions'
import type { MemberWithProfile } from '@/lib/supabase/queries'

// ── Zod schema ──────────────────────────────────────────────────

const schema = z
  .object({
    name: z.string().min(1, 'Le nom est requis').max(100, 'Nom trop long'),
    description: z.string().max(500, 'Description trop longue').optional(),
    clientMode: z.enum(['none', 'existing', 'new']),
    existingClientId: z.string().optional(),
    newClientName: z.string().optional(),
    newClientEmail: z.string().optional(),
    projectManagerId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.clientMode === 'existing' && !data.existingClientId) {
      ctx.addIssue({
        code: 'custom',
        path: ['existingClientId'],
        message: 'Sélectionnez un client',
      })
    }
    if (data.clientMode === 'new') {
      if (!data.newClientName?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['newClientName'], message: 'Nom requis' })
      }
      if (!data.newClientEmail?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['newClientEmail'], message: 'Email requis' })
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.newClientEmail)) {
        ctx.addIssue({ code: 'custom', path: ['newClientEmail'], message: 'Email invalide' })
      }
    }
  })

type FormValues = z.infer<typeof schema>

// ── Sous-composants ──────────────────────────────────────────────

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
  focus:border-[#00D76B] focus:ring-1 focus:ring-[#00D76B]/30
  disabled:opacity-50
`

const selectClass = `
  w-full px-3 py-2.5 rounded-lg text-sm
  bg-[#111111] border border-[#2a2a2a] text-white
  outline-none transition-colors
  focus:border-[#00D76B] focus:ring-1 focus:ring-[#00D76B]/30
  disabled:opacity-50
`

// ── Props ────────────────────────────────────────────────────────

interface Props {
  clients: MemberWithProfile[]
  creatives: MemberWithProfile[]
}

// ── Composant principal ──────────────────────────────────────────

export default function NewProjectForm({ clients, creatives }: Props) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { clientMode: 'none' },
  })

  const clientMode = watch('clientMode')

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const result = await createProject(values)

    if ('error' in result) {
      setServerError(result.error)
      return
    }

    toast.success(`Projet "${result.data.name}" créé !`)
    router.push(`/dashboard`)
    router.refresh()
  }

  return (
    <div className="max-w-xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-[#666666] hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour
        </Link>
        <h1 className="text-xl font-semibold text-white">Nouveau projet</h1>
        <p className="text-sm text-[#666666] mt-0.5">
          Remplissez les informations pour démarrer un nouveau projet.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {/* ── Nom du projet ── */}
        <div>
          <Label htmlFor="name">
            Nom du projet <span className="text-[#00D76B]">*</span>
          </Label>
          <input
            id="name"
            type="text"
            placeholder="ex. TechVision Brand Film 2024"
            {...register('name')}
            className={inputClass}
            disabled={isSubmitting}
          />
          <FieldError message={errors.name?.message} />
        </div>

        {/* ── Description ── */}
        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            rows={3}
            placeholder="Contexte, objectifs, format... (optionnel)"
            {...register('description')}
            className={`${inputClass} resize-none`}
            disabled={isSubmitting}
          />
          <FieldError message={errors.description?.message} />
        </div>

        {/* ── Client ── */}
        <div>
          <Label>Client</Label>

          {/* Segmented control */}
          <div className="flex rounded-lg border border-[#2a2a2a] overflow-hidden mb-3">
            {(
              [
                { value: 'none', label: 'Aucun' },
                { value: 'existing', label: 'Existant' },
                { value: 'new', label: 'Nouveau' },
              ] as const
            ).map(({ value, label }) => (
              <label
                key={value}
                className={`
                  flex-1 text-center py-2 text-sm cursor-pointer transition-colors select-none
                  ${
                    clientMode === value
                      ? 'bg-[#00D76B]/10 text-[#00D76B] font-medium border-b-2 border-[#00D76B]'
                      : 'text-[#666666] hover:text-[#a0a0a0] hover:bg-[#1a1a1a]'
                  }
                `}
              >
                <input
                  type="radio"
                  className="sr-only"
                  value={value}
                  {...register('clientMode')}
                  disabled={isSubmitting}
                />
                {label}
              </label>
            ))}
          </div>

          {/* Client existant */}
          {clientMode === 'existing' && (
            <div>
              <select
                {...register('existingClientId')}
                className={selectClass}
                disabled={isSubmitting}
                defaultValue=""
              >
                <option value="" disabled>
                  Sélectionnez un client…
                </option>
                {clients.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.profile.full_name} — {c.profile.email}
                  </option>
                ))}
              </select>
              <FieldError message={errors.existingClientId?.message} />
            </div>
          )}

          {/* Nouveau client */}
          {clientMode === 'new' && (
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Nom du client *"
                  {...register('newClientName')}
                  className={inputClass}
                  disabled={isSubmitting}
                />
                <FieldError message={errors.newClientName?.message} />
              </div>
              <div>
                <input
                  type="email"
                  placeholder="Email du client *"
                  {...register('newClientEmail')}
                  className={inputClass}
                  disabled={isSubmitting}
                />
                <FieldError message={errors.newClientEmail?.message} />
              </div>
              <p className="text-xs text-[#666666]">
                Un compte sera créé et le client recevra un accès en lecture seule à son projet.
              </p>
            </div>
          )}
        </div>

        {/* ── Créatif assigné ── */}
        <div>
          <Label htmlFor="projectManagerId">Créatif assigné</Label>
          <select
            id="projectManagerId"
            {...register('projectManagerId')}
            className={selectClass}
            disabled={isSubmitting}
            defaultValue=""
          >
            <option value="">Non assigné</option>
            {creatives.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.profile.full_name}
              </option>
            ))}
          </select>
          <FieldError message={errors.projectManagerId?.message} />
        </div>

        {/* ── Erreur serveur ── */}
        {serverError && (
          <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 px-4 py-3">
            <p className="text-sm text-[#EF4444]">{serverError}</p>
          </div>
        )}

        {/* ── Séparateur + boutons ── */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            href="/dashboard"
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
              bg-[#00D76B] text-white hover:bg-[#00C061] active:bg-[#009E50]
              transition-colors disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer le projet
          </button>
        </div>
      </form>
    </div>
  )
}
