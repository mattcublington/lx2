import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RequestBody {
  event_id: string
  include_weather?: boolean
  include_ntp_ld?: boolean
  include_wooden_spoon?: boolean
  include_individual_recaps?: boolean
}

/**
 * Generate AI round recaps for a finalised event.
 * One Sonnet call produces all three styles (commentary, banter, stats).
 * Stored in event_recaps — UNIQUE constraint prevents regeneration.
 */
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = (await request.json()) as RequestBody
  const { event_id, include_ntp_ld = true, include_wooden_spoon = true, include_individual_recaps = true } = body

  if (!event_id) {
    return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })
  }

  const admin = createAdminClient()

  // ── 1. Verify organiser and event is finalised ─────────────────────────
  const { data: event } = await admin
    .from('events')
    .select('id, name, date, format, created_by, finalised, handicap_allowance_pct, ntp_holes, ld_holes')
    .eq('id', event_id)
    .single()

  if (!event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }
  if (event.created_by !== user.id) {
    return NextResponse.json({ error: 'Only the organiser can generate recaps' }, { status: 403 })
  }
  if (!event.finalised) {
    return NextResponse.json({ error: 'Event must be finalised first' }, { status: 400 })
  }

  // Check for existing recap (UNIQUE constraint)
  const { data: existing } = await admin
    .from('event_recaps')
    .select('id')
    .eq('event_id', event_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Recap already generated' }, { status: 409 })
  }

  // ── 2. Fetch all scoring data ──────────────────────────────────────────
  const { data: players } = await admin
    .from('event_players')
    .select('id, display_name, handicap_index, user_id')
    .eq('event_id', event_id)
    .order('display_name')

  if (!players || players.length === 0) {
    return NextResponse.json({ error: 'No players found' }, { status: 400 })
  }

  const { data: scorecards } = await admin
    .from('scorecards')
    .select('id, event_player_id, submitted_at')
    .eq('event_id', event_id)

  const scorecardIds = (scorecards ?? []).map(sc => sc.id)

  const { data: holeScores } = await admin
    .from('hole_scores')
    .select('scorecard_id, hole_number, gross_strokes, putts, fairway_hit, green_in_regulation')
    .in('scorecard_id', scorecardIds)
    .order('hole_number')

  // Contest entries (NTP/LD)
  let contestEntries: { event_player_id: string; hole_number: number; type: string; distance_cm: number | null }[] = []
  if (include_ntp_ld) {
    const { data: contests } = await admin
      .from('contest_entries')
      .select('event_player_id, hole_number, type, distance_cm')
      .eq('event_id', event_id)
    contestEntries = contests ?? []
  }

  // ── 3. Build structured data payload ───────────────────────────────────
  const playerData = players.map(p => {
    const sc = scorecards?.find(s => s.event_player_id === p.id)
    const scores = (holeScores ?? []).filter(hs => hs.scorecard_id === sc?.id)

    const grossStrokes = scores.map(s => s.gross_strokes).filter((s): s is number => s !== null)
    const totalGross = grossStrokes.reduce((sum, s) => sum + s, 0)

    const puttsData = scores.filter(s => s.putts !== null).map(s => s.putts as number)
    const firData = scores.filter(s => s.fairway_hit !== null)
    const girData = scores.filter(s => s.green_in_regulation !== null)

    const hasRichData = puttsData.length > 0 || firData.length > 0 || girData.length > 0

    return {
      player_id: p.id,
      name: p.display_name,
      handicap: p.handicap_index,
      total_gross: totalGross,
      holes_played: grossStrokes.length,
      scores_by_hole: scores.map(s => ({
        hole: s.hole_number,
        gross: s.gross_strokes,
        putts: s.putts,
        fairway: s.fairway_hit,
        gir: s.green_in_regulation,
      })),
      has_rich_data: hasRichData,
      avg_putts: puttsData.length > 0 ? (puttsData.reduce((a, b) => a + b, 0) / puttsData.length).toFixed(1) : null,
      fir_pct: firData.length > 0 ? Math.round((firData.filter(s => s.fairway_hit).length / firData.length) * 100) : null,
      gir_pct: girData.length > 0 ? Math.round((girData.filter(s => s.green_in_regulation).length / girData.length) * 100) : null,
    }
  })

  // Sort by total for leaderboard order (assuming stableford for now — lower is better for stroke, higher for stableford)
  // We'll include both and let the LLM figure out the winner context

  const ntpWinners = contestEntries
    .filter(c => c.type === 'ntp' && c.distance_cm !== null)
    .sort((a, b) => (a.distance_cm ?? 0) - (b.distance_cm ?? 0))
    .reduce((acc, c) => {
      if (!acc.some(e => e.hole_number === c.hole_number)) {
        const player = players.find(p => p.id === c.event_player_id)
        if (player) acc.push({ hole_number: c.hole_number, player_name: player.display_name, distance_cm: c.distance_cm })
      }
      return acc
    }, [] as { hole_number: number; player_name: string; distance_cm: number | null }[])

  const ldWinners = contestEntries
    .filter(c => c.type === 'ld' && c.distance_cm !== null)
    .sort((a, b) => (b.distance_cm ?? 0) - (a.distance_cm ?? 0))
    .reduce((acc, c) => {
      if (!acc.some(e => e.hole_number === c.hole_number)) {
        const player = players.find(p => p.id === c.event_player_id)
        if (player) acc.push({ hole_number: c.hole_number, player_name: player.display_name, distance_cm: c.distance_cm })
      }
      return acc
    }, [] as { hole_number: number; player_name: string; distance_cm: number | null }[])

  const slug = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${new Date(event.date).getFullYear()}`

  // ── 4. Call Claude Sonnet ──────────────────────────────────────────────
  const systemPrompt = `You are a golf writer generating round recaps for a society golf day.
