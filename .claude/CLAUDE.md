# LX2 — Claude Instructions

## Git workflow

Commit and push directly to `main`. Do not create feature branches or PRs unless explicitly asked.

## Project

Golf scoring and society management platform. Turborepo monorepo.

| App | Port | URL |
|-----|------|-----|
| `apps/web` | 3000 | lx2.golf — player PWA |
| `apps/club` | 3001 | club.lx2.golf — organiser app |
| `apps/architecture` | 3002 | local only — architecture control tower |

Start a server: use the `.claude/launch.json` configurations, not `cd && npm run dev`.

## Stack

- Next.js 15 App Router — server components by default; `'use client'` only when interactivity or browser APIs are needed
- Supabase — auth (Google OAuth) + Postgres database
- CSS-in-JSX `<style>` blocks for component styles; Tailwind only in `globals.css`
- TypeScript strict mode

## Coding rules

- All Next.js 15 request APIs are async: `await cookies()`, `await headers()`, `await params`, `await searchParams`
- Use `const` instead of `let` when a variable is never reassigned
- No unescaped entities in JSX — use `&apos;` `&quot;` `&amp;` etc.
- No `any` types without an inline comment explaining why
- Server actions for mutations; route handlers for public/webhook APIs

## Design system — DO NOT DEVIATE FROM THIS

### Fonts

Use only these fonts. Do not introduce new typefaces.

| Font | CSS variable | Use |
|------|-------------|-----|
| `Manrope` 800 | `--font-manrope` | Marketing headings (homepage) |
| `Lexend` 300–500 | `--font-lexend` | Marketing body + inputs (homepage) |
| `DM Serif Display` 400 | `--font-dm-serif` | App headings (play, scoring, auth) |
| `DM Sans` 300–700 | `--font-dm-sans` | App body + UI labels (play, scoring, auth) |

All loaded via `next/font/google` in `apps/web/src/app/layout.tsx`. Reference as CSS variables, not font name strings.

### Colours

```
Primary green (buttons, accents):  #0D631B
Hover green:                       #0a4f15  (not #0a5216)
Header background:                 #0a1f0a
Body text:                         #1A2E1A
Muted/secondary text:              #6B8C6B
Light section background:          #F2F5F0  (app) / #F6FAF6 (marketing)
Card background:                   #ffffff
Card border:                       #E0EBE0
Dark section background:           #1A2E1A
Footer background:                 #111D11
```

No gold, ivory, warm-cream, brass, or off-palette accent colours.

### Components

- **Buttons (marketing)**: `border-radius: 9999px` (pill shape), `font-family: Manrope`, `font-weight: 700`
- **Buttons (app)**: `border-radius: 12px`, `font-family: DM Sans`, `font-weight: 600`
- **Cards**: white background, `#E0EBE0` border, 14–20px border-radius
- **Hover**: `translateY(-1px)` lift + deepened box-shadow, `transition: 0.15s`
- **Load animation**: `opacity 0→1` + `translateY(14px→0)`, staggered `animation-delay`

### Layout

- App pages: full-width responsive; no `max-width: 480px` on body content
- App page body: `max-width: 1200px`, `margin: 0 auto`, `padding: 0 32px`
- Two-column grid at `min-width: 768px`; single column mobile
- App header: full-width `#0a1f0a` with radial gradient highlights + dot/noise texture overlay

### What NOT to do

- Do not use `max-width: 480px` as a body container
- Do not invent new fonts, colours, or visual directions per-component
- Do not use design skills to rebrand — use them to improve layout/quality within this system
- Do not switch DM Serif Display for another serif (Cormorant, Playfair, etc.)

## Key files

- `apps/web/src/app/layout.tsx` — font loading, metadata
- `apps/web/src/app/globals.css` — base reset
- `apps/web/src/app/page.tsx` — marketing homepage
- `apps/web/src/app/play/PlayDashboard.tsx` — player dashboard (responsive two-column)
- `apps/web/src/app/auth/callback/route.ts` — Google OAuth callback; upserts `users` table with `display_name` from `user.user_metadata.full_name`
- `apps/architecture/src/app/LX2Architecture.tsx` — architecture control tower (~1,250 lines, single file)
- `apps/architecture/HANDOFF.md` — how to replicate the control tower for a new project

## Session Learnings — append after each significant session

### [Date] — [brief topic]
- What we tried:
- What broke / didn't work:
- What to do instead:
- Any new patterns established:

### 2026-03-24 — Stale .next artifacts causing MODULE_NOT_FOUND on all event pages
- What we tried: Static analysis of all event-related server components (new wizard, manage, leaderboard, score, [id]) — no code-level bug found
- What broke / didn't work: `MODULE_NOT_FOUND: Cannot find module './116.js'` — webpack-runtime.js referenced `./116.js` relative to `.next/server/` but only `.next/server/chunks/116.js` existed. All event page bundles affected. Streaming SSR caused partial render: share card flushed before failure, so "header renders fine but below crashes"
- What to do instead: Delete `apps/web/.next` and restart the dev server. Stop the server first (can't delete .next while running). Root cause: mixed build artifacts from different webpack chunk layouts
- Any new patterns established: When server components crash mid-stream (partial HTML visible), check `preview_logs` for MODULE_NOT_FOUND before doing static analysis. Stale `.next` = first thing to clear when unexplained crashes appear after switching branches or builds
