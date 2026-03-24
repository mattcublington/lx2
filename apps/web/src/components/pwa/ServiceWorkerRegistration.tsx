'use client'
import { useEffect } from 'react'

// Registration is idempotent — calling register() twice with the same URL is safe.
// In React Strict Mode (dev only) this effect fires twice — that is benign.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('[SW] Registration failed:', err)
      })
    }
  }, [])

  return null
}
