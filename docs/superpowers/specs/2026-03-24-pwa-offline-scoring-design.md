# PWA Support with Offline Score Queue — Design Spec

**Date:** 2026-03-24
**Status:** Approved
**Scope:** `apps/web` only

---

## Problem

Golfers walk through dead zones mid-round. Without offline support, a lost connection causes score submissions to silently fail. The app shell also requires a network connection to load, making it unusable in areas with zero signal.

---

## Goals

- App shell loads offline after first visit
- Golfer can enter scores with no connection — they are queued locally
- Queue syncs automatically when connection returns (foreground)
- Subtle UI indicator when offline — no blocking modals
- App is installable to home screen (PWA manifest + meta tags)

---

## Non-Goals

- Background sync (OS-level, syncs when tab is closed) — not supported on iOS; deferred
- Full offline-first rewrite — server-rendered pages still require a network on first visit
- Caching Supabase API responses — only the rendered HTML pages are cached

---

## Approach

**Hand-rolled service worker + IndexedDB migration.** No new npm dependencies.

Rejected alternatives:
- `next-pwa` (Workbox wrapper) — heavy dependency, black-box, version-conflict history with Next.js
- Workbox CLI `injectManifest` mode — requires build pipeline changes, adds complexity without meaningful benefit over hand-rolled SW at this scale

---

## Architecture

### Files Created

| File | Purpose |
|------|---------|
| `apps/web/public/manifest.json` | PWA manifest (name, icons, theme, display mode) |
| `apps/web/public/sw.js` | Service worker (caching + registration hook) |
| `apps/web/public/icons/icon-192.png` | Android install icon |
| `apps/web/public/icons/icon-512.png` | Android splash / maskable icon |
| `apps/web/public/icons/apple-touch.png` | iOS home screen icon (180×180) |
| `apps/web/src/components/pwa/ServiceWorkerRegistration.tsx` | Client component — registers SW on mount |
| `apps/web/src/components/pwa/OfflineBanner.tsx` | Client component — fixed offline indicator |

### Files Modified

| File | Change |
|------|--------|
| `apps/web/src/app/layout.tsx` | Add manifest link, apple meta tags, mount `<ServiceWorkerRegistration>` |
| `apps/web/src/app/rounds/[id]/score/ScoreEntryLive.tsx` | Swap localStorage queue → IndexedDB; add localStorage migration; emit sync events to OfflineBanner |

---

## Service Worker Caching Strategy

Three asset categories, three strategies:

### 1. Static assets — Cache-first (keep forever)
**Pattern:** `/_next/static/**`

Next.js content-hashes these filenames. Once cached they are immutable. Cache on first fetch, serve from cache on subsequent requests. This covers all JS chunks, CSS, and `next/font`-loaded fonts.

### 2. Navigation requests — Network-first, cache fallback
**Pattern:** `request.mode === 'navigate'`

Attempt network; on failure (offline / timeout) serve cached HTML. Each route URL is a distinct cache entry. The first time a golfer loads `/rounds/[id]/score` online, the server-rendered HTML — including hole data baked in as props — is cached. On offline refresh, the cached page is served and scoring continues.

### 3. Everything else — Network-only
Supabase REST API calls, images, and any other requests are not cached. Supabase calls are authenticated and dynamic; caching them risks serving stale leaderboard data.

Score *upserts* are handled by the IndexedDB queue in the component — the SW does not intercept them.

### Cache Versioning

```js
const CACHE_VERSION = 'v1';
const CACHE_NAME = `lx2-${CACHE_VERSION}`;
```

On `activate`, the SW deletes all caches whose name does not match the current version. To invalidate cached pages on deploy, bump `CACHE_VERSION`. A comment in `sw.js` reminds developers to do this.

---

## IndexedDB Queue

Replaces the existing `localStorage`-based offline queue in `ScoreEntryLive.tsx`.

**Database:** `lx2`
**Object store:** `offline_scores`
**Key path:** `[scorecard_id, hole_number]` (compound — natural upsert semantics)

### Record shape

```ts
{
  scorecard_id: string;
  hole_number: number;
  gross_strokes: number | null;
  queued_at: number; // Date.now()
}
```

### Queue lifecycle

1. **Enqueue** — called instead of Supabase upsert when offline. Writes record to IndexedDB (overwrites existing entry for same hole).
2. **Drain** — called when the `online` event fires. Reads all records for current `scorecard_id`, upserts each to Supabase in order, deletes records on success. Fires `syncEvents` custom event to notify `OfflineBanner`.
3. **Migration** — on component mount, checks for legacy `lx2_offline_queue_${scorecardId}` in localStorage. If found, writes entries to IndexedDB, removes localStorage key. One-time, silent migration — no data loss for golfers mid-round.

No third-party IndexedDB library. Raw `indexedDB` API (~40 lines).

---

## Offline Banner

A fixed, full-width banner at the top of the viewport. Slides in when offline, slides out after sync.

### States

| State | Text | Trigger |
|-------|------|---------|
| Offline | `● Offline — scores saved locally, will sync when connected` | `offline` event |
| Syncing | `↻ Syncing scores...` | `lx2:sync-start` custom event |
| Hidden | — | 2s after `lx2:sync-complete` custom event |

### Visual spec

```
Background:  #1A2E1A
Text:        #F2F5F0, DM Sans 400, 13px
Padding:     10px 20px
Position:    fixed top-0, full width, z-index: 9999
Animation:   translateY(-100%) → translateY(0), 200ms ease-out
```

No blocking modal. No user action required.

### Event bus

`ScoreEntryLive` fires `CustomEvent` on `window`:
- `lx2:sync-start` — when drain begins
- `lx2:sync-complete` — when drain finishes

`OfflineBanner` listens for these events and transitions state accordingly. No prop drilling, no context.

---

## Manifest + Meta Tags

### `manifest.json`

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
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

`background_color` (`#0a1f0a`) is the header background — used as splash screen colour on Android while the app loads. `theme_color` (`#0D631B`) is the primary green.

### Meta tags added to `layout.tsx`

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0D631B" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="LX2" />
<link rel="apple-touch-icon" href="/icons/apple-touch.png" />
```

`black-translucent` keeps the iOS status bar transparent over the dark header.

### Icons

Generated from `lx2-logo.svg` using Sharp (available in the monorepo). Three outputs:
- `icon-192.png` — 192×192 (Android minimum for installability)
- `icon-512.png` — 512×512 (Android splash / maskable)
- `apple-touch.png` — 180×180 (iOS home screen)

---

## Testing Checklist

1. Start a round (`/rounds/[id]/score`) — load fully online
2. Enable airplane mode
3. Enter 3 holes of scores — verify each hole saves (no error, UI responds)
4. Refresh the page — verify the scoring page loads from SW cache
5. Verify offline banner shows "Offline — scores saved locally"
6. Disable airplane mode
7. Verify banner transitions to "Syncing scores..." then disappears
8. Check Supabase `hole_scores` table — all 3 entries present
9. Install to home screen (Android Chrome + iOS Safari) — verify icon, splash, standalone mode
10. Open installed app — verify start_url loads correctly

---

## Design System Compliance

- Colours: `#0D631B` (theme), `#0a1f0a` (splash/header), `#1A2E1A` (banner bg), `#F2F5F0` (banner text) — all from palette
- Font: DM Sans for banner text (app UI font)
- No gold, ivory, or off-palette accents
- No new fonts introduced
