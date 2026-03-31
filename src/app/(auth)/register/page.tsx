'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const registerSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(80, 'Le nom est trop long'),
  email: z
    .string()
    .min(1, 'L\'email est requis')
    .email('Adresse email invalide'),
  password: z
    .string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
    .regex(/[0-9]/, 'Doit contenir au moins un chiffre'),
  confirm_password: z.string().min(1, 'Veuillez confirmer le mot de passe'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password'],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(data: RegisterForm) {
    setServerError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { full_name: data.full_name },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        setServerError('Un compte existe déjà avec cet email.')
      } else {
        setServerError('Une erreur est survenue. Veuillez réessayer.')
      }
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-[#22C55E] text-xl">✓</span>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Email envoyé !</h2>
        <p className="text-sm text-[#a0a0a0]">
          Vérifiez votre boîte mail et cliquez sur le lien de confirmation
          pour activer votre compte.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-[#EF4444] hover:text-[#DC2626] transition-colors"
        >
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-xl font-semibold text-white mb-1">Créer un compte</h1>
      <p className="text-sm text-[#a0a0a0] mb-6">
        Rejoignez MOSTRA pour gérer vos productions.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Nom */}
        <div>
          <label
            htmlFor="full_name"
            className="block text-sm font-medium text-[#a0a0a0] mb-1.5"
          >
            Nom complet
          </label>
          <input
            id="full_name"
            type="text"
            autoComplete="name"
            placeholder="Tarik Lebailly"
            {...register('full_name')}
            className="
              w-full px-3 py-2.5 rounded-lg text-sm
              bg-[#111111] border text-white placeholder:text-[#444444]
              outline-none transition-colors
              focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30
              disabled:opacity-50 border-[#2a2a2a]
            "
            disabled={isSubmitting}
          />
          {errors.full_name && (
            <p className="mt-1.5 text-xs text-[#EF4444]">{errors.full_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#a0a0a0] mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@agence.io"
            {...register('email')}
            className="
              w-full px-3 py-2.5 rounded-lg text-sm
              bg-[#111111] border text-white placeholder:text-[#444444]
              outline-none transition-colors
              focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30
              disabled:opacity-50 border-[#2a2a2a]
            "
            disabled={isSubmitting}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-[#EF4444]">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#a0a0a0] mb-1.5"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register('password')}
            className="
              w-full px-3 py-2.5 rounded-lg text-sm
              bg-[#111111] border text-white placeholder:text-[#444444]
              outline-none transition-colors
              focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30
              disabled:opacity-50 border-[#2a2a2a]
            "
            disabled={isSubmitting}
          />
          {errors.password && (
            <p className="mt-1.5 text-xs text-[#EF4444]">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label
            htmlFor="confirm_password"
            className="block text-sm font-medium text-[#a0a0a0] mb-1.5"
          >
            Confirmer le mot de passe
          </label>
          <input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            {...register('confirm_password')}
            className="
              w-full px-3 py-2.5 rounded-lg text-sm
              bg-[#111111] border text-white placeholder:text-[#444444]
              outline-none transition-colors
              focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/30
              disabled:opacity-50 border-[#2a2a2a]
            "
            disabled={isSubmitting}
          />
          {errors.confirm_password && (
            <p className="mt-1.5 text-xs text-[#EF4444]">{errors.confirm_password.message}</p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <div className="rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 px-4 py-3">
            <p className="text-sm text-[#EF4444]">{serverError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="
            w-full py-2.5 px-4 rounded-lg text-sm font-medium
            bg-[#EF4444] text-white
            hover:bg-[#DC2626] active:bg-[#B91C1C]
            transition-colors disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
          "
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Créer mon compte
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[#666666]">
        Déjà un compte ?{' '}
        <Link
          href="/login"
          className="text-[#a0a0a0] hover:text-white transition-colors"
        >
          Se connecter
        </Link>
      </p>
    </>
  )
}
