'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertEventOrganiser } from '@/lib/assert-event-organiser'
import {
  generateAllMarkets,
  calculatePayout,
  settleBets,
  resolveOutrightResults,
  resolveTop3Results,
  resolveLastPlaceResults,
  resolveH2HResult,
} from '@lx2/predictions'
import type { PlayerForm, OddsConfig } from '@lx2/predictions'

// ─── Enable predictions for an event (organiser only) ────────────────────────

export async function enablePredictions(
  eventId: string,
  config: {
    startingCredits?: number
    maxBetPct?: number
    overroundPct?: number
    h2hOverroundPct?: number
  } = {},
): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

  await admin.from('prediction_configs').upsert({
    event_id: eventId,
    enabled: true,
    starting_credits: config.startingCredits ?? 1000,
    max_bet_pct: config.maxBetPct ?? 20,
    overround_pct: config.overroundPct ?? 115,
    h2h_overround_pct: config.h2hOverroundPct ?? 108,
  }, { onConflict: 'event_id' })

  revalidatePath(`/events/${eventId}/manage`)
  revalidatePath(`/events/${eventId}/leaderboard`)
}

// ─── Disable predictions (organiser only) ────────────────────────────────────

export async function disablePredictions(eventId: string): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

  await admin.from('prediction_configs')
    .update({ enabled: false })
    .eq('event_id', eventId)

  revalidatePath(`/events/${eventId}/manage`)
  revalidatePath(`/events/${eventId}/leaderboard`)
}

// ─── Generate / refresh markets (organiser or system) ────────────────────────

