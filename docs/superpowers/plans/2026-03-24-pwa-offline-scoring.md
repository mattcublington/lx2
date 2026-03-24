# PWA Support with Offline Score Queue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PWA installability and offline score queuing to `apps/web` so golfers can enter scores through dead zones without losing data.

**Architecture:** Hand-rolled service worker (no Workbox) caches the app shell and scoring pages using cache-first / network-first strategies. The existing `localStorage` offline queue in `ScoreEntryLive.tsx` is migrated to IndexedDB (survives page close/refresh). A global `OfflineBanner` component shows status using window custom events. Zero new npm dependencies except `vitest` + `fake-indexeddb` for testing.

**Tech Stack:** Next.js 15 App Router, Raw Cache API (service worker), Raw IndexedDB API, React custom events, Sharp (icon generation, already available in monorepo node_modules).

**Spec:** `docs/superpowers/specs/2026-03-24-pwa-offline-scoring-design.md`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/web/scripts/generate-pwa-icons.js` | One-off Node script — generates 4 PNG icons from `lx2-logo.svg` |
| Create | `apps/web/public/icons/icon-192.png` | Android install icon (output of script) |
| Create | `apps/web/public/icons/icon-512.png` | Android splash icon (output of script) |
| Create | `apps/web/public/icons/icon-512-maskable.png` | Android adaptive/maskable icon with bleed (output of script) |
| Create | `apps/web/public/icons/apple-touch.png` | iOS home screen icon 180×180 (output of script) |
| Create | `apps/web/public/manifest.json` | PWA manifest |
| Create | `apps/web/public/sw.js` | Service worker — cache-first for static assets, network-first for navigation |
| Create | `apps/web/vitest.config.ts` | Vitest config for apps/web with `@/*` alias |
| Create | `apps/web/src/lib/offline-queue.ts` | IndexedDB queue — enqueue, drain, delete, migrate from localStorage |
| Create | `apps/web/src/__tests__/offline-queue.test.ts` | Unit tests for offline-queue module |
| Create | `apps/web/src/components/pwa/ServiceWorkerRegistration.tsx` | Client component — registers sw.js on mount |
| Create | `apps/web/src/components/pwa/OfflineBanner.tsx` | Client component — fixed banner showing offline/syncing state |
| Create | `apps/web/src/types/window-events.d.ts` | TypeScript declaration extending `WindowEventMap` with `lx2:*` custom events |
| Modify | `apps/web/src/app/layout.tsx` | Add PWA meta tags + manifest link; mount SW registration + banner |
| Modify | `apps/web/src/app/rounds/[id]/score/ScoreEntryLive.tsx` | Replace localStorage queue with IndexedDB queue; add migration; emit sync events; remove inline offline indicator |
| Modify | `apps/web/package.json` | Add `vitest` + `fake-indexeddb` as devDependencies |

---

## Task 1: Generate PWA Icons

**Files:**
- Create: `apps/web/scripts/generate-pwa-icons.js`
- Create: `apps/web/public/icons/` (directory + 4 PNG files)

- [ ] **Step 1: Create the icon generation script**

Create `apps/web/scripts/generate-pwa-icons.js`:

```js
// Run with: node scripts/generate-pwa-icons.js
// Requires: sharp (available in monorepo node_modules)
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const srcSvg = path.join(__dirname, '../public/lx2-logo.svg')
const outDir = path.join(__dirname, '../public/icons')

fs.mkdirSync(outDir, { recursive: true })

const BG = { r: 10, g: 31, b: 10, alpha: 1 } // #0a1f0a

async function generate() {
  const svgBuf = fs.readFileSync(srcSvg)

  // icon-192.png — plain, no padding needed
  await sharp(svgBuf)
    .resize(192, 192, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(outDir, 'icon-192.png'))
  console.log('✓ icon-192.png')

  // icon-512.png — plain
  await sharp(svgBuf)
    .resize(512, 512, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(outDir, 'icon-512.png'))
  console.log('✓ icon-512.png')

  // icon-512-maskable.png — logo within central 80% safe zone (≈410×410)
  // Logo rendered at 410×410, then padded to 512×512 with bg colour
  const logoLayer = await sharp(svgBuf)
    .resize(410, 410, { fit: 'contain', background: BG })
    .png()
    .toBuffer()

  await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
    .composite([{ input: logoLayer, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'icon-512-maskable.png'))
  console.log('✓ icon-512-maskable.png')

  // apple-touch.png — 180×180
  await sharp(svgBuf)
    .resize(180, 180, { fit: 'contain', background: BG })
    .png()
    .toFile(path.join(outDir, 'apple-touch.png'))
  console.log('✓ apple-touch.png')

  console.log('\nAll icons generated in public/icons/')
}

generate().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Run the script**

```bash
cd apps/web && node scripts/generate-pwa-icons.js
```

Expected output:
```
✓ icon-192.png
✓ icon-512.png
✓ icon-512-maskable.png
✓ apple-touch.png

All icons generated in public/icons/
```

- [ ] **Step 3: Verify the icons were created**

```bash
ls -lh apps/web/public/icons/
```

Expected: 4 PNG files, each between 5–60 KB.

- [ ] **Step 4: Commit**

```bash
git add apps/web/scripts/generate-pwa-icons.js apps/web/public/icons/
git commit -m "feat: generate PWA icons from lx2-logo.svg"
```

---

## Task 2: Create manifest.json

**Files:**
- Create: `apps/web/public/manifest.json`

- [ ] **Step 1: Write the manifest**

Create `apps/web/public/manifest.json`:

```json
{
  "name": "LX2",
  "short_name": "LX2",
  "description": "Golf scoring and society management",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a1f0a",
  "theme_color": "#0D631B",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/public/manifest.json
git commit -m "feat: add PWA manifest"
```

---

## Task 3: Create the Service Worker

**Files:**
- Create: `apps/web/public/sw.js`

The SW handles three fetch categories:
1. `/_next/static/**` — cache-first (immutable content-hashed files)
2. Navigation requests (`request.mode === 'navigate'`) — network-first, cache fallback
3. Everything else — network-only (Supabase API calls, images)

On each production deploy that changes server-rendered HTML, bump `CACHE_VERSION` (e.g. `'v1'` → `'v2'`). The activate handler automatically removes old caches.

- [ ] **Step 1: Write the service worker**

Create `apps/web/public/sw.js`:

```js
// ─── BUMP THIS ON EVERY DEPLOY THAT CHANGES SERVER-RENDERED HTML ───────────
const CACHE_VERSION = 'v1'
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = `lx2-${CACHE_VERSION}`

// Install: skip waiting so the new SW activates immediately
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Activate: delete stale caches, claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ─── Cache strategies ─────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    // If we have nothing cached, let the error propagate
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

// ─── Fetch handler ────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin or next.js static assets
  if (url.origin !== self.location.origin) return

  // Static assets: cache-first (content-hashed, safe to cache forever)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Navigation requests: network-first with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  // Everything else: network-only (Supabase API, images, etc.)
})
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/public/sw.js
git commit -m "feat: add service worker with cache-first/network-first strategies"
```

---

## Task 4: IndexedDB Queue Module + Tests

**Files:**
- Modify: `apps/web/package.json` — add devDependencies
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/lib/offline-queue.ts`
- Create: `apps/web/src/__tests__/offline-queue.test.ts`

- [ ] **Step 0: Verify lx2-logo.svg exists**

```bash
ls apps/web/public/lx2-logo.svg
```

Expected: file listed. If missing, the icon script in Task 1 cannot run.

- [ ] **Step 1: Install test dependencies (includes jsdom for browser globals)**

```bash
cd apps/web && npm install --save-dev vitest jsdom fake-indexeddb
```

Expected: `vitest` and `fake-indexeddb` added to `devDependencies` in `apps/web/package.json`.

- [ ] **Step 2: Add test script to apps/web/package.json**

In `apps/web/package.json`, add to `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest.config.ts**

Create `apps/web/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // jsdom provides window, localStorage, navigator.onLine and other browser globals
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: Write the failing tests first**

Create `apps/web/src/__tests__/offline-queue.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { enqueueScore, getQueuedScores, deleteQueuedScore, migrateFromLocalStorage } from '@/lib/offline-queue'

// Reset IndexedDB to a fresh instance before each test
beforeEach(() => {
  // @ts-expect-error — assigning fake implementation to global
  global.indexedDB = new IDBFactory()
})

describe('enqueueScore', () => {
  it('stores a score entry', async () => {
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 4, queued_at: 1000 })
    const results = await getQueuedScores('sc1')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 4 })
  })

  it('overwrites an existing entry for the same hole (upsert)', async () => {
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 4, queued_at: 1000 })
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 5, queued_at: 2000 })
    const results = await getQueuedScores('sc1')
    expect(results).toHaveLength(1)
    expect(results[0].gross_strokes).toBe(5)
  })

  it('stores null gross_strokes for a pickup', async () => {
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 3, gross_strokes: null, queued_at: 1000 })
    const results = await getQueuedScores('sc1')
    expect(results[0].gross_strokes).toBeNull()
  })
})

describe('getQueuedScores', () => {
  it('returns only scores for the given scorecard_id', async () => {
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 4, queued_at: 1000 })
    await enqueueScore({ scorecard_id: 'sc2', hole_number: 1, gross_strokes: 5, queued_at: 1000 })
    const results = await getQueuedScores('sc1')
    expect(results).toHaveLength(1)
    expect(results[0].scorecard_id).toBe('sc1')
  })

  it('returns empty array when no entries exist', async () => {
    const results = await getQueuedScores('nonexistent')
    expect(results).toEqual([])
  })
})

describe('deleteQueuedScore', () => {
  it('removes a specific hole entry', async () => {
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 1, gross_strokes: 4, queued_at: 1000 })
    await enqueueScore({ scorecard_id: 'sc1', hole_number: 2, gross_strokes: 3, queued_at: 1000 })
    await deleteQueuedScore('sc1', 1)
    const results = await getQueuedScores('sc1')
    expect(results).toHaveLength(1)
    expect(results[0].hole_number).toBe(2)
  })

  it('is a no-op if the entry does not exist', async () => {
    await expect(deleteQueuedScore('sc1', 99)).resolves.toBeUndefined()
  })
})

describe('migrateFromLocalStorage', () => {
  it('migrates legacy queue entries to IndexedDB and clears localStorage', async () => {
    const legacyKey = 'lx2_offline_queue_sc1'
    // @ts-expect-error — localStorage is available in vitest node env via globalThis
    global.localStorage = {
      getItem: (key: string) => key === legacyKey
        ? JSON.stringify([{ holeInRound: 1, value: 4 }, { holeInRound: 2, value: null }])
        : null,
      removeItem: vi.fn(),
      setItem: vi.fn(),
    }
    await migrateFromLocalStorage('sc1')
    const results = await getQueuedScores('sc1')
    expect(results).toHaveLength(2)
    expect(results.find(r => r.hole_number === 1)?.gross_strokes).toBe(4)
    expect(results.find(r => r.hole_number === 2)?.gross_strokes).toBeNull()
    // @ts-expect-error
    expect(global.localStorage.removeItem).toHaveBeenCalledWith(legacyKey)
  })

  it('does nothing when no legacy key exists', async () => {
    // @ts-expect-error
    global.localStorage = { getItem: () => null, removeItem: vi.fn(), setItem: vi.fn() }
    await expect(migrateFromLocalStorage('sc1')).resolves.toBeUndefined()
    const results = await getQueuedScores('sc1')
    expect(results).toEqual([])
  })
})
```

- [ ] **Step 5: Run tests — verify they fail with "Cannot find module"**

```bash
cd apps/web && npx vitest run
```

Expected: FAIL — `Cannot find module '@/lib/offline-queue'`

- [ ] **Step 6: Implement offline-queue.ts**

Create `apps/web/src/lib/offline-queue.ts`:

```typescript
// IndexedDB-backed offline score queue.
// Replaces the localStorage queue previously in ScoreEntryLive.tsx.

const DB_NAME = 'lx2'
const DB_VERSION = 1
const STORE = 'offline_scores'

export interface QueueEntry {
  scorecard_id: string
  hole_number: number
  gross_strokes: number | null
  queued_at: number // Date.now()
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: ['scorecard_id', 'hole_number'] })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Upsert a score entry. Overwrites any existing entry for the same scorecard+hole. */
export async function enqueueScore(entry: QueueEntry): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(entry)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

