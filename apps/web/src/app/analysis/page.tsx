import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnalysisClient from './AnalysisClient'

export default async function AnalysisPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('users')
    .select('display_name, handicap_index')
    .eq('id', user.id)
    .single()

  // Fetch all scorecards with hole scores for analysis
  const { data: scorecards } = await supabase
    .from('scorecards')
    .select(`
      id,
      created_at,
      loop_id,
      events!inner (
        name,
        date,
        format,
        course_id,
        combination_id,
        loop_id,
        courses ( name, par ),
        course_combinations ( name, loop_1_id, loop_2_id )
      ),
      event_players!inner ( user_id ),
      hole_scores ( hole_number, gross_strokes )
    `)
    .eq('event_players.user_id', user.id)
    .order('created_at', { ascending: true })

  type HoleScore = {
    hole_number: number
    gross_strokes: number | null
  }

  type RawScorecard = {
    id: string
    created_at: string
    loop_id: string | null
    events: {
      name: string
      date: string
      format: string
      course_id: string | null
      combination_id: string | null
      loop_id: string | null
      courses: { name: string; par: number | null } | null
      course_combinations: { name: string; loop_1_id: string | null; loop_2_id: string | null } | null
    } | null
    hole_scores: HoleScore[]
  }

  const cards = (scorecards ?? []) as unknown as RawScorecard[]

  // Collect all loop IDs needed for par data
  const loopIds = new Set<string>()
  for (const c of cards) {
    const ev = c.events
    if (!ev) continue
    const effectiveLoopId = c.loop_id ?? ev.loop_id
    if (effectiveLoopId) loopIds.add(effectiveLoopId)
    if (ev.course_combinations?.loop_1_id) loopIds.add(ev.course_combinations.loop_1_id)
    if (ev.course_combinations?.loop_2_id) loopIds.add(ev.course_combinations.loop_2_id)
  }

  // Batch-fetch loop hole par data
  const { data: loopHoles } = loopIds.size > 0
    ? await supabase
        .from('loop_holes')
        .select('loop_id, hole_number, par')
        .in('loop_id', [...loopIds])
    : { data: [] as { loop_id: string; hole_number: number; par: number }[] }

  // Build par lookup: loopId → sorted par array (by hole_number)
  const loopParMap = new Map<string, Map<number, number>>()
  for (const lh of loopHoles ?? []) {
    if (!loopParMap.has(lh.loop_id)) loopParMap.set(lh.loop_id, new Map())
    loopParMap.get(lh.loop_id)!.set(lh.hole_number, lh.par)
  }

  // Build a holeInRound → par map for a given scorecard
  function buildParMap(c: RawScorecard): Map<number, number> {
    const parMap = new Map<number, number>()
    const ev = c.events
    if (!ev) return parMap

    if (ev.combination_id && ev.course_combinations) {
      // 18-hole combination: loop_1 → holes 1-9, loop_2 → holes 10-18
      const combo = ev.course_combinations
      const loop1Pars = combo.loop_1_id ? loopParMap.get(combo.loop_1_id) : null
      const loop2Pars = combo.loop_2_id ? loopParMap.get(combo.loop_2_id) : null
      if (loop1Pars) {
        const sorted = [...loop1Pars.entries()].sort((a, b) => a[0] - b[0])
        sorted.forEach(([, par], i) => parMap.set(i + 1, par))
      }
      if (loop2Pars) {
        const sorted = [...loop2Pars.entries()].sort((a, b) => a[0] - b[0])
        const offset = loop1Pars ? loop1Pars.size : 0
        sorted.forEach(([, par], i) => parMap.set(offset + i + 1, par))
      }
    } else {
      // 9-hole via loop_id
      const effectiveLoopId = c.loop_id ?? ev.loop_id
      if (effectiveLoopId) {
        const pars = loopParMap.get(effectiveLoopId)
        if (pars) {
          const sorted = [...pars.entries()].sort((a, b) => a[0] - b[0])
          sorted.forEach(([, par], i) => parMap.set(i + 1, par))
        }
      }
    }
    return parMap
  }

  // Build round summaries for the client
  const roundSummaries = cards
    .filter(c => c.hole_scores.length > 0)
    .map(c => {
      const parMap = buildParMap(c)
      const scores = c.hole_scores.filter(h => h.gross_strokes != null)
      const totalGross = scores.reduce((s, h) => s + (h.gross_strokes ?? 0), 0)
      const totalPar = scores.reduce((s, h) => s + (parMap.get(h.hole_number) ?? 0), 0)
      const holesPlayed = scores.length

      // Score distribution
      let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0, triples = 0
      for (const h of scores) {
        const holePar = parMap.get(h.hole_number)
        if (holePar == null || h.gross_strokes == null) continue
        const diff = h.gross_strokes - holePar
        if (diff <= -2) eagles++
        else if (diff === -1) birdies++
        else if (diff === 0) pars++
        else if (diff === 1) bogeys++
        else if (diff === 2) doubles++
        else triples++
      }

      return {
        id: c.id,
        date: c.events?.date ?? c.created_at.slice(0, 10),
        courseName: c.events?.course_combinations?.name ?? c.events?.courses?.name ?? c.events?.name ?? 'Unknown',
        totalGross,
        totalPar,
        holesPlayed,
        toPar: totalGross - totalPar,
        eagles,
        birdies,
        pars,
        bogeys,
        doubles,
        triples,
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  const displayName = profile?.display_name ?? user.email?.split('@')[0] ?? 'Golfer'

  return (
    <AnalysisClient
      displayName={displayName}
      handicapIndex={profile?.handicap_index ?? null}
      rounds={roundSummaries}
    />
  )
}