export async function refreshMarkets(eventId: string): Promise<void> {
  const admin = createAdminClient()

  // Load prediction config
  const { data: predConfig } = await admin
    .from('prediction_configs')
    .select('*')
    .eq('event_id', eventId)
    .single()

  if (!predConfig?.enabled) return

  // Load confirmed players with their current scores
  const { data: players } = await admin
    .from('event_players')
    .select('id, display_name, handicap_index, flight_number')
    .eq('event_id', eventId)
    .eq('rsvp_status', 'confirmed')

  if (!players || players.length < 2) return

  // Load event for round type
  const { data: event } = await admin
    .from('events')
    .select('format, round_type')
    .eq('id', eventId)
    .single()

  const totalHoles = event?.round_type === '9' ? 9 : 18

  // Load current scores for each player
  const { data: scorecards } = await admin
    .from('scorecards')
    .select('id, event_player_id')
    .eq('event_id', eventId)

  // Fetch all hole_scores for this event's scorecards
  const scIds = (scorecards ?? []).map(sc => sc.id)
  const { data: allScores } = scIds.length > 0
    ? await admin
        .from('hole_scores')
        .select('scorecard_id, hole_number, gross_strokes')
        .in('scorecard_id', scIds)
    : { data: [] as { scorecard_id: string; hole_number: number; gross_strokes: number | null }[] }

  // Build score map: event_player_id → { currentScore, holesPlayed }
  const scoreMap = new Map<string, { stablefordPts: number; holesPlayed: number }>()
  for (const s of (allScores ?? [])) {
    if (s.gross_strokes === null) continue
    // Find which event_player owns this scorecard
    const epId = (scorecards ?? []).find(sc => sc.id === s.scorecard_id)?.event_player_id
    if (!epId) continue
    const existing = scoreMap.get(epId) ?? { stablefordPts: 0, holesPlayed: 0 }
    existing.holesPlayed++
    // Rough stableford approximation for odds: 2 pts baseline per hole
    // Actual scoring uses full handicap calc, but for odds we just need relative
    existing.stablefordPts += 2 // simplified — actual points computed by leaderboard
    scoreMap.set(epId, existing)
  }

  const playerForms: PlayerForm[] = players.map(p => {
    const scores = scoreMap.get(p.id)
    return {
      eventPlayerId: p.id,
      displayName: p.display_name,
      handicapIndex: Number(p.handicap_index),
      currentScore: scores?.stablefordPts ?? 0,
      holesPlayed: scores?.holesPlayed ?? 0,
      totalHoles,
    }
  })

  const oddsConfig: OddsConfig = {
    overroundPct: predConfig.overround_pct,
    h2hOverroundPct: predConfig.h2h_overround_pct,
  }

  // Build flight groups
  const groups = new Map<number, string[]>()
  for (const p of players) {
    if (p.flight_number) {
      const existing = groups.get(p.flight_number) ?? []
      existing.push(p.id)
      groups.set(p.flight_number, existing)
    }
  }

  const markets = generateAllMarkets(playerForms, oddsConfig, {
    groups: groups.size > 0 ? groups : undefined,
    h2hWithinGroups: true,
  })

  // Delete existing markets and recreate (simpler than diffing)
  await admin.from('prediction_markets').delete().eq('event_id', eventId)

  // Insert outright market
  await insertMarket(admin, eventId, markets.outright)

  // Insert top 3 market
  if (markets.top3.selections.length > 0) {
    await insertMarket(admin, eventId, markets.top3)
  }

  // Insert last place market
  if (markets.lastPlace.selections.length > 0) {
    await insertMarket(admin, eventId, markets.lastPlace)
  }

  // Insert H2H markets
  for (const h2h of markets.h2hMarkets) {
    await insertMarket(admin, eventId, h2h)
  }

  // Insert group winner markets
  for (const gm of markets.groupMarkets) {
    await insertMarket(admin, eventId, gm)
  }

  // Insert over/under markets
  for (const ou of markets.overUnderMarkets) {
    const { data: market } = await admin
      .from('prediction_markets')
      .insert({
        event_id: eventId,
        market_type: 'over_under',
        status: 'open',
        title: ou.title,
        metadata: { event_player_id: ou.eventPlayerId, line: ou.line },
      })
      .select('id')
      .single()

    if (market) {
      await admin.from('prediction_selections').insert([
        {
          market_id: market.id,
          event_player_id: ou.eventPlayerId,
          label: ou.over.label,
          odds_numerator: ou.over.fractionalOdds.numerator,
          odds_denominator: ou.over.fractionalOdds.denominator,
          sort_order: 0,
        },
        {
          market_id: market.id,
          event_player_id: ou.eventPlayerId,
          label: ou.under.label,
          odds_numerator: ou.under.fractionalOdds.numerator,
          odds_denominator: ou.under.fractionalOdds.denominator,
          sort_order: 1,
        },
      ])
    }
  }

  revalidatePath(`/events/${eventId}/leaderboard`)
}

async function insertMarket(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  market: { marketType: string; title: string; selections: Array<{
    eventPlayerId: string; label: string;
    fractionalOdds: { numerator: number; denominator: number }
  }> },
) {
  const { data: row } = await admin
    .from('prediction_markets')
    .insert({
      event_id: eventId,
      market_type: market.marketType,
      status: 'open',
      title: market.title,
    })
    .select('id')
    .single()

  if (!row) return

  const selections = market.selections.map((s, i) => ({
    market_id: row.id,
    event_player_id: s.eventPlayerId,
    label: s.label,
    odds_numerator: s.fractionalOdds.numerator,
    odds_denominator: s.fractionalOdds.denominator,
    sort_order: i,
  }))

  if (selections.length > 0) {
    await admin.from('prediction_selections').insert(selections)
  }
}

// ─── Place a bet ─────────────────────────────────────────────────────────────

