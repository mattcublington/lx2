import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: recap } = await admin
    .from('event_recaps')
    .select('event_id, commentary_group')
    .eq('recap_slug', slug)
    .maybeSingle()

  if (!recap) return { title: 'Recap not found' }

  const { data: event } = await admin
    .from('events')
    .select('name, date')
    .eq('id', recap.event_id)
    .single()

  if (!event) return { title: 'Recap not found' }

  const summary = recap.commentary_group.slice(0, 160).replace(/\n/g, ' ') + '...'

  return {
    title: `${event.name} — Round Recap`,
    description: summary,
    openGraph: {
      title: event.name,
      description: summary,
      type: 'article',
    },
  }
}

export default async function PublicRecapPage({ params }: PageProps) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: recap } = await admin
    .from('event_recaps')
    .select('event_id, commentary_group, generated_at')
    .eq('recap_slug', slug)
    .maybeSingle()

  if (!recap) notFound()

  const { data: event } = await admin
    .from('events')
    .select('name, date, format')
    .eq('id', recap.event_id)
    .single()

  if (!event) notFound()

  const dateStr = new Date(event.date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <style>{STYLES}</style>
      <div className="pub-wrap">
        <header className="pub-header">
          <div className="pub-logo">
            LX<span className="pub-logo-accent">2</span>
          </div>
        </header>

        <main className="pub-main">
          <h1 className="pub-title">{event.name}</h1>
          <p className="pub-date">{dateStr}</p>

          <div className="pub-content">
            {recap.commentary_group.split('\n\n').map((para: string, i: number) => (
              <p key={i} className="pub-para">{para}</p>
            ))}
          </div>
        </main>

        <footer className="pub-footer">
          <div className="pub-footer-inner">
            <span className="pub-powered">Powered by LX2</span>
            <Link href="/" className="pub-cta">Score your next round →</Link>
          </div>
        </footer>
      </div>
    </>
  )
}

const STYLES = `
  .pub-wrap {
    min-height: 100dvh;
    background: #F2F5F0;
    font-family: var(--font-dm-sans), 'DM Sans', system-ui, sans-serif;
    color: #1A2E1A;
    display: flex;
    flex-direction: column;
  }
  .pub-header {
    padding: 1.25rem;
    text-align: center;
  }
  .pub-logo {
    font-family: var(--font-manrope), 'Manrope', sans-serif;
    font-weight: 700;
    font-size: 1.125rem;
    color: #1A2E1A;
    letter-spacing: -0.01em;
  }
  .pub-logo-accent { color: #0D631B; }
  .pub-main {
    flex: 1;
    max-width: 640px;
    margin: 0 auto;
    padding: 0 1.5rem 2rem;
    width: 100%;
  }
  .pub-title {
    font-family: var(--font-dm-serif), 'DM Serif Display', serif;
    font-size: 2rem;
    color: #1A2E1A;
    margin: 0 0 0.375rem;
    line-height: 1.15;
  }
  .pub-date {
    font-size: 0.875rem;
    color: #72786E;
    margin: 0 0 1.5rem;
  }
  .pub-content {
    background: #FFFFFF;
    border: 1.5px solid #E0EBE0;
    border-radius: 14px;
    padding: 1.5rem;
  }
  .pub-para {
    font-size: 1rem;
    line-height: 1.7;
    margin: 0 0 1.125rem;
    color: #1A2E1A;
  }
  .pub-para:last-child { margin-bottom: 0; }
  .pub-footer {
    background: #111D11;
    padding: 1.5rem;
    margin-top: auto;
  }
  .pub-footer-inner {
    max-width: 640px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .pub-powered {
    font-size: 0.8125rem;
    color: rgba(255,255,255,0.6);
  }
  .pub-cta {
    font-size: 0.875rem;
    font-weight: 600;
    color: #FFFFFF;
    text-decoration: none;
    transition: opacity 0.15s;
  }
  .pub-cta:hover { opacity: 0.8; }
`
