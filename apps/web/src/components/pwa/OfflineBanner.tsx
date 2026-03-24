'use client'
import { useEffect, useState } from 'react'

type BannerState = 'hidden' | 'offline' | 'syncing'

export default function OfflineBanner() {
  const [state, setState] = useState<BannerState>('hidden')

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | null = null
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    function clearTimers() {
      if (hideTimer) clearTimeout(hideTimer)
      if (fallbackTimer) clearTimeout(fallbackTimer)
    }

    function onOffline() {
      clearTimers()
      setState('offline')
    }

    function onOnline() {
      clearTimers()
      // Give ScoreEntryLive 3s to fire lx2:sync-start; hide if it doesn't
      // (user is on a non-scoring page — no queue to drain)
      fallbackTimer = setTimeout(() => setState('hidden'), 3000)
    }

    function onSyncStart() {
      clearTimers()
      setState('syncing')
    }

    function onSyncComplete() {
      clearTimers()
      hideTimer = setTimeout(() => setState('hidden'), 2000)
    }

    // Reflect current connectivity on mount (useEffect is browser-only — navigator always defined)
    if (!navigator.onLine) {
      setState('offline')
    }

    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    window.addEventListener('lx2:sync-start', onSyncStart)
    window.addEventListener('lx2:sync-complete', onSyncComplete)

    return () => {
      clearTimers()
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('lx2:sync-start', onSyncStart)
      window.removeEventListener('lx2:sync-complete', onSyncComplete)
    }
  }, [])

  if (state === 'hidden') return null

  return (
    <>
      <style>{`
        @keyframes lx2-banner-in {
          from { transform: translateY(-100%); }
          to   { transform: translateY(0); }
        }
        .lx2-offline-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          background: #1A2E1A;
          color: #F2F5F0;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 13px;
          font-weight: 400;
          padding: 10px 20px;
          text-align: center;
          animation: lx2-banner-in 200ms ease-out;
        }
      `}</style>
      <div className="lx2-offline-banner" role="status" aria-live="polite">
        {state === 'offline'
          ? '● Offline — scores saved locally, will sync when connected'
          : '↻ Syncing scores...'}
      </div>
    </>
  )
}
