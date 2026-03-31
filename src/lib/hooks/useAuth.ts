'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Agency, AgencyMember, Profile, UserRole } from '@/lib/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  member: AgencyMember | null
  agency: Agency | null
  role: UserRole | null
  loading: boolean
}

interface UseAuthReturn extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  isAdmin: boolean
  isCreative: boolean
  isClient: boolean
  isSuperAdmin: boolean
}

export function useAuth(): UseAuthReturn {
  const router = useRouter()
  const supabase = createClient()

  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    member: null,
    agency: null,
    role: null,
    loading: true,
  })

  const fetchUserData = useCallback(async (user: User) => {
    // Récupère profil + member + agence en parallèle
    const [profileResult, memberResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single(),
      supabase
        .from('agency_members')
        .select('*, agencies(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('invited_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    const profile = profileResult.data ?? null
    const member = memberResult.data ?? null

    setState({
      user,
      profile,
      member: member
        ? { ...member, agencies: undefined } as AgencyMember
        : null,
      agency: (member as { agencies?: Agency } | null)?.agencies ?? null,
      role: (member?.role as UserRole) ?? null,
      loading: false,
    })
  }, [supabase])

  useEffect(() => {
    // Session initiale
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetchUserData(user)
      } else {
        setState((prev) => ({ ...prev, loading: false }))
      }
    })

    // Écoute les changements d'état auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchUserData(session.user)
        } else {
          setState({
            user: null,
            profile: null,
            member: null,
            agency: null,
            role: null,
            loading: false,
          })
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [fetchUserData, supabase.auth])

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Email ou mot de passe incorrect.' }
        }
        return { error: 'Une erreur est survenue. Veuillez réessayer.' }
      }

      return { error: null }
    },
    [supabase]
  )

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }, [supabase, router])

  return {
    ...state,
    signIn,
    signOut,
    isSuperAdmin: state.role === 'super_admin',
    isAdmin: state.role === 'agency_admin' || state.role === 'super_admin',
    isCreative: state.role === 'creative',
    isClient: state.role === 'client',
  }
}
