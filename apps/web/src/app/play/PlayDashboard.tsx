'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type RoundRow = {
  id: string
  created_at: string
  round_type: string | null
  events: {
    name: string
    date: string
    format: string
    courses: { name: string } | null
    course_combinations: { name: string } | null
  } | null
}

interface Props {
  userId: string
  displayName: string
  rounds: RoundRow[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatLabel(format: string): string {
  if (format === 'stableford') return 'Stableford'
  if (format === 'strokeplay') return 'Stroke Play'
  if (format === 'matchplay') return 'Match Play'
  return format
}

function FormatPill({ format }: { format: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    stableford: { bg: '#E8F5EE', color: '#0D631B' },
    strokeplay: { bg: '#EEF2FF', color: '#3730A3' },
    matchplay:  { bg: '#FEF3E2', color: '#B8660B' },
  }
  const style = colors[format] ?? { bg: '#F3F4F6', color: '#374151' }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '0.6875rem',
      fontWeight: 600,
      fontFamily: "'Manrope', sans-serif",
      background: style.bg,
      color: style.color,
    }}>
      {formatLabel(format)}
    </span>
  )
}

export default function PlayDashboard({ displayName, rounds }: Props) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#FAFBF8',
      fontFamily: "'Lexend', system-ui, sans-serif",
      color: '#1A2E1A',
    }}>
      {/* Max-width container */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 20px 16px',
          borderBottom: '1px solid #E8ECE4',
        }}>
          <div style={{
            fontFamily: "'Manrope', sans-serif",
            fontWeight: 800,
            fontSize: '1.375rem',
            letterSpacing: '-0.03em',
            color: '#1A2E1A',
          }}>
            LX<span style={{ color: '#0D631B' }}>2</span>
          </div>
          <div style={{
            fontSize: '0.8125rem',
            color: '#6B8C6B',
            fontWeight: 400,
          }}>
            {displayName}
          </div>
        </div>

        {/* Main content */}
        <div style={{ padding: '28px 20px 0' }}>

          {/* Start a round button */}
          <Link
            href="/play/new"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '20px 24px',
              background: '#0D631B',
              color: '#fff',
              borderRadius: '1.25rem',
              textDecoration: 'none',
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 700,
              fontSize: '1.0625rem',
              boxShadow: '0 4px 20px rgba(13,99,27,0.28)',
              boxSizing: 'border-box',
            }}
          >
            <span>Start a new round</span>
            <span style={{ fontSize: '1.25rem' }}>→</span>
          </Link>

          {/* Recent rounds */}
          <div style={{ marginTop: 36 }}>
            <div style={{
              fontFamily: "'Manrope', sans-serif",
              fontWeight: 700,
              fontSize: '0.875rem',
              color: '#6B8C6B',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}>
              Recent rounds
            </div>

            {rounds.length === 0 ? (
              <div style={{
                background: '#fff',
                border: '1px solid #E8ECE4',
                borderRadius: '1.25rem',
                padding: '40px 24px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>⛳</div>
                <div style={{
                  fontSize: '0.9375rem',
                  color: '#6B8C6B',
                  lineHeight: 1.5,
                  fontWeight: 300,
                }}>
                  No rounds yet — tap above to play your first.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {rounds.map(round => {
                  const event = round.events
                  const courseName = event?.courses?.name ?? 'Unknown course'
                  const comboName = event?.course_combinations?.name
                  const date = event?.date ? formatDate(event.date) : '—'
                  const format = event?.format ?? 'stableford'

                  return (
                    <Link
                      key={round.id}
                      href={`/rounds/${round.id}/score`}
                      style={{
                        display: 'block',
                        background: '#fff',
                        border: '1px solid #E8ECE4',
                        borderRadius: '1rem',
                        padding: '16px 18px',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: "'Manrope', sans-serif",
                            fontWeight: 600,
                            fontSize: '0.9375rem',
                            color: '#1A2E1A',
                            marginBottom: 2,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {courseName}
                          </div>
                          {comboName && (
                            <div style={{
                              fontSize: '0.8125rem',
                              color: '#6B8C6B',
                              marginBottom: 8,
                              fontWeight: 300,
                            }}>
                              {comboName}
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FormatPill format={format} />
                            <span style={{ fontSize: '0.75rem', color: '#9CA9A1' }}>{date}</span>
                          </div>
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#C5D5C5',
                          flexShrink: 0,
                          marginTop: 2,
                        }}>›</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer nav */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 0,
          marginTop: 48,
          borderTop: '1px solid #E8ECE4',
          padding: '0 20px',
        }}>
          {[
            { label: 'Score', href: '/play' },
            { label: 'Events', href: '/events/new' },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 0',
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#6B8C6B',
                textDecoration: 'none',
                borderRight: '1px solid #E8ECE4',
              }}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={handleSignOut}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px 0',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#6B8C6B',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Lexend', sans-serif",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