export async function placeBet(
  eventId: string,
  selectionId: string,
  stake: number,
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Validate prediction config
  const { data: predConfig } = await admin
    .from('prediction_configs')
    .select('enabled, starting_credits, max_bet_pct')
    .eq('event_id', eventId)
    .single()

  if (!predConfig?.enabled) return { error: 'Predictions are not enabled for this event' }

  // Load the selection and its market
  const { data: selection } = await admin
    .from('prediction_selections')
    .select('id, market_id, odds_numerator, odds_denominator')
    .eq('id', selectionId)
    .single()

  if (!selection) return { error: 'Selection not found' }

  const { data: market } = await admin
    .from('prediction_markets')
    .select('id, status, event_id')
    .eq('id', selection.market_id)
    .single()

  if (!market || market.event_id !== eventId) return { error: 'Invalid market' }
  if (market.status !== 'open') return { error: 'This market is no longer accepting bets' }

  // Get or create bankroll
  const { data: bankroll } = await admin
    .from('prediction_bankrolls')
    .select('id, credits')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()

  const currentCredits = bankroll?.credits ?? predConfig.starting_credits

  if (!bankroll) {
    // Create the bankroll
    await admin.from('prediction_bankrolls').insert({
      event_id: eventId,
      user_id: user.id,
      credits: predConfig.starting_credits,
    })
  }

  // Validate stake
  if (stake <= 0) return { error: 'Stake must be positive' }
  if (stake > currentCredits) return { error: 'Insufficient credits' }

  const maxBet = Math.floor(currentCredits * predConfig.max_bet_pct / 100)
  if (stake > maxBet) return { error: `Maximum bet is ${maxBet} credits (${predConfig.max_bet_pct}% of bankroll)` }

  // Calculate potential payout
  const potentialPayout = calculatePayout(
    stake,
    { numerator: selection.odds_numerator, denominator: selection.odds_denominator },
  )

  // Deduct from bankroll and place the bet (optimistic locking via credits check)
  const { error: updateErr } = await admin
    .from('prediction_bankrolls')
    .update({ credits: currentCredits - stake })
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .gte('credits', stake) // Optimistic lock: only update if still has enough

  if (updateErr) return { error: 'Failed to deduct credits. Try again.' }

  // Insert the bet
  await admin.from('prediction_bets').insert({
    market_id: selection.market_id,
    selection_id: selectionId,
    user_id: user.id,
    event_id: eventId,
    stake,
    odds_numerator: selection.odds_numerator,
    odds_denominator: selection.odds_denominator,
    potential_payout: potentialPayout,
  })

  revalidatePath(`/events/${eventId}/leaderboard`)
  return {}
}

// ─── Get user's bankroll and bets for an event ───────────────────────────────

export async function getUserPredictionData(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const [{ data: bankroll }, { data: bets }] = await Promise.all([
    admin.from('prediction_bankrolls')
      .select('credits')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single(),
    admin.from('prediction_bets')
      .select('id, selection_id, stake, odds_numerator, odds_denominator, potential_payout, status, payout')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false }),
  ])

  // Get starting credits from config
  const { data: predConfig } = await admin
    .from('prediction_configs')
    .select('starting_credits')
    .eq('event_id', eventId)
    .single()

  return {
    credits: bankroll?.credits ?? predConfig?.starting_credits ?? 1000,
    bets: bets ?? [],
  }
}

// ─── Settle all markets on event finalisation ────────────────────────────────

