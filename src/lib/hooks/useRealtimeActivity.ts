'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActivityWithUser } from '@/lib/supabase/queries'
import type { ActivityLog } from '@/lib/types'

const ANIMATION_DURATION_MS = 1500

/**
 * Synchronise le flux d'activité d'un projet en temps réel.
 * - INSERT : enrichit avec le profil user, insère en tête (max 20)
 * - Retourne `newIds` : Set des IDs récemment ajoutés (pour l'animation)
 */
export function useRealtimeActivity(projectId: string, initial: ActivityWithUser[]) {
  const [activity, setActivity] = useState<ActivityWithUser[]>(initial)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    const channelName = `activity:${projectId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          const raw = payload.new as ActivityLog

          let user: Pick<{ id: string; full_name: string }, 'id' | 'full_name'> | null = null
          if (raw.user_id) {
            const { data } = await supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', raw.user_id)
              .maybeSingle()
            user = data as typeof user
          }

          const enriched: ActivityWithUser = { ...raw, user }

          setActivity((prev) => {
            if (prev.some((a) => a.id === enriched.id)) return prev
            return [enriched, ...prev].slice(0, 20)
          })

          setNewIds((prev) => new Set([...prev, raw.id]))
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev)
              next.delete(raw.id)
              return next
            })
          }, ANIMATION_DURATION_MS)
        },
      )
      .subscribe((status, err) => {
        if (err) console.error(`[Realtime] Channel "${channelName}" error:`, err)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  return { activity, newIds }
}