You will receive structured scoring data and must generate three versions of the recap.

Event: ${event.name}
Date: ${event.date}
Format: ${event.format}

Output ONLY valid JSON matching this schema:
{
  "commentary": {
    "group": "string (3-4 paragraphs, separated by \\n\\n)",
    "players": [{ "player_id": "string", "recap": "string (2-3 sentences)", "highlights": [{ "type": "+|-|=", "text": "string" }], "stats": { "back_nine_pts": number|null, "fir_pct": number|null, "gir_pct": number|null, "avg_putts": number|null, "best_hole": "string" } }]
  },
  "banter": { "group": "string", "players": [same structure] },
  "stats": { "group": "string", "players": [same structure] }
}

Rules:
- Reference players by first name only
- The commentary style should read like a club newsletter — warm, dramatic, celebratory
- The banter style should read like a WhatsApp group message — irreverent, teasing, affectionate mockery
- The stats style should be analytical — percentages, averages, comparisons, with minimal narrative
- For individual recaps, only include FIR/GIR/putts stats if the data exists (has_rich_data = true)
- ${include_ntp_ld ? 'Mention NTP and LD winners' : 'Do not mention NTP or LD'}
- ${include_wooden_spoon ? 'Mention the wooden spoon (last place)' : 'Do not mention wooden spoon'}
- ${include_individual_recaps ? 'Generate individual player recaps' : 'Set players arrays to empty []'}
- Never invent scores or events that aren't in the data
- Keep group narratives under 400 words each
- Keep individual recaps under 100 words each`

  const userMessage = JSON.stringify({
    players: playerData,
    ntp_winners: ntpWinners,
    ld_winners: ldWinners,
  }, null, 2)

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Generate round recaps from this scoring data:\n\n${userMessage}` },
        ],
      }),
    })

    if (!resp.ok) {
      const errText = await resp.text()
      console.error('Anthropic API error:', resp.status, errText)
      return NextResponse.json({ error: 'LLM API error' }, { status: 502 })
    }

    const data = await resp.json() as {
      content: { type: string; text: string }[]
    }
    const text = data.content[0]?.text ?? ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse LLM response' }, { status: 502 })
    }

    const recaps = JSON.parse(jsonMatch[0]) as {
      commentary: { group: string; players: unknown[] }
      banter: { group: string; players: unknown[] }
      stats: { group: string; players: unknown[] }
    }

    // ── 5. Store in database ─────────────────────────────────────────────
    const { data: inserted, error: insertError } = await admin
      .from('event_recaps')
      .insert({
        event_id,
        commentary_group: recaps.commentary.group,
        commentary_players: recaps.commentary.players,
        banter_group: recaps.banter.group,
        banter_players: recaps.banter.players,
        stats_group: recaps.stats.group,
        stats_players: recaps.stats.players,
        config: { include_ntp_ld, include_wooden_spoon, include_individual_recaps },
        generated_by: user.id,
        recap_slug: slug,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save recap' }, { status: 500 })
    }

    return NextResponse.json(inserted)
  } catch (err) {
    console.error('Recap generation error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
