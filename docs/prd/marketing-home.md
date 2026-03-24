# PRD: Marketing Homepage

**Module:** `marketing_home`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

LX2 needs a public homepage that communicates its value proposition to society organisers and golfers who land on lx2.golf for the first time. The page must work as both a marketing tool (convince new users to sign up) and a quick-access hub (let returning users sign in or jump directly to an event via code).

## Goal

A single-page marketing site at lx2.golf that converts visitors to sign-ups and provides instant access to events via shareable codes.

## Users

- **Primary:** Society organisers evaluating LX2 for the first time (likely arrived via word of mouth or WhatsApp link)
- **Secondary:** Returning players who need to sign in or join an event by code
- **Tertiary:** Club secretaries researching digital scoring platforms

## Core requirements

### Must have

- Full-viewport hero section with background image (`/hero.png`), dark gradient overlay (160deg, multi-stop), and centred content
- Headline: multi-line with `Manrope` 800 weight, `clamp(2rem, 5.5vw, 3.5rem)`, white text with text-shadow
- Subheading: "One platform for golfers, societies, and clubs" in `Lexend` 300 weight
- Two CTA buttons: "Get started free" (pill, `#0D631B` background, Manrope 700) and "Sign in" (glass-morphism pill with `backdrop-filter: blur(8px)`)
- Event code input row: label + text input + "Join" button — navigates to `/events/[code]` on submit
- Scroll indicator at bottom of hero (animated bouncing chevron)
- "How it works" section: 3-step grid (Create event, Players join via link, Live scores) on white background
- Features section: 2x2 card grid (Multiple formats, Live leaderboard, No app needed, Handicap tracking) on `#F6FAF6` background
- Bottom CTA section: dark background (`#1A2E1A`), "Ready to run your first event?" with sign-up button
- Footer: `#111D11` background, navigation links, copyright
- Navigation bar: absolute positioned over hero, logo (SVG, inverted white), nav links, sign-in button
- Auth-aware: shows "Dashboard" link instead of "Sign in" for authenticated users (checked client-side via `supabase.auth.getUser()`)
- Staggered rise animations on all hero elements (`opacity 0->1`, `translateY(14px->0)`, sequential delays 0.2s-0.9s)

### Should have

- Responsive breakpoint at 768px: single-column steps, stacked CTAs, reduced padding
- Mobile nav hides text links, keeps logo and sign-in button
- Hover effects: buttons lift with `translateY(-1px)` and deepened box-shadow

### Won't have (this phase)

- Pricing section
- Testimonials or social proof
- Blog or content pages
- Video demo embed
- Multi-language support

## Design tokens

| Token | Value |
|-------|-------|
| Heading font | `Manrope` 800 via `--font-manrope` |
| Body font | `Lexend` 300 via `--font-lexend` |
| Primary green | `#0D631B` |
| Hover green | `#0a4f15` |
| Body text | `#1A2E1A` |
| Muted text | `#6B8C6B` |
| Marketing light bg | `#F6FAF6` |
| Card border | `#E0EBE0` |
| Dark section bg | `#1A2E1A` |
| Footer bg | `#111D11` |
| Button radius | `9999px` (pill) |

## Page sections

1. **Nav** — absolute, full-width, `z-index: 20`, transparent over hero
2. **Hero** — `min-height: 100dvh`, flex column, background image with gradient overlay
3. **How it works** — white bg, 3-column grid (1-column on mobile), numbered steps
4. **Features** — `#F6FAF6` bg, 2-column card grid (1-column on mobile), icon + title + description
5. **Bottom CTA** — `#1A2E1A` bg, centred heading + button
6. **Footer** — `#111D11` bg, flex row (column on mobile), links + copyright

## Technical notes

- Client component (`'use client'`) — needs `useState` for event code input and `useEffect` for auth check
- CSS-in-JSX via inline `<style>` block (not Tailwind, not CSS modules)
- All fonts loaded in `layout.tsx` via `next/font/google`, referenced as CSS variables
- Hero image: `/hero.png` loaded via CSS `background` (not `next/image`) for full-bleed cover
- Logo: `/lx2-logo.svg` loaded via `next/image` with `brightness(0) invert(1)` filter for white version

## Open questions

- [ ] Should we add a "For Clubs" section targeting club secretaries?
- [ ] Do we need cookie consent / GDPR banner?
- [ ] Should the event code input validate format before navigating?

## Links

- Component: `apps/web/src/app/page.tsx`
- Layout (fonts): `apps/web/src/app/layout.tsx`
- Hero image: `apps/web/public/hero.png`
- Logo: `apps/web/public/lx2-logo.svg`
