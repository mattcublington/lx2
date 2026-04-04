import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function CoursesPage() {
  const supabase = await createClient()

  const { data: courses } = await supabase
    .from('courses')
    .select(`
      id, name, club, location, holes_count, slope_rating, course_rating, par, verified,
      course_tees ( tee_name, slope_rating, course_rating )
    `)
    .order('club')
    .order('name')

  // Group by club
  const byClub: Record<string, typeof courses> = {}
  for (const course of courses ?? []) {
    const key = course.club ?? 'Unknown'
    if (!byClub[key]) byClub[key] = []
    byClub[key]!.push(course)
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px' }}>Courses</h1>
          <p style={{ margin: 0, color: '#94A3B8', fontSize: 14 }}>
            {courses?.length ?? 0} course{(courses?.length ?? 0) !== 1 ? 's' : ''} in database
          </p>
        </div>
        <Link
          href="/courses/import"
          style={{
            background: '#3B82F6', color: '#fff', padding: '8px 16px',
            borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600,
          }}
        >
          + Import JSON
        </Link>
      </div>

      {Object.entries(byClub).map(([club, clubCourses]) => (
        <div key={club} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#93C5FD', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {club}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(clubCourses ?? []).map(course => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div style={{
                  background: '#1E293B', border: '1px solid #334155', borderRadius: 12,
                  padding: '16px 20px', display: 'grid',
                  gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 16,
                  cursor: 'pointer',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#F1F5F9', marginBottom: 4 }}>
                      {course.name}
                      {course.verified && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#4ADE80', background: '#052e16', padding: '2px 6px', borderRadius: 4 }}>
                          verified
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748B' }}>
                      {course.location} &middot; Par {course.par} &middot; {course.holes_count} holes
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: '#94A3B8' }}>
                      {course.course_rating ?? '—'} / {course.slope_rating ?? '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase join returns mixed type */}
                      {(course.course_tees as any[])?.map((t: { tee_name: string }) => t.tee_name).join(', ') || 'No tees'}{/* Supabase returns JSONB as unknown */}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {(!courses || courses.length === 0) && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#64748B' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗺</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No courses yet</div>
          <div style={{ fontSize: 14 }}>Import a course JSON file to get started.</div>
        </div>
      )}
    </div>
  )
}
