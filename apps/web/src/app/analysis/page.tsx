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
      events!inner (
        name,
        date,
        format,
        courses ( name, par ),
        course_combinations ( name )
      ),
      event_players!inner ( user_id ),
      hole_scores ( hole_number, gross_strokes, net_strokes, par )
    `)
    .eq('event_players.user_id', user.id)
    .order('created_at', { ascending: true })

  type HoleScore = {
    hole_number: number
    gross_strokes: number | null
    net_strokes: number | null
    par: number | null
  }

  type RawScorecard = {
    id: string
    created_at: string
    events: {
      name: string
      date: string
      format: string
      courses: { name: string; par: number | null } | null
      course_combinations: { name: string } | null
    } | null
    hole_scores: HoleScore[]
  }

  const cards = (scorecards ?? []) as unknown as RawScorecard[]

  // Build round summaries for the client
  const roundSummaries = cards
    .filter(c => c.hole_scores.length > 0)
    .map(c => {
      const scores = c.hole_scores.filter(h => h.gross_strokes != null)
      const totalGross = scores.reduce((s, h) => s + (h.gross_strokes ?? 0), 0)
      const totalPar = scores.reduce((s, h) => s + (h.par ?? 0), 0)
      const holesPlayed = scores.length

      // Score distribution
      let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0, triples = 0
      for (const h of scores) {
        if (h.par == null || h.gross_strokes == null) continue
        const diff = h.gross_strokes - h.par
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