/** Return all queued entries for a given scorecard, in insertion order. */
export async function getQueuedScores(scorecardId: string): Promise<QueueEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      db.close()
      resolve((req.result as QueueEntry[]).filter(e => e.scorecard_id === scorecardId))
    }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

/** Delete a single queued entry after it has been successfully synced. */
export async function deleteQueuedScore(scorecardId: string, holeNumber: number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete([scorecardId, holeNumber])
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

/**
 * One-time migration from legacy localStorage queue.
 * Safe to call on every mount — uses put() so double-runs are idempotent.
 */
export async function migrateFromLocalStorage(scorecardId: string): Promise<void> {
  const key = `lx2_offline_queue_${scorecardId}`
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return
    const entries = JSON.parse(raw) as Array<{ holeInRound: number; value: number | null }>
    for (const e of entries) {
      await enqueueScore({
        scorecard_id: scorecardId,
        hole_number: e.holeInRound,
        gross_strokes: e.value,
        queued_at: Date.now(),
      })
    }
    localStorage.removeItem(key)
  } catch { /* ignore — storage unavailable or malformed JSON */ }
}
```

- [ ] **Step 7: Run tests — verify they pass**

```bash
cd apps/web && npx vitest run
```

Expected: All tests PASS. Output similar to:
```
✓ src/__tests__/offline-queue.test.ts (9 tests)
Test Files  1 passed (1)
Tests       9 passed (9)
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/package.json apps/web/vitest.config.ts apps/web/src/lib/offline-queue.ts apps/web/src/__tests__/offline-queue.test.ts
git commit -m "feat: IndexedDB offline queue module with tests"
```

---

## Task 5: TypeScript Declaration for Custom Window Events

**Files:**
- Create: `apps/web/src/types/window-events.d.ts`

TypeScript will error on `window.addEventListener('lx2:sync-start', ...)` because `'lx2:sync-start'` is not a key in `WindowEventMap`. We extend the interface globally to silence this correctly (no `as any` casts needed).

- [ ] **Step 1: Create the declaration file**

Create `apps/web/src/types/window-events.d.ts`:

```typescript
// Extends the global WindowEventMap with LX2-specific custom events
// so window.addEventListener('lx2:sync-start', ...) is fully typed.
declare global {
  interface WindowEventMap {
    'lx2:sync-start': CustomEvent
    'lx2:sync-complete': CustomEvent
  }
}

