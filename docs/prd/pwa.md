# PRD: Progressive Web App

**Module:** `pwa`
**Phase:** MVP
**Status:** Building
**Last updated:** March 2026

---

## Problem

Golf is played outdoors, often in areas with limited or no cellular connectivity. A golfer entering scores on the 12th hole of a rural course cannot afford to lose their data because the network dropped. LX2 must work reliably offline: scores entered without connectivity should be queued locally and synced when the connection returns. Additionally, the app should feel native -- installable on the home screen, launching in standalone mode without browser chrome, and loading fast even on slow 3G connections.

## Goal

Deliver a Progressive Web App experience with offline score queuing via IndexedDB, a service worker for asset caching, and a web app manifest for home screen installation, ensuring that scoring never fails due to connectivity.

## Users

- **Primary:** Players entering scores on the course, where connectivity is unreliable
- **Secondary:** All LX2 users who install the PWA for a native-like experience

## Core requirements

### Must have

- **Web App Manifest** (`manifest.json`) with:
  - App name: "LX2"
  - Display mode: `standalone` (no browser chrome)
  - Background colour: `#0a1f0a` (matches header)
  - Theme colour: `#0D631B` (primary green)
  - Icons: 192x192, 512x512, and 512x512 maskable
- **IndexedDB offline score queue** (`offline-queue.ts`):
  - Database: `lx2`, version 1, object store: `offline_scores`
  - Composite key: `[scorecard_id, hole_number]` (upsert semantics via `put()`)
  - `enqueueScore()`: upsert a score entry with timestamp
  - `getQueuedScores(scorecardId)`: retrieve all queued entries for a scorecard
  - `deleteQueuedScore(scorecardId, holeNumber)`: remove after successful sync
  - `migrateFromLocalStorage(scorecardId)`: one-time migration from legacy localStorage queue (idempotent)
- **Per-scorecard draining guard**: when syncing queued scores, drain one scorecard at a time to prevent race conditions where multiple scorecards sync simultaneously and overwhelm the connection
- **OfflineBanner component**: visual indicator when the user is offline, with pending score count
- **Service worker** for asset caching (HTML shell, JS bundles, CSS, fonts, icons)

### Should have

- Automatic sync when connectivity returns (`navigator.onLine` + `online` event listener)
- Retry logic for failed sync attempts (exponential backoff)
- Cache-first strategy for static assets, network-first for API calls
- Background sync API integration (where supported by browser)
- Offline-capable course data (courses.ts is already bundled client-side)

### Won't have (this phase)

- Full offline event creation (requires server-side validation)
- Offline leaderboard computation (requires all players' scores)
- Push notifications for score updates or event reminders
- Native app wrappers (Capacitor, React Native)
- Offline course map/GPS features

## Technical implementation

### IndexedDB schema

```
Database: lx2 (version 1)
Object store: offline_scores
  Key path: [scorecard_id, hole_number] (composite)
  Fields:
    - scorecard_id: string (UUID)
    - hole_number: number (1-18)
    - gross_strokes: number | null
    - queued_at: number (Date.now() timestamp)
```

### Queue entry type

```typescript
interface QueueEntry {
  scorecard_id: string
  hole_number: number
  gross_strokes: number | null
  queued_at: number
}
```

### Sync flow

1. Player enters a score on a hole
2. Score is immediately written to IndexedDB via `enqueueScore()`
3. Simultaneously, an API call attempts to write to Supabase
4. If the API call succeeds: `deleteQueuedScore()` removes the entry
5. If the API call fails (network error): entry stays in IndexedDB
6. When connectivity returns (`online` event): drain the queue for the current scorecard
7. Per-scorecard draining guard ensures only one scorecard syncs at a time
8. Each entry is synced individually; on success, it is deleted from IndexedDB

### Migration from localStorage

The original implementation stored offline scores in `localStorage` under the key `lx2_offline_queue_{scorecardId}`. The `migrateFromLocalStorage()` function reads this data, converts it to `QueueEntry` format, writes to IndexedDB, and deletes the localStorage key. It is safe to call on every mount (idempotent via `put()`).

### Manifest configuration

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

## Open questions

- [ ] Which service worker strategy to use -- Workbox, Serwist, or custom?
- [ ] Should we precache all course data for fully offline scorecard rendering?
- [ ] How to handle conflict resolution if a score is edited online by the organiser while the player has an offline version queued?
- [ ] Should we implement Background Sync API for automatic queue draining?
- [ ] What is the maximum age for a queued score before it is considered stale?

## Links

- Offline queue: `apps/web/src/lib/offline-queue.ts`
- Manifest: `apps/web/public/manifest.json`
- Icons: `apps/web/public/icons/`
- Related PRD: `docs/prd/realtime.md`
- Related PRD: `docs/prd/auth.md`
