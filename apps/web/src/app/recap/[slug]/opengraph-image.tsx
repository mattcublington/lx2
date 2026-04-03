import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'
export const alt = 'Round Recap'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function OgImage({ params }: Props) {
  const { slug } = await params
  const admin = createAdminClient()

  const { data: recap } = await admin
    .from('event_recaps')
    .select('event_id, commentary_group')
    .eq('recap_slug', slug)
    .maybeSingle()

  let eventName = 'Round Recap'
  let snippet = ''

  if (recap) {
    const { data: event } = await admin
      .from('events')
      .select('name, date')
      .eq('id', recap.event_id)
      .single()

    if (event) {
      eventName = event.name
    }
    snippet = recap.commentary_group.slice(0, 120).replace(/\n/g, ' ') + '...'
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background: 'linear-gradient(135deg, #0a1f0a 0%, #1A2E1A 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: 40,
            letterSpacing: -0.5,
            display: 'flex',
          }}
        >
          LX<span style={{ color: '#3FAF5A' }}>2</span>
        </div>

        {/* Event name */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.15,
            marginBottom: 20,
            maxWidth: 900,
            display: 'flex',
          }}
        >
          {eventName}
        </div>

        {/* Snippet */}
        {snippet && (
          <div
            style={{
              fontSize: 22,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.4,
              maxWidth: 800,
              display: 'flex',
            }}
          >
            {snippet}
          </div>
        )}

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            left: 80,
            fontSize: 18,
            color: 'rgba(255,255,255,0.5)',
            display: 'flex',
          }}
        >
          lx2.golf — Score your next round
        </div>
      </div>
    ),
    { ...size },
  )
}
