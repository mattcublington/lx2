# PRD: Brand & Design System

**Module:** `brand_system`
**Phase:** MVP
**Status:** Done
**Last updated:** March 2026

---

## Problem

A golf platform must convey quality and trust -- golfers are accustomed to premium club environments and will not engage with an app that looks cheap or inconsistent. LX2 needs a cohesive design system that establishes visual identity across marketing pages and in-app scoring/management interfaces, while being practical for a small team to maintain. The system must work within Next.js's CSS-in-JSX paradigm (no Tailwind for components, only globals.css) and use `next/font/google` for optimal font loading.

## Goal

Define and enforce a complete design system covering typography, colour palette, component patterns, and layout rules, documented in a style guide and embedded in project conventions (CLAUDE.md) so that all development stays on-brand.

## Users

- **Primary:** Developers building LX2 features who need clear design rules
- **Secondary:** Designers reviewing the product for visual consistency

## Core requirements

### Must have

#### Typography

| Font | CSS variable | Weight(s) | Use |
|------|-------------|-----------|-----|
| Manrope | `--font-manrope` | 800 | Marketing headings (homepage, landing) |
| Lexend | `--font-lexend` | 300-500 | Marketing body, form inputs, navigation |
| DM Serif Display | `--font-dm-serif` | 400 | App headings (play, scoring, auth, events) |
| DM Sans | `--font-dm-sans` | 300-700 | App body, UI labels, buttons, cards |

All fonts loaded via `next/font/google` in `layout.tsx` and referenced as CSS variables, not font-name strings.

#### Colour palette

| Token | Hex | Use |
|-------|-----|-----|
| Primary green | `#0D631B` | Buttons, accents, links |
| Hover green | `#0a4f15` | Button hover state (not #0a5216) |
| Header background | `#0a1f0a` | App header bar |
| Body text | `#1A2E1A` | Primary text colour |
| Muted text | `#6B8C6B` | Secondary/helper text |
| Light background (app) | `#F2F5F0` | Page backgrounds in app |
| Light background (marketing) | `#F6FAF6` | Page backgrounds on marketing pages |
| Card background | `#ffffff` | Card surfaces |
| Card border | `#E0EBE0` | Card and divider borders |
| Dark section background | `#1A2E1A` | Dark content sections |
| Footer background | `#111D11` | Site footer |

No gold, ivory, warm-cream, brass, or off-palette accent colours.

#### Component patterns

- **Marketing buttons**: `border-radius: 9999px` (pill), `font-family: Manrope`, `font-weight: 700`
- **App buttons**: `border-radius: 12px`, `font-family: DM Sans`, `font-weight: 600`
- **Cards**: white background, `#E0EBE0` border, 14-20px border-radius
- **Hover effects**: `translateY(-1px)` lift + deepened box-shadow, `transition: 0.15s`
- **Load animations**: `opacity 0->1` + `translateY(14px->0)`, staggered `animation-delay`

#### Layout rules

- App pages: full-width responsive, no `max-width: 480px` body constraint
- App body content: `max-width: 1200px`, `margin: 0 auto`, `padding: 0 32px`
- Two-column grid at `min-width: 768px`, single column on mobile
- App header: full-width `#0a1f0a` with radial gradient highlights and dot/noise texture overlay

### Should have

- Consistent icon style (if icons are introduced)
- Dark mode preparation (colour tokens that can be inverted)
- Motion/animation guidelines for page transitions

### Won't have (this phase)

- Component library package (design system is embedded in conventions, not a separate npm package)
- Figma/Sketch design tokens export
- Storybook documentation
- Theming support (multiple brand variants)

## Prohibited patterns

These patterns must not be used anywhere in the codebase:

- `max-width: 480px` as a body container
- Inventing new fonts, colours, or visual directions per-component
- Substituting DM Serif Display for another serif (Cormorant, Playfair, etc.)
- Using Tailwind utility classes in component JSX (Tailwind is only in `globals.css`)
- Gold, ivory, brass, warm-cream, or any off-palette accent colours
- Using font name strings instead of CSS variables

## CSS-in-JSX approach

LX2 uses inline `<style>` blocks within components rather than CSS Modules or styled-components. This keeps styles co-located with the component markup, avoids build-time CSS extraction complexity, and works well with server components. Example pattern:

```tsx
export default function Card({ children }) {
  return (
    <>
      <div className="card">{children}</div>
      <style>{`
        .card {
          background: #ffffff;
          border: 1px solid #E0EBE0;
          border-radius: 16px;
          padding: 24px;
        }
      `}</style>
    </>
  )
}
```

## Open questions

- [ ] Should we introduce CSS custom properties for all colour tokens (beyond fonts)?
- [ ] Do we need a dark mode for the app, or is the light green palette sufficient?
- [ ] Should we create a shared component library package in the monorepo for common UI elements?

## Links

- Style guide: `docs/brand/style-guide.md`
- Font loading: `apps/web/src/app/layout.tsx`
- Global CSS: `apps/web/src/app/globals.css`
- Homepage (marketing reference): `apps/web/src/app/page.tsx`
- Project conventions: `.claude/CLAUDE.md` (Design system section)