export {}
```

- [ ] **Step 2: Verify TypeScript picks it up**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No errors related to `lx2:sync-start` or `lx2:sync-complete`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/types/window-events.d.ts
git commit -m "chore: declare lx2 custom window events in TypeScript"
```

---

## Task 7: ServiceWorkerRegistration Component

**Files:**
- Create: `apps/web/src/components/pwa/ServiceWorkerRegistration.tsx`

- [ ] **Step 1: Write the component**

Create `apps/web/src/components/pwa/ServiceWorkerRegistration.tsx`:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/pwa/ServiceWorkerRegistration.tsx
git commit -m "feat: ServiceWorkerRegistration client component"
```

---

## Task 8: OfflineBanner Component

**Files:**
- Create: `apps/web/src/components/pwa/OfflineBanner.tsx`

Three states: `hidden` → `offline` (on `offline` event) → `syncing` (on `lx2:sync-start`) → `hidden` (2s after `lx2:sync-complete`, or 2s after `online` event if no sync event fires within 3s).

- [ ] **Step 1: Write the component**

Create `apps/web/src/components/pwa/OfflineBanner.tsx`:

```tsx
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

    // Reflect current connectivity on mount
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
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
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/pwa/OfflineBanner.tsx
git commit -m "feat: OfflineBanner component for offline/syncing state"
```

---

## Task 9: Update layout.tsx

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

Add PWA meta tags into the `<head>` via Next.js metadata API where possible, and directly via JSX for tags Next.js metadata doesn't cover. Mount `<ServiceWorkerRegistration>` and `<OfflineBanner>` inside `<body>`.

- [ ] **Step 1: Update the metadata export**

In `apps/web/src/app/layout.tsx`, replace the existing `metadata` export:

```typescript
export const metadata: Metadata = {
  title: 'LX2',
  description: 'Golf scoring, stats and society management',
  openGraph: {
    title: 'LX2',
    description: 'Golf scoring, stats and society management',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LX2',
  },
  other: {
    'theme-color': '#0D631B',
  },
}
```

- [ ] **Step 2: Add the apple-touch-icon link and mount components**

Add imports at the top of `layout.tsx`:

```typescript
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration'
import OfflineBanner from '@/components/pwa/OfflineBanner'
```

Update the `RootLayout` return — add the apple-touch-icon link in `<head>` and mount the components in `<body>`:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={[
        dmSans.variable,
        dmSerifDisplay.variable,
        manrope.variable,
        lexend.variable,
        cormorant.variable,
      ].join(' ')}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch.png" />
      </head>
      <body>
        <ServiceWorkerRegistration />
        <OfflineBanner />
        {children}
      </body>
    </html>
  )
}
```

