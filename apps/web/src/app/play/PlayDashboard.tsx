'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatLabel(format: string): string {
  if (format === 'stableford') return 'Stableford'
  if (format === 'strokeplay') return 'Stroke Play'
  if (format === 'matchplay') return 'Match Play'
  return format
}

const FORMAT_ACCENT: Record<string, string> = {
  stableford: '#0D631B',
  strokeplay: '#1e3a8a',
  matchplay:  '#92400e',
}

export default function PlayDashboard({ displayName, rounds }: Props) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const initials = displayName
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <>
      <style>{`
        .play-dash { min-height: 100dvh; background: #F2F5F0; font-family: 'DM Sans', system-ui, sans-serif; color: #1A2E1A; }

        /* ── Header ── */
        .dash-header {
          background: #0a1f0a;
          background-image:
            radial-gradient(ellipse 80% 60% at 80% -10%, #1a5c25 0%, transparent 60%),
            radial-gradient(circle at 10% 110%, #0d3812 0%, transparent 50%);
          padding: 52px 20px 48px;
          position: relative;
          overflow: hidden;
        }
        .dash-header::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 22px 22px;
        }
        .dash-header-inner {
          position: relative;
          max-width: 480px;
          margin: 0 auto;
        }
        .dash-toprow {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }
        .dash-logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dash-avatar {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          border: 1.5px solid rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,255,255,0.9);
          font-size: 0.8125rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          flex-shrink: 0;
        }
        .dash-greeting {
          font-size: 0.8125rem;
          color: rgba(255,255,255,0.45);
          margin-bottom: 4px;
          font-weight: 400;
        }
        .dash-name {
          font-family: 'DM Serif Display', Georgia, serif;
          font-size: 1.75rem;
          color: #fff;
          line-height: 1.15;
          letter-spacing: -0.01em;
        }

        /* ── Body ── */
        .dash-body {
          max-width: 480px;
          margin: 0 auto;
          padding: 0 16px 48px;
        }

        /* ── CTA card ── */
        .dash-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 22px;
          background: #fff;
          border-radius: 18px;
          text-decoration: none;
          box-shadow: 0 10px 40px rgba(0,0,0,0.14);
          border: 1px solid rgba(0,0,0,0.04);
          margin-top: -20px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .dash-cta:hover { transform: translateY(-1px); box-shadow: 0 14px 44px rgba(0,0,0,0.18); }
        .dash-cta:active { transform: translateY(0); }
        .dash-cta-label {
          font-size: 0.6875rem;
          color: #6B8C6B;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .dash-cta-title {
          font-family: 'DM Serif Display', serif;
          font-size: 1.25rem;
          color: #0D631B;
          line-height: 1.2;
        }
        .dash-cta-arrow {
          width: 46px; height: 46px;
          border-radius: 50%;
          background: #0D631B;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          font-size: 1.125rem;
          color: #fff;
        }

        /* ── Section label ── */
        .dash-section-label {
          font-size: 0.6875rem;
          font-weight: 700;
          color: #9aaa9a;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin: 32px 0 12px;
        }

        /* ── Empty state ── */
        .dash-empty {
          background: #fff;
          border-radius: 16px;
          border: 1.5px dashed #C8D8C8;
          padding: 44px 24px;
          text-align: center;
        }
        .dash-empty-icon {
          width: 48px; height: 48px;
          margin: 0 auto 14px;
          opacity: 0.35;
        }
        .dash-empty-text {
          font-size: 0.9375rem;
          color: #7a9a7a;
          line-height: 1.55;
          font-weight: 400;
        }

        /* ── Round cards ── */
        .dash-round-card {
          display: block;
          background: #fff;
          border-radius: 14px;
          border: 1px solid #E4EDE4;
          text-decoration: none;
          color: inherit;
          overflow: hidden;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .dash-round-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          border-color: #C8D8C8;
        }
        .dash-round-inner {
          display: flex;
          align-items: stretch;
          gap: 0;
        }
        .dash-round-accent {
          width: 4px;
          flex-shrink: 0;
          border-radius: 14px 0 0 14px;
        }
        .dash-round-content {
          flex: 1;
          padding: 14px 16px 14px 14px;
          min-width: 0;
        }
        .dash-round-title {
          font-weight: 600;
          font-size: 0.9375rem;
          color: #1A2E1A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }
        .dash-round-sub {
          font-size: 0.8125rem;
          color: #7a9a7a;
          font-weight: 400;
          margin-bottom: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dash-round-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .dash-format-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          background: #E8F5EE;
          color: #0D631B;
        }
        .dash-round-date {
          font-size: 0.75rem;
          color: #aabcaa;
        }
        .dash-round-chevron {
          display: flex;
          align-items: center;
          padding-right: 14px;
          color: #C5D5C5;
          font-size: 1rem;
          flex-shrink: 0;
        }

        /* ── Footer ── */
        .dash-footer {
          margin-top: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
        }
        .dash-signout {
          background: none;
          border: none;
          font-size: 0.8125rem;
          color: #9aaa9a;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          padding: 8px 0;
          transition: color 0.15s;
        }
        .dash-signout:hover { color: #6B8C6B; }
      `}</style>

      <div className="play-dash">

        {/* ── Dark header ── */}
        <div className="dash-header">
          <div className="dash-header-inner">
            <div className="dash-toprow">
              <div className="dash-logo">
                <Image
                  src="/lx2-logo.svg"
                  alt="LX2"
                  width={56}
                  height={28}
                  style={{ filter: 'brightness(0) invert(1)', opacity: 0.92 }}
                />
              </div>
              <div className="dash-avatar">{initials || '?'}</div>
            </div>

            <div className="dash-greeting">Good {getTimeOfDay()},</div>
            <div className="dash-name">
              {displayName.split('@')[0]}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="dash-body">

          {/* Start a round CTA */}
          <Link href="/play/new" className="dash-cta">
            <div>
              <div className="dash-cta-label">Ready to play?</div>
              <div className="dash-cta-title">Start a new round</div>
            </div>
            <div className="dash-cta-arrow">→</div>
          </Link>

          {/* Recent rounds */}
          <div className="dash-section-label">Recent rounds</div>

          {rounds.length === 0 ? (
            <div className="dash-empty">
              <svg className="dash-empty-icon" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="#0D631B" strokeWidth="2"/>
                <path d="M14 32 L24 14 L34 32" stroke="#0D631B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="24" cy="38" r="2.5" fill="#0D631B"/>
              </svg>
              <div className="dash-empty-text">
                No rounds yet.<br />Tap above to start your first.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rounds.map(round => {
                const event = round.events
                const courseName = event?.courses?.name ?? 'Golf course'
                const comboName = event?.course_combinations?.name
                const date = event?.date ? formatDate(event.date) : '—'
                const format = event?.format ?? 'stableford'
                const accent = FORMAT_ACCENT[format] ?? '#0D631B'

                return (
                  <Link key={round.id} href={`/rounds/${round.id}/score`} className="dash-round-card">
                    <div className="dash-round-inner">
                      <div className="dash-round-accent" style={{ background: accent }} />
                      <div className="dash-round-content">
                        <div className="dash-round-title">{courseName}</div>
                        {comboName && <div className="dash-round-sub">{comboName}</div>}
                        <div className="dash-round-meta">
                          <span className="dash-format-pill" style={{
                            background: accent + '18',
                            color: accent,
                          }}>
                            {formatLabel(format)}
                          </span>
                          <span className="dash-round-date">{date}</span>
                        </div>
                      </div>
                      <div className="dash-round-chevron">›</div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Footer */}
          <div className="dash-footer">
            <button className="dash-signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
