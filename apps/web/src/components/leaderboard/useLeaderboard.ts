'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeLeaderboard } from '@lx2/leaderboard'
import type { PlayerData, ComputedRow, LeaderboardConfig } from '@lx2/leaderboard'
import type { HoleData } from '@lx2/scoring'

interface UseLeaderboardOptions {
  eventId: string
  initialPlayers: PlayerData[]
  holeData: HoleData[]
  config: LeaderboardConfig
}

interface UseLeaderboardResult {
  leaderboard: ComputedRow[]
  connected: boolean
  flashId: string | null
}

export function useLeaderboard({
  eventId,
  initialPlayers,
  holeData,
  config,
}: UseLeaderboardOptions): UseLeaderboardResult {
  const totalHoles = config.roundType === '9' ? 9 : 18

  const [liveScores, setLiveScores] = useState<Map<string, (number | null)[]>>(() => {
    const map = new Map<string, (number | null)[]>()
    for (const p of initialPlayers) {
      if (p.scorecardId) map.set(p.scorecardId, [...p.grossStrokes])
    }
    return map
  })

  const [connected, setConnected] = useState(false)
  const [flashId, setFlashId] = useState<string | null>(null)

  const validIds = useMemo(
    () => new Set(initialPlayers.map(p => p.scorecardId).filter((s): s is string => s !== null)),
    [initialPlayers],
  )

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`leaderboard-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hole_scores' },
        payload => {
          const row = payload.new as {
            scorecard_id: string
            hole_number: number
            gross_strokes: number | null
          }
          if (!row?.scorecard_id || !validIds.has(row.scorecard_id)) return

          setLiveScores(prev => {
            const next = new Map(prev)
            const existing = next.get(row.scorecard_id) ?? new Array<number | null>(totalHoles).fill(null)
            const arr = [...existing]
            if (row.hole_number >= 1 && row.hole_number <= totalHoles) {
              arr[row.hole_number - 1] = row.gross_strokes
            }
            next.set(row.scorecard_id, arr)
            return next
          })

          setFlashId(row.scorecard_id)
          const t = setTimeout(() => setFlashId(null), 1400)
          return () => clearTimeout(t)
        },
      )
      .subscribe(status => setConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [eventId, validIds, totalHoles])

  const leaderboard = useMemo(
    () => computeLeaderboard(initialPlayers, liveScores, holeData, config),
    [initialPlayers, liveScores, holeData, config],
  )

  return { leaderboard, connected, flashId }
}
