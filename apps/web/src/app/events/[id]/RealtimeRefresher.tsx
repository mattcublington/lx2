'use client'
/**
 * RealtimeRefresher — invisible client component.
 *
 * Subscribes to Supabase Realtime postgres_changes on the event_players
 * table filtered to the current event. When any row is inserted or updated
 * (e.g. a new player joins), it calls router.refresh() to re-render the
 * server component with the freshest player list.
 *
 * This pattern keeps the player list server-rendered (admin client, no RLS
 * surprises) while still updating without a full page reload.
 *
 * Also runs a 30-second polling fallback via router.refresh() so that even
 * environments without Realtime (e.g. blocked WebSocket) eventually update.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  eventId: string
}

export default function RealtimeRefresher({ eventId }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`event-players-${eventId}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'event_players',
          filter: `event_id=eq.${eventId}`,
        },
        () => { router.refresh() },
      )
      .subscribe()

    // 30-second polling fallback (catches cases where WebSocket is blocked)
    const poll = setInterval(() => { router.refresh() }, 30_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [eventId, router])

  return null
}
