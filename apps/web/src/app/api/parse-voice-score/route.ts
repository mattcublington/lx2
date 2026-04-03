import { NextResponse } from 'next/server'
import type { VoiceParseResult } from '@lx2/scoring'

interface RequestBody {
  transcript: string
  hole: { number: number; par: number; strokeIndex: number }
  players: { id: string; name: string }[]
}

/**
 * Tier 2: LLM fallback for voice score parsing.
 * Called when the local regex parser has confidence < 0.8.
 * Uses Claude Haiku for cost-efficient structured extraction.
 */
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  const body = (await request.json()) as RequestBody
  const { transcript, hole, players } = body

  if (!transcript || !hole) {
    return NextResponse.json({ error: 'Missing transcript or hole' }, { status: 400 })
  }

  const playerList = players.map(p => `- ${p.name} (ID: ${p.id})`).join('\n')

  const systemPrompt = `You are a golf scoring assistant that parses voice transcripts into structured score data.

Current hole context:
- Hole number: ${hole.number}
- Par: ${hole.par}
- Stroke index: ${hole.strokeIndex}

Players in the group:
${playerList}

Rules:
- "I", "me", "my", "I got", "I had" = the marker (player: "self")
- Player names match the list above
- Score words: "birdie" = par - 1, "par" = par, "bogey" = par + 1, "double" = par + 2, "eagle" = par - 2, "ace" = 1, "pick up" / "picked up" / "no return" = null score
- Numbers (words or digits) are gross strokes
- "two putts" / "3 putts" = putts count
- "GIR" / "green in regulation" / "hit the green" = gir: true
- "missed the green" = gir: false
- "hit the fairway" = fairwayHit: true
- "missed fairway left/right" = fairwayHit: false + missDirection

Output ONLY valid JSON matching this schema:
{
  "ownScore": { "player": "self", "score": number|null, "putts": number?, "gir": boolean?, "fairwayHit": boolean?, "missDirection": "left"|"right"|"short"|"long"?, "notes": string?, "confidence": number } | null,
  "playerScores": [{ "player": "player_id", "playerName": "display name", "score": number|null, "confidence": number }],
  "unparsed": string[],
  "overallConfidence": number
}`

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: systemPrompt,
        messages: [
          { role: 'user', content: `Parse this golf score transcript: "${transcript}"` },
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

    // Extract JSON from response (may have markdown code fences)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse LLM response' }, { status: 502 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as VoiceParseResult
    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Voice parse LLM error:', err)
    return NextResponse.json({ error: 'LLM parse failed' }, { status: 500 })
  }
}
