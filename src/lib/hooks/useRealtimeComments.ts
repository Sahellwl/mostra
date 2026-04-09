'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CommentWithDetails } from '@/lib/supabase/queries'
import type { Comment, Profile } from '@/lib/types'

/**
 * Synchronise la liste des commentaires d'un projet en temps réel.
 * - INSERT : enrichit avec le profil auteur + phase_name, ajoute à la liste
 * - UPDATE : remplace in-place (ex. toggle résolution)
 * - DELETE : retire par id
 */
export function useRealtimeComments(
  projectId: string,
  initial: CommentWithDetails[],
  phases: { id: string; name: string }[],
) {
  const [comments, setComments] = useState<CommentWithDetails[]>(initial)
  const phasesRef = useRef(phases)
  useEffect(() => {
    phasesRef.current = phases
  })

  useEffect(() => {
    const supabase = createClient()
    const channelName = `comments:${projectId}`

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
          if (payload.eventType === 'INSERT') {
            const raw = payload.new as Comment

            const { data: profileRaw } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', raw.user_id)
              .maybeSingle()

            const author = profileRaw as Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
            const phaseName = raw.phase_id
              ? (phasesRef.current.find((p) => p.id === raw.phase_id)?.name ?? null)
              : null

            const enriched: CommentWithDetails = { ...raw, author, phase_name: phaseName }

            setComments((prev) => {
              if (prev.some((c) => c.id === enriched.id)) return prev
              return [...prev, enriched]
            })
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Comment
            setComments((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setComments((prev) => prev.filter((c) => c.id !== deleted.id))
          }
        },
      )
      .subscribe((status, err) => {
        if (err) console.error(`[Realtime] Channel "${channelName}" error:`, err)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  return comments
}
