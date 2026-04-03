import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface PageProps {
  params: Promise<{ id: string }>
}

interface PlayerRecap {
  player_id: string
  recap: string
  highlights: { type: '+' | '-' | '='; text: string }[]
  stats: {
    back_nine_pts: number | null
    fir_pct: number | null
    gir_pct: number | null
    avg_putts: number | null
    best_hole: string
  }
}

export default async function PlayerRecapPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth/login?redirect=/events/${id}/recap`)

  const admin = createAdminClient()

  // Fetch event and recap
  const { data: event } = await admin
    .from('events')
    .select('id, name, date, format')
    .eq('id', id)
    .single()

  if (!event) redirect('/play')

  const { data: recap } = await admin
    .from('event_recaps')
    .select('commentary_group, commentary_players, recap_slug')
    .eq('event_id', id)
    .maybeSingle()

  if (!recap) {
    return (
      <>
        <style>{STYLES}</style>
        <div className="pr-wrap">
          <div className="pr-empty">
            <h1 className="pr-title">No recap yet</h1>
            <p className="pr-desc">The organiser hasn&apos;t generated a round recap for this event.</p>
            <Link href={`/events/${id}`} className="pr-back-link">Back to event</Link>
          </div>
        </div>
      </>
    )
  }

  // Find the current user's event_player entry
  const { data: eventPlayer } = await admin
    .from('event_players')
    .select('id, display_name')
    .eq('event_id', id)
    .eq('user_id', user.id)
    .maybeSingle()

  const players = (recap.commentary_players ?? []) as PlayerRecap[]
  const myRecap = eventPlayer ? players.find(p => p.player_id === eventPlayer.id) : null

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://lx2.golf').replace(/\/$/, '')
  const groupUrl = recap.recap_slug ? `${appUrl}/recap/${recap.recap_slug}` : null

  return (
    <>
      <style>{STYLES}</style>
      <div className="pr-wrap">
        <div className="pr-header">
          <h1 className="pr-title">{event.name}</h1>
          <p className="pr-date">{new Date(event.date + 'T12:00:00').toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}</p>
        </div>

        {myRecap ? (
          <div className="pr-my-recap">
            <p className="pr-recap-text">{myRecap.recap}</p>

            {myRecap.highlights.length > 0 && (
              <div className="pr-highlights">
                {myRecap.highlights.map((h, i) => (
                  <div key={i} className={`pr-hl pr-hl-${h.type === '+' ? 'pos' : h.type === '-' ? 'neg' : 'neutral'}`}>
                    <span className="pr-hl-icon">{h.type}</span>
                    <span>{h.text}</span>
                  </div>
                ))}
              </div>
            )}

            {(myRecap.stats.fir_pct !== null || myRecap.stats.gir_pct !== null || myRecap.stats.avg_putts !== null) && (
              <div className="pr-stats">
                {myRecap.stats.fir_pct !== null && <span className="pr-stat">FIR {myRecap.stats.fir_pct}%</span>}
                {myRecap.stats.gir_pct !== null && <span className="pr-stat">GIR {myRecap.stats.gir_pct}%</span>}
                {myRecap.stats.avg_putts !== null && <span className="pr-stat">{myRecap.stats.avg_putts} avg putts</span>}
                {myRecap.stats.best_hole && <span className="pr-stat">Best: {myRecap.stats.best_hole}</span>}
              </div>
            )}
          </div>
        ) : (
          <div className="pr-no-personal">
            <p className="pr-desc">No personal recap available for your round.</p>
          </div>
        )}

        <div className="pr-actions">
          {groupUrl && (
            <Link href={groupUrl} className="pr-action-btn pr-primary">View group story</Link>
          )}
          <Link href={`/events/${id}`} className="pr-action-btn">Back to event</Link>
        </div>
      </div>
    </>
  )
}

const STYLES = `
  .pr-wrap {
    min-height: 100dvh;
    background: #F2F5F0;
    font-family: var(--font-dm-sans), 'DM Sans', system-ui, sans-serif;
    color: #1A2E1A;
    padding: 2rem 1.25rem;
    max-width: 600px;
    margin: 0 auto;
  }
  .pr-header {
    margin-bottom: 1.5rem;
  }
  .pr-title {
    font-family: var(--font-dm-serif), 'DM Serif Display', serif;
    font-size: 1.75rem;
    color: #1A2E1A;
    margin: 0 0 0.25rem;
  }
  .pr-date {
    font-size: 0.875rem;
    color: #72786E;
    margin: 0;
  }
  .pr-empty {
    text-align: center;
    padding: 3rem 1rem;
  }
  .pr-desc {
    font-size: 0.875rem;
    color: #72786E;
    margin: 0;
  }
  .pr-back-link {
    display: inline-block;
    margin-top: 1rem;
    color: #0D631B;
    font-weight: 600;
    text-decoration: none;
  }
  .pr-my-recap {
    background: #FFFFFF;
    border: 1.5px solid #E0EBE0;
    border-radius: 14px;
    padding: 1.25rem;
    margin-bottom: 1.5rem;
  }
  .pr-recap-text {
    font-size: 0.9375rem;
    line-height: 1.6;
    margin: 0 0 1rem;
  }
  .pr-highlights {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin-bottom: 1rem;
  }
  .pr-hl {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    padding: 0.3rem 0.625rem;
    border-radius: 8px;
  }
  .pr-hl-pos { background: rgba(13,99,27,0.08); color: #0D631B; }
  .pr-hl-neg { background: rgba(146,51,87,0.08); color: #923357; }
  .pr-hl-neutral { background: #F0F4EC; color: #72786E; }
  .pr-hl-icon { font-weight: 700; }
  .pr-stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .pr-stat {
    font-size: 0.75rem;
    font-weight: 500;
    color: #0D631B;
    background: rgba(13,99,27,0.08);
    padding: 0.25rem 0.625rem;
    border-radius: 6px;
  }
  .pr-no-personal {
    background: #FFFFFF;
    border: 1.5px solid #E0EBE0;
    border-radius: 14px;
    padding: 2rem 1.25rem;
    text-align: center;
    margin-bottom: 1.5rem;
  }
  .pr-actions {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }
  .pr-action-btn {
    display: block;
    width: 100%;
    text-align: center;
    padding: 0.875rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.9375rem;
    text-decoration: none;
    transition: transform 0.15s, box-shadow 0.15s;
    border: 1.5px solid #E0EBE0;
    color: #1A2E1A;
    background: #FFFFFF;
  }
  .pr-action-btn:hover {
    transform: translateY(-1px);
  }
  .pr-primary {
    background: linear-gradient(135deg, #0D631B 0%, #0a4f15 100%);
    color: #FFFFFF;
    border: none;
    box-shadow: 0 4px 12px rgba(13,99,27,0.2);
  }
  .pr-primary:hover {
    box-shadow: 0 6px 16px rgba(13,99,27,0.3);
  }
`