> Note: `manifest`, `appleWebApp`, and `theme-color` are handled by the Next.js `metadata` export above — Next.js renders these as `<link rel="manifest">`, `<meta name="apple-mobile-web-app-*">`, and `<meta name="theme-color">` automatically. The `apple-touch-icon` link is added manually because Next.js metadata doesn't have a first-class field for it.

- [ ] **Step 3: Verify TypeScript**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat: add PWA meta tags and mount SW + banner in layout"
```

---

## Task 10: Update ScoreEntryLive.tsx

**Files:**
- Modify: `apps/web/src/app/rounds/[id]/score/ScoreEntryLive.tsx`

This is the largest change. We are:
1. Removing the three `localStorage` helpers (`enqueue`, `dequeue`, `clearQueue`) and the `QueueEntry`/`queueKey` code at lines 123–152
2. Importing from `offline-queue.ts` instead
3. Adding a module-level `draining` flag
4. Adding a migration `useEffect` on mount
5. Rewriting `drainQueue` to use IndexedDB + emit custom events + respect the draining flag
6. Rewriting `persistScore` to use `enqueueScore` from the module
7. Removing `syncError` state and its setter calls
8. Removing the inline offline banner JSX (lines 557–561) — replaced by the global `OfflineBanner`

- [ ] **Step 1: Add import and module-level draining flag**

At the top of `ScoreEntryLive.tsx`, after existing imports, add:

```typescript
import { enqueueScore, getQueuedScores, deleteQueuedScore, migrateFromLocalStorage } from '@/lib/offline-queue'

