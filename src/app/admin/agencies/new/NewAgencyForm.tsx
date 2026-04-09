'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ChevronLeft, Copy, Check, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createAgency } from '../../actions'

const ACCENT = '#8B5CF6'

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'agence'
  )
}

const schema = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  slug: z
    .string()
    .min(1, 'Slug requis')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Uniquement lettres minuscules, chiffres et tirets'),
  adminEmail: z.string().min(1, 'Email requis').email('Email invalide'),
  adminName: z.string().min(1, 'Nom requis').max(100),
  primaryColor: z.string().min(4, 'Couleur requise'),
})

type FormValues = z.infer<typeof schema>

const inputClass = `
  w-full px-3 py-2.5 rounded-lg text-sm
  bg-[#080810] border border-[#1e1e3a] text-white placeholder:text-[#444466]
  outline-none transition-colors
  focus:border-[#8B5CF6]/50 focus:ring-1 focus:ring-[#8B5CF6]/20
  disabled:opacity-50
`

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1.5 text-xs text-[#EF4444]">{message}</p> : null
}

export default function NewAgencyForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { primaryColor: '#00D76B' },
  })

  // Slug auto-generated from name
  const name = watch('name')

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const result = await createAgency(values)
    if (!result.success) {
      setServerError(result.error)
      return
    }
    if (result.inviteUrl) {
      setInviteUrl(result.inviteUrl)
      toast.success('Agence créée avec succès !')
    } else {
      toast.success('Agence créée !')
      router.push('/admin/agencies')
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Invite URL shown after creation
  if (inviteUrl) {
    return (
      <div className="max-w-lg">
        <div className="bg-[#0d0d1a] border border-[#1e1e3a] rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Agence créée ✓</h2>
          <p className="text-sm text-[#6b6b9a]">
            Envoyez ce lien à l&apos;admin de l&apos;agence pour qu&apos;il définisse son mot de
            passe.
          </p>
          <div className="rounded-lg bg-[#080810] border border-[#1e1e3a] p-3">
            <p className="text-[10px] text-[#444466] mb-1.5">
              Lien d&apos;invitation (valable 7 jours)
            </p>
            <p className="text-xs text-[#a0a0cc] font-mono break-all">{inviteUrl}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyInvite}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: ACCENT }}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copié !
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copier le lien
                </>
              )}
            </button>
            <a
              href={inviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#1e1e3a] text-[#555577] hover:text-white hover:border-[#2e2e5a] transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <button
            onClick={() => router.push('/admin/agencies')}
            className="w-full py-2.5 rounded-lg text-sm border border-[#1e1e3a] text-[#6b6b9a] hover:text-white hover:border-[#2e2e5a] transition-colors"
          >
            Retour aux agences
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <div className="mb-8">
        <Link
          href="/admin/agencies"
          className="inline-flex items-center gap-1.5 text-sm text-[#555577] hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Agences
        </Link>
        <h1 className="text-xl font-bold text-white">Nouvelle agence</h1>
        <p className="text-sm text-[#555577] mt-0.5">
          Crée l&apos;agence, les phases par défaut et le compte admin.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Séparateur agence */}
        <p className="text-[10px] font-semibold tracking-widest text-[#444466] uppercase">Agence</p>

        {/* Nom */}
        <div>
          <label className="block text-xs font-medium text-[#6b6b9a] mb-1.5">
            Nom <span className="text-[#00D76B]">*</span>
          </label>
          <input
            type="text"
            placeholder="Studio Motion Paris"
            {...register('name', {
              onChange: (e) => setValue('slug', slugify(e.target.value), { shouldValidate: true }),
            })}
            className={inputClass}
            disabled={isSubmitting}
          />
          <FieldError message={errors.name?.message} />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-xs font-medium text-[#6b6b9a] mb-1.5">
            Slug <span className="text-[#00D76B]">*</span>
          </label>
          <input
            type="text"
            placeholder="studio-motion-paris"
            {...register('slug')}
            className={inputClass}
            disabled={isSubmitting}
          />
          <p className="mt-1 text-[10px] text-[#444466]">URL : /agencies/{watch('slug') || '…'}</p>
          <FieldError message={errors.slug?.message} />
        </div>

        {/* Couleur */}
        <div>
          <label className="block text-xs font-medium text-[#6b6b9a] mb-1.5">
            Couleur principale
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              {...register('primaryColor')}
              className="w-10 h-10 rounded-lg border border-[#1e1e3a] bg-transparent cursor-pointer"
              disabled={isSubmitting}
            />
            <input
              type="text"
              value={watch('primaryColor')}
              onChange={(e) => setValue('primaryColor', e.target.value)}
              className={`${inputClass} flex-1`}
              disabled={isSubmitting}
            />
          </div>
          <FieldError message={errors.primaryColor?.message} />
        </div>

        {/* Séparateur admin */}
        <div className="h-px bg-[#1e1e3a]" />
        <p className="text-[10px] font-semibold tracking-widest text-[#444466] uppercase">
          Admin de l&apos;agence
        </p>

        {/* Admin name */}
        <div>
          <label className="block text-xs font-medium text-[#6b6b9a] mb-1.5">
            Nom complet <span className="text-[#00D76B]">*</span>
          </label>
          <input
            type="text"
            placeholder="Marie Dupont"
            {...register('adminName')}
            className={inputClass}
            disabled={isSubmitting}
          />
          <FieldError message={errors.adminName?.message} />
        </div>

        {/* Admin email */}
        <div>
          <label className="block text-xs font-medium text-[#6b6b9a] mb-1.5">
            Email <span className="text-[#00D76B]">*</span>
          </label>
          <input
            type="email"
            placeholder="admin@agence.com"
            {...register('adminEmail')}
            className={inputClass}
            disabled={isSubmitting}
          />
          <FieldError message={errors.adminEmail?.message} />
        </div>

        {serverError && (
          <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 px-4 py-3">
            <p className="text-sm text-[#EF4444]">{serverError}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href="/admin/agencies"
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-center border border-[#1e1e3a] text-[#6b6b9a] hover:text-white hover:border-[#2e2e5a] transition-colors"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: ACCENT }}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer l&apos;agence
          </button>
        </div>
      </form>
    </div>
  )
}
