import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: course } = await supabase
    .from('courses')
    .select(`
      id, name, club, location, holes_count, slope_rating, course_rating, par, verified, source,
      course_holes ( hole_number, par, stroke_index ),
      course_tees  ( tee_name, yardages, metres, total_yards, slope_rating, course_rating )
    `)
    .eq('id', id)
    .single()

  if (!course) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join
  const holes = ((course.course_holes as any[]) ?? []).sort(
    (a: { hole_number: number }, b: { hole_number: number }) => a.hole_number - b.hole_number
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join
  const tees = ((course.course_tees as any[]) ?? []).sort(
    (a: { tee_name: string }, b: { tee_name: string }) => a.tee_name.localeCompare(b.tee_name)
  )

  return (
    <div style={{ padding: 32, maxWidth: 960 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/courses" style={{ color: '#64748B', fontSize: 13, textDecoration: 'none' }}>
          ← Courses
        </Link>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{course.name}</h1>
          {course.verified && (
            <span style={{ fontSize: 11, color: '#4ADE80', background: '#052e16', padding: '4px 8px', borderRadius: 6, marginTop: 4, flexShrink: 0 }}>
              verified
            </span>
          )}
        </div>
        <div style={{ color: '#94A3B8', fontSize: 14 }}>
          {course.location} &middot; Par {course.par} &middot; {course.holes_count} holes &middot; CR {course.course_rating} / Slope {course.slope_rating}
        </div>
      </div>

      {/* Tee Ratings */}
      {tees.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#93C5FD', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tee Ratings
          </h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {tees.map((tee: { tee_name: string; slope_rating: number | null; course_rating: number | null; total_yards: number | null }) => (
              <div key={tee.tee_name} style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 10, padding: '12px 20px', minWidth: 140 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{tee.tee_name}</div>
                <div style={{ fontSize: 13, color: '#94A3B8' }}>
                  CR {tee.course_rating ?? '—'} / Slope {tee.slope_rating ?? '—'}
                </div>
                {tee.total_yards && (
                  <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{tee.total_yards} yds</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Hole-by-hole */}
      {holes.length > 0 && (
        <section>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#93C5FD', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Scorecard
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ color: '#64748B', borderBottom: '1px solid #334155' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left' }}>Hole</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Par</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>SI</th>
                  {tees.map((t: { tee_name: string }) => (
                    <th key={t.tee_name} style={{ padding: '8px 12px', textAlign: 'center' }}>{t.tee_name} (yds)</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {holes.map((hole: { hole_number: number; par: number; stroke_index: number }, hIdx: number) => (
                  <tr key={hole.hole_number} style={{ borderBottom: '1px solid #1E293B', background: hIdx % 2 === 0 ? 'transparent' : '#0F172A' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{hole.hole_number}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#94A3B8' }}>{hole.par}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748B' }}>
                      {hole.stroke_index === 0 ? '—' : hole.stroke_index}
                    </td>
                    {tees.map((tee: { tee_name: string; yardages: number[] | null }) => (
                      <td key={tee.tee_name} style={{ padding: '8px 12px', textAlign: 'center', color: '#94A3B8' }}>
                        {tee.yardages?.[hIdx] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #334155', fontWeight: 700 }}>
                  <td style={{ padding: '10px 12px' }}>Total</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    {holes.reduce((s: number, h: { par: number }) => s + h.par, 0)}
                  </td>
                  <td />
                  {tees.map((tee: { tee_name: string; total_yards: number | null }) => (
                    <td key={tee.tee_name} style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {tee.total_yards ?? '—'}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