// Prevents concurrent drain runs if the user toggles offline→online rapidly.
// Module-level (not component state) so it survives re-renders.
let draining = false
```

- [ ] **Step 2: Remove the localStorage offline queue section**

Delete lines 123–152 (the entire `// ─── Offline queue ───` section including `QueueEntry`, `queueKey`, `enqueue`, `dequeue`, `clearQueue`).

- [ ] **Step 3: Remove syncError state and isOnline state**

Remove these lines from the component body:
```typescript
const [syncError, setSyncError] = useState(false)
const [isOnline, setIsOnline] = useState(true)
```

Also remove the entire online/offline detection `useEffect` (the one that calls `setIsOnline`) — it exists solely to update those two now-deleted state variables.

And remove the drain trigger `useEffect`:
```typescript
useEffect(() => {
  if (isOnline) drainQueue()
}, [isOnline, drainQueue])
```

We replace the drain trigger in Step 5 with a direct event listener.

- [ ] **Step 4: Add localStorage migration effect**

After the Supabase client `useRef` (around line 219), add a new `useEffect`:

```typescript
// One-time migration from legacy localStorage queue
useEffect(() => {
  migrateFromLocalStorage(scorecardId)
}, [scorecardId])
```

- [ ] **Step 5: Rewrite drainQueue and add direct online event listener**

Replace the existing `drainQueue` callback (lines 266–279) with:

```typescript
const drainQueue = useCallback(async () => {
  if (draining) return
  draining = true
  window.dispatchEvent(new CustomEvent('lx2:sync-start'))
  try {
    const queue = await getQueuedScores(scorecardId)
    for (const entry of queue) {
      const { error } = await sb.from('hole_scores').upsert({
        scorecard_id: scorecardId,
        hole_number: entry.hole_number,
        gross_strokes: entry.gross_strokes,
      }, { onConflict: 'scorecard_id,hole_number' })
      if (!error) {
        await deleteQueuedScore(scorecardId, entry.hole_number)
      }
      // On error: leave in IndexedDB, retry on next online event
    }
  } finally {
    draining = false
    window.dispatchEvent(new CustomEvent('lx2:sync-complete'))
  }
}, [sb, scorecardId])

Then add a `useEffect` to wire up the drain trigger via a direct event listener (replacing the removed `isOnline` state-based trigger):

```typescript
// Trigger drain directly from the online event — no isOnline state needed
useEffect(() => {
  window.addEventListener('online', drainQueue)
  return () => window.removeEventListener('online', drainQueue)
}, [drainQueue])
```

- [ ] **Step 6: Rewrite persistScore**

Replace the existing `persistScore` function (lines 343–360) with:

```typescript
async function persistScore(holeInRound: number, value: number | null) {
  const entry = { scorecard_id: scorecardId, hole_number: holeInRound, gross_strokes: value, queued_at: Date.now() }
  if (!navigator.onLine) {
    await enqueueScore(entry)
    return
  }
  const { error } = await sb.from('hole_scores').upsert({
    scorecard_id: scorecardId,
    hole_number: holeInRound,
    gross_strokes: value,
  }, { onConflict: 'scorecard_id,hole_number' })
  if (error) {
    await enqueueScore(entry)
  }
}
```

- [ ] **Step 7: Remove the inline offline banner JSX**

Delete lines 556–561:
```tsx
{/* Offline banner */}
{(!isOnline || syncError) && (
  <div style={{ background: syncError ? '#fff3e0' : '#f0f4ec', borderBottom: '1px solid ' + (syncError ? '#f0a040' : '#d0d8cc'), padding: '6px 14px', fontSize: 12, color: syncError ? '#8a4e00' : '#4a5e4a', textAlign: 'center', fontWeight: 500 }}>
    {syncError ? 'Sync error — scores saved locally, will retry' : 'Offline — scores saved locally'}
  </div>
)}
```

The global `OfflineBanner` mounted in `layout.tsx` handles this now.

- [ ] **Step 8: Check for remaining dead-code references**

```bash
grep -n "syncError\|setSyncError\|isOnline\|setIsOnline" apps/web/src/app/rounds/\[id\]/score/ScoreEntryLive.tsx
```

Expected: no output (all removed). Note: `navigator.onLine` in `persistScore` is correct and should remain.

- [ ] **Step 9: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 10: Run tests**

```bash
cd apps/web && npx vitest run
```

Expected: All 9 tests PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/web/src/app/rounds/\[id\]/score/ScoreEntryLive.tsx
git commit -m "feat: migrate ScoreEntryLive offline queue from localStorage to IndexedDB"
```

