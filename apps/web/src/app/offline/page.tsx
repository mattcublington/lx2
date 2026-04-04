'use client'

import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    function onOnline() {
      window.location.href = '/play'
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [])

  function handleRetry() {
    setChecking(true)
    // Try to reach the server
    fetch('/play', { cache: 'no-store' })
      .then(res => {
        if (res.ok) {
          window.location.href = '/play'
        } else {
          setChecking(false)
        }
      })
      .catch(() => setChecking(false))
  }

  return (
    <>
      <style>{`
        .offline-container {
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          background: #F2F5F0;
          font-family: var(--font-dm-sans), sans-serif;
          color: #1A2E1A;
          text-align: center;
        }
        .offline-icon {
          font-size: 64px;
          margin-bottom: 24px;
          opacity: 0.6;
        }
        .offline-title {
          font-family: var(--font-dm-serif), serif;
          font-size: 28px;
          font-weight: 400;
          margin: 0 0 12px;
          color: #1A2E1A;
        }
        .offline-message {
          font-size: 16px;
          color: #6B8C6B;
          margin: 0 0 32px;
          max-width: 320px;
          line-height: 1.5;
        }
        .offline-retry {
          background: #0D631B;
          color: #fff;
          border: none;
          border-radius: 12px;
          padding: 14px 32px;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s, transform 0.15s;
        }
        .offline-retry:hover {
          background: #0a4f15;
          transform: translateY(-1px);
        }
        .offline-retry:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .offline-hint {
          margin-top: 24px;
          font-size: 13px;
          color: #6B8C6B;
        }
      `}</style>
      <div className="offline-container">
        <div className="offline-icon">⛳</div>
        <h1 className="offline-title">You&apos;re offline</h1>
        <p className="offline-message">
          No internet connection. If you&apos;re mid-round, your scores are saved locally and will sync when you&apos;re back online.
        </p>
        <button
          className="offline-retry"
          onClick={handleRetry}
          disabled={checking}
        >
          {checking ? 'Checking...' : 'Try again'}
        </button>
        <p className="offline-hint">
          This page will reconnect automatically
        </p>
      </div>
    </>
  )
}