export async function settleAllMarkets(eventId: string): Promise<void> {
  const { admin } = await assertEventOrganiser(eventId)

  // Load final leaderboard positions
  const { data: event } = await admin
    .from('events')
    .select('format')
    .eq('id', eventId)
    .single()

  // Get all markets for this event
  const { data: markets } = await admin
    .from('prediction_markets')
    .select('id, market_type, metadata')
    .eq('event_id', eventId)
    .neq('status', 'settled')

  if (!markets || markets.length === 0) return

  // Load final computed positions from scorecards
  // We use the raw scores to determine positions
  const { data: players } = await admin
    .from('event_players')
    .select('id, display_name, handicap_index')
    .eq('event_id', eventId)
    .eq('rsvp_status', 'confirmed')

  const { data: scorecards } = await admin
    .from('scorecards')
    .select('id, event_player_id')
    .eq('event_id', eventId)

  const scIds = (scorecards ?? []).map(sc => sc.id)
  const { data: allScores } = scIds.length > 0
    ? await admin.from('hole_scores')
        .select('scorecard_id, gross_strokes')
        .in('scorecard_id', scIds)
    : { data: [] as { scorecard_id: string; gross_strokes: number | null }[] }

  // Compute total score per player
  const scoreByPlayer = new Map<string, number>()
  for (const sc of (scorecards ?? [])) {
    const scores = (allScores ?? []).filter(s => s.scorecard_id === sc.id && s.gross_strokes !== null)
    const total = scores.reduce((sum, s) => sum + (s.gross_strokes ?? 0), 0)
    scoreByPlayer.set(sc.event_player_id, total)
  }

  // Sort players by score to determine positions
  const sortedPlayers = [...(players ?? [])]
    .filter(p => scoreByPlayer.has(p.id))
    .sort((a, b) => {
      const sa = scoreByPlayer.get(a.id) ?? 0
      const sb = scoreByPlayer.get(b.id) ?? 0
      // Stableford: higher is better (we stored gross, but for position ranking it's relative)
      return event?.format === 'stableford' ? sb - sa : sa - sb
    })

  // Assign positions with ties
  const positions: { eventPlayerId: string; position: number; isTied: boolean }[] = []
  let pos = 1
  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i]!
    const score = scoreByPlayer.get(player.id) ?? 0
    const prevScore = i > 0 ? scoreByPlayer.get(sortedPlayers[i - 1]!.id) ?? 0 : null

    if (prevScore !== null && score === prevScore) {
      positions.push({ eventPlayerId: player.id, position: positions[i - 1]?.position ?? pos, isTied: true })
      // Mark the previous as tied too
      const prevPos = positions[i - 1]
      if (prevPos) prevPos.isTied = true
    } else {
      pos = i + 1
      positions.push({ eventPlayerId: player.id, position: pos, isTied: false })
    }
  }

  // Load all selections
  const marketIds = markets.map(m => m.id)
  const { data: allSelections } = await admin
    .from('prediction_selections')
    .select('id, market_id, event_player_id')
    .in('market_id', marketIds)

  // Load all unsettled bets
  const { data: allBets } = await admin
    .from('prediction_bets')
    .select('id, market_id, selection_id, stake, odds_numerator, odds_denominator')
    .in('market_id', marketIds)
    .eq('status', 'placed')

  // Settle each market
  for (const market of markets) {
    const mSelections = (allSelections ?? []).filter(s => s.market_id === market.id)
    const mBets = (allBets ?? []).filter(b => b.market_id === market.id)

    // Determine winners based on market type
    let results: { selectionId: string; isWinner: boolean; deadHeatDivisor: number }[] = []

    if (market.market_type === 'outright') {
      const outrightResults = resolveOutrightResults(positions)
      results = mSelections.map(sel => {
        const res = outrightResults.find(r => r.selectionId === sel.event_player_id)
        return {
          selectionId: sel.id,
          isWinner: res?.isWinner ?? false,
          deadHeatDivisor: res?.deadHeatDivisor ?? 1,
        }
      })
    } else if (market.market_type === 'top_3') {
      const top3Results = resolveTop3Results(positions)
      results = mSelections.map(sel => {
        const res = top3Results.find(r => r.selectionId === sel.event_player_id)
        return {
          selectionId: sel.id,
          isWinner: res?.isWinner ?? false,
          deadHeatDivisor: res?.deadHeatDivisor ?? 1,
        }
      })
    } else if (market.market_type === 'last_place') {
      const lastResults = resolveLastPlaceResults(positions)
      results = mSelections.map(sel => {
        const res = lastResults.find(r => r.selectionId === sel.event_player_id)
        return {
          selectionId: sel.id,
          isWinner: res?.isWinner ?? false,
          deadHeatDivisor: res?.deadHeatDivisor ?? 1,
        }
      })
    } else if (market.market_type === 'head_to_head' && mSelections.length === 2) {
      const selA = mSelections[0]!
      const selB = mSelections[1]!
      const scoreA = scoreByPlayer.get(selA.event_player_id ?? '') ?? 0
      const scoreB = scoreByPlayer.get(selB.event_player_id ?? '') ?? 0
      const h2hRes = resolveH2HResult(
        selA.id, selB.id,
        scoreA, scoreB,
        (event?.format as 'stableford' | 'strokeplay') ?? 'stableford',
      )
      results = h2hRes
    } else if (market.market_type === 'group_winner') {
      // Same as outright but within the group
      const groupPlayerIds = new Set(mSelections.map(s => s.event_player_id).filter((id): id is string => id !== null))
      const groupPositions = positions.filter(p => groupPlayerIds.has(p.eventPlayerId))
      // Re-rank within group
      const sorted = [...groupPositions].sort((a, b) => a.position - b.position)
      const minPos = sorted[0]?.position ?? 1
      const groupWinners = sorted.filter(p => p.position === minPos)
      const dhDiv = groupWinners.length > 1 ? groupWinners.length : 1

      results = mSelections.map(sel => ({
        selectionId: sel.id,
        isWinner: groupPositions.find(p => p.eventPlayerId === sel.event_player_id)?.position === minPos,
        deadHeatDivisor: groupPositions.find(p => p.eventPlayerId === sel.event_player_id)?.position === minPos ? dhDiv : 1,
      }))
    } else if (market.market_type === 'over_under') {
      const meta = market.metadata as Record<string, unknown>
      const line = Number(meta.line ?? 0)
      const epId = String(meta.event_player_id ?? '')
      const playerScore = scoreByPlayer.get(epId) ?? 0

      results = mSelections.map(sel => {
        const isOver = sel.id === mSelections.find(s => s.event_player_id === epId && (allSelections ?? []).indexOf(s) === 0)?.id
        return {
          selectionId: sel.id,
          isWinner: isOver ? playerScore > line : playerScore < line,
          deadHeatDivisor: 1,
        }
      })
    }

    // Settle the bets
    const settled = settleBets(
      mBets.map(b => ({
        betId: b.id,
        selectionId: b.selection_id,
        stake: b.stake,
        oddsNumerator: b.odds_numerator,
        oddsDenominator: b.odds_denominator,
      })),
      results,
    )

    // Update bets and bankrolls
    for (const s of settled) {
      await admin.from('prediction_bets')
        .update({
          status: s.status,
          payout: s.payout,
          settled_at: new Date().toISOString(),
        })
        .eq('id', s.betId)

      // Credit winnings back to bankroll
      if (s.payout > 0) {
        const bet = mBets.find(b => b.id === s.betId)
        if (bet) {
          // Use raw SQL-like increment: read then write
          const { data: bankroll } = await admin.from('prediction_bankrolls')
            .select('credits')
            .eq('event_id', eventId)
            .eq('user_id', (allBets ?? []).find(b => b.id === s.betId)
              ? (await admin.from('prediction_bets').select('user_id').eq('id', s.betId).single()).data?.user_id ?? ''
              : '')
            .single()

          if (bankroll) {
            await admin.from('prediction_bankrolls')
              .update({ credits: bankroll.credits + s.payout })
              .eq('event_id', eventId)
          }
        }
      }
    }

    // Update selection winners
    for (const r of results) {
      await admin.from('prediction_selections')
        .update({ is_winner: r.isWinner, dead_heat_divisor: r.deadHeatDivisor })
        .eq('id', r.selectionId)
    }

    // Mark market as settled
    await admin.from('prediction_markets')
      .update({ status: 'settled', settled_at: new Date().toISOString() })
      .eq('id', market.id)
  }

  revalidatePath(`/events/${eventId}/leaderboard`)
}
