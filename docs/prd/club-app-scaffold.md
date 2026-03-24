# PRD: Club Console Scaffold

**Module:** `club_app_scaffold`
**Phase:** MVP
**Status:** Building
**Last updated:** March 2026

---

## Problem

Golf clubs in the UK currently rely on legacy management platforms (intelligentgolf, Club Systems, ClubV1) that are slow, dated in design, and built as monolithic desktop-first applications. Club administrators, front desk staff, and pros struggle with clunky interfaces that haven't meaningfully evolved in a decade. There is no modern, responsive web application that provides a clean admin console for day-to-day club operations.

LX2 needs a dedicated club-facing application separate from the player PWA. This console must be the foundation upon which all club management modules (tee sheet, members, competitions, billing) are built. It must feel professional, fast, and familiar to staff who may be non-technical.

## Goal

Deliver a production-ready club console shell with authenticated navigation, dark sidebar layout, and route structure that all subsequent club modules plug into.

## Users

- **Primary:** Club administrator (general manager, secretary, office staff)
- **Secondary:** PGA professional, front desk staff, committee members

## Core requirements

### Must have

- Next.js 15 App Router application at `apps/club/` serving `club.lx2.golf`
- Supabase SSR auth with email/password login (Google OAuth stretch goal)
- Protected route group `(console)` with auth middleware redirecting unauthenticated users to `/auth/login`
- Dark sidebar layout (`#1E293B` background) with navigation links: Dashboard, Tee Sheet, Members, Competitions, Sheet Config
- Active nav item highlighted with `#0D631B` accent
- Sidebar collapses to icon-only on mobile (hamburger toggle)
- Signed-in user email displayed in sidebar footer with sign-out button
- Root layout with LX2 branding and appropriate meta tags
- Console layout with `(console)/layout.tsx` wrapping all authenticated pages
- Each nav item routes to a placeholder page that subsequent modules will replace
- Loading states for route transitions
- Responsive: sidebar overlay on `< 768px`, persistent on `>= 768px`

### Should have

- Club name displayed in sidebar header (fetched from Supabase `clubs` table)
- Breadcrumb component for nested routes (e.g. Members > Edit Member)
- Toast notification system for success/error feedback
- Global error boundary with branded error page
- Keyboard shortcut support (e.g. `Cmd+K` for quick navigation)

### Won't have (this phase)

- Role-based access control (see `club_auth` PRD)
- Multi-club switching
- Custom theming per club
- Offline support

## Technical architecture

### Route structure

```
apps/club/src/app/
  layout.tsx                 — root layout, fonts, metadata
  page.tsx                   — redirect to /auth/login or /dashboard
  globals.css                — base styles
  auth/
    login/page.tsx           — login form
    callback/route.ts        — OAuth callback
  (console)/
    layout.tsx               — sidebar + main content area
    dashboard/page.tsx       — admin dashboard
    tee-sheet/page.tsx       — tee sheet view
    members/page.tsx         — member list
    competitions/page.tsx    — competition calendar
    sheet-config/page.tsx    — tee sheet configuration
```

### Auth flow

1. User visits `club.lx2.golf` — middleware checks Supabase session
2. No session: redirect to `/auth/login`
3. User signs in with email/password via Supabase Auth
4. Callback sets session cookie, redirects to `/dashboard`
5. Middleware on `(console)` routes validates session on every request
6. Sign out clears session and redirects to `/auth/login`

### Sidebar component

- Fixed-position sidebar, `width: 260px` on desktop
- Background `#1E293B`, text `#94A3B8`, active text `#FFFFFF`
- Active indicator: left border `3px solid #0D631B`
- Nav items with icons (Lucide React icon set)
- Footer section: user avatar placeholder, email, sign-out link
- Mobile: hidden by default, slides in as overlay with backdrop

### Supabase integration

- `@supabase/ssr` for server-side session management
- `createServerClient` in `lib/supabase/server.ts`
- `createBrowserClient` in `lib/supabase/client.ts`
- Middleware in `src/middleware.ts` refreshing session on each request

## Open questions

- [ ] Should the sidebar support a "mini" collapsed state on desktop as well as mobile?
- [ ] Do we need a separate Supabase project for the club app or share with the player app?
- [ ] What is the club onboarding flow — how does a club first get set up in the system?
- [ ] Should we support dark mode for the main content area, or only the sidebar is dark?

## Links

- Component: `apps/club/src/app/(console)/layout.tsx`
- Component: `apps/club/src/middleware.ts`
- Component: `apps/club/src/app/auth/login/page.tsx`
- Related PRD: `docs/prd/club-auth.md`
- Related PRD: `docs/prd/club-admin-dashboard.md`
