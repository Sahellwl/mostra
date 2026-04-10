'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Comment, Profile } from '@/lib/types'

export interface BlockComment {
  id: string
  block_id: string | null
  sub_phase_id: string | null
  phase_id: string | null
  user_id: string
  content: string
  is_resolved: boolean
  created_at: string
  updated_at: string
  author: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

/**
 * Realtime comments filtrés par sous-phase.
 * Écoute le canal project pour éviter les abonnements multiples.
 */
export function useRealtimeBlockComments(
  projectId: string,
  subPhaseId: string,
  initial: BlockComment[],
) {
  const [comments, setComments] = useState<BlockComment[]>(initial)

  useEffect(() => {
    if (!projectId) return

    const supabase = createClient()
    const channelName = `block-comments:${projectId}:${subPhaseId}`

    console.log(`[Realtime] Subscribing to channel "${channelName}"`)

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `project_id=eq.${projectId}`,
        },
        async (payload) => {
          console.log('[Realtime] Event received:', payload.eventType, payload)

          if (payload.eventType === 'INSERT') {
            const raw = payload.new as Comment
            // Only handle comments for this sub-phase
            if (raw.sub_phase_id !== subPhaseId) return

            const { data: profileRaw } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', raw.user_id)
              .maybeSingle()

            const author = profileRaw as Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
            const enriched: BlockComment = { ...raw, author }

            setComments((prev) => {
              if (prev.some((c) => c.id === enriched.id)) return prev
              return [...prev, enriched]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Comment
            if (updated.sub_phase_id !== subPhaseId) return
            setComments((prev) =>
              prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
            )
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setComments((prev) => prev.filter((c) => c.id !== deleted.id))
          }
        },
      )
      .subscribe((status, err) => {
        console.log(`[Realtime] Channel "${channelName}" status:`, status, err ?? '')
      })

    return () => {
      console.log(`[Realtime] Unsubscribing from channel "${channelName}"`)
      supabase.removeChannel(channel)
    }
  }, [projectId, subPhaseId])

  return comments
}
