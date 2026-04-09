'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { acceptInvitation } from '@/app/(dashboard)/settings/actions'

const schema = z
  .object({
    fullName: z.string().min(1, 'Le nom est requis').max(100),
    password: z.string().min(8, 'Minimum 8 caractères'),
    confirmPassword: z.string().min(1, 'Confirmez le mot de passe'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

const inputClass = `
  w-full px-3 py-2.5 rounded-lg text-sm
  bg-[#111111] border border-[#2a2a2a] text-white placeholder:text-[#444444]
  outline-none transition-colors
  focus:border-[#00D76B] focus:ring-1 focus:ring-[#00D76B]/30
  disabled:opacity-50
`

export default function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const router = useRouter()
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    const result = await acceptInvitation(token, values.fullName, values.password)
    if (!result.success) {
      setServerError(result.error)
      return
    }
    router.push('/login?invited=1')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {/* Email (readonly) */}
      <div>
        <label className="block text-xs font-medium text-[#a0a0a0] mb-1.5">Email</label>
        <input
          type="email"
          value={email}
          readOnly
          className={`${inputClass} opacity-60 cursor-not-allowed`}
        />
      </div>

      {/* Nom */}
      <div>
        <label className="block text-xs font-medium text-[#a0a0a0] mb-1.5">
          Nom complet <span className="text-[#00D76B]">*</span>
        </label>
        <input
          type="text"
          placeholder="Marie Dupont"
          {...register('fullName')}
          className={inputClass}
          disabled={isSubmitting}
        />
        {errors.fullName && (
          <p className="mt-1.5 text-xs text-[#EF4444]">{errors.fullName.message}</p>
        )}
      </div>

      {/* Mot de passe */}
      <div>
        <label className="block text-xs font-medium text-[#a0a0a0] mb-1.5">
          Mot de passe <span className="text-[#00D76B]">*</span>
        </label>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            placeholder="8 caractères minimum"
            {...register('password')}
            className={`${inputClass} pr-10`}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444444] hover:text-white transition-colors"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1.5 text-xs text-[#EF4444]">{errors.password.message}</p>
        )}
      </div>

      {/* Confirmation */}
      <div>
        <label className="block text-xs font-medium text-[#a0a0a0] mb-1.5">
          Confirmer le mot de passe <span className="text-[#00D76B]">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Répétez le mot de passe"
            {...register('confirmPassword')}
            className={`${inputClass} pr-10`}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444444] hover:text-white transition-colors"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="mt-1.5 text-xs text-[#EF4444]">{errors.confirmPassword.message}</p>
        )}
      </div>

      {/* Erreur serveur */}
      {serverError && (
        <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 px-3 py-2.5">
          <p className="text-xs text-[#EF4444]">{serverError}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 rounded-lg text-sm font-medium
          bg-[#00D76B] text-white hover:bg-[#00C061] transition-colors
          disabled:opacity-60 disabled:cursor-not-allowed
          flex items-center justify-center gap-2 mt-2"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Créer mon compte
      </button>
    </form>
  )
}