---

## Task 11: End-to-End Manual Test

Use Chrome DevTools to simulate offline. Open the scoring page for a real or test round.

- [ ] **Step 1: Start dev server**

```bash
# Use the .claude/launch.json config for apps/web (port 3000)
```

- [ ] **Step 2: Load the scoring page online**

Navigate to `/rounds/[id]/score`. Verify the page loads and scores can be entered normally.

Open DevTools → Application → Service Workers. Verify `sw.js` is registered and status is "activated and running".

- [ ] **Step 3: Enable offline mode**

DevTools → Network → throttle dropdown → "Offline".

- [ ] **Step 4: Enter 3 holes of scores**

Tap score buttons for holes 1, 2, 3. Each should respond immediately (no error). Verify the `● Offline — scores saved locally` banner appears at the top.

- [ ] **Step 5: Refresh the page offline**

Hit browser refresh. The scoring page should load from the SW cache — hole data intact, previously entered scores showing.

- [ ] **Step 6: Re-enable network**

DevTools → Network → throttle → "No throttling".

- [ ] **Step 7: Verify sync**

Banner should transition to "↻ Syncing scores..." then disappear after 2 seconds.

- [ ] **Step 8: Verify scores in Supabase**

Check the `hole_scores` table in Supabase dashboard. All 3 entries should be present with the correct `scorecard_id` and `gross_strokes` values.

- [ ] **Step 9: Test installability (optional, requires real device or emulator)**

On Android Chrome: navigate to `/`, tap the "Add to Home Screen" prompt. Verify icon (no clipping on the maskable variant), splash screen colour is `#0a1f0a`, app opens in standalone mode.

---

## Task 12: Final Commit

- [ ] **Step 1: Verify clean tree**

```bash
git status
```

Expected: working tree clean (all changes committed in prior tasks).

- [ ] **Step 2: Final commit message**

All changes are already committed incrementally. Create a merge/summary commit if working on a branch, or confirm the final commit message matches the spec:

```bash
git log --oneline -8
```

Expected recent commits:
```
feat: migrate ScoreEntryLive offline queue from localStorage to IndexedDB
feat: add PWA meta tags and mount SW + banner in layout
feat: OfflineBanner component for offline/syncing state
feat: ServiceWorkerRegistration client component
feat: IndexedDB offline queue module with tests
feat: add service worker with cache-first/network-first strategies
feat: add PWA manifest
feat: generate PWA icons from lx2-logo.svg
```

If creating a single squashed commit instead, use:
```bash
git commit -m "feat: PWA support with offline score queue"
```

---

## Reminders for Future Deploys

- **Bump `CACHE_VERSION`** in `apps/web/public/sw.js` on every production deploy that changes server-rendered HTML or removes previously-cached JS chunk filenames. Stale cached HTML pointing at non-existent chunks will break offline users.
- **Regenerate icons** if `lx2-logo.svg` changes: `cd apps/web && node scripts/generate-pwa-icons.js`
