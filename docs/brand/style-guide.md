# LX2 Brand Style Guide — "The Fairway Editorial"

**Version:** 2.0 · March 2026  
**Source of truth:** `packages/brand/src/tokens.ts`  
**Design system:** Adopted from Google Stitch output, grounded in scorecard screenshot

---

## Creative North Star

**"The Fairway Editorial"** — a premium digital caddy. High-end editorial meets precision athletic instrumentation. Oversized Manrope display type. Tonal layering over borders. Whitespace as a functional tool. As wide and open as a fairway.

---

## Logo

- **LX** — Manrope 800, `#666666` charcoal. On dark: `#9E9E9E`.
- **2** — Custom golfer figure mid-swing. Always `#2E7D32`. This is the brand's visual hook.
- Never recolour the golfer figure.
- Never separate LX from the figure.
- Minimum digital size: 80px wide.

---

## Typography

### Display: Manrope
Hole numbers, scores, hero headings, section titles.  
`font-family: 'Manrope', system-ui, sans-serif`  
Weights: 400, 500, 600, 700, 800

### Body: Lexend
All UI text, labels, body copy, navigation.  
Designed to reduce cognitive load — essential for reading stats in bright sunlight.  
`font-family: 'Lexend', system-ui, sans-serif`  
Weights: 300, 400, 500

### Mono: DM Mono
Score columns, event codes, data tables.  
`font-family: 'DM Mono', monospace`

Google Fonts URL: see `TYPOGRAPHY.googleFontsUrl` in tokens.

---

## Colours

### Brand greens
| Token | Hex | Use |
|-------|-----|-----|
| `green.primary` | `#0D631B` | Critical CTAs, brand moments |
| `green.primaryContainer` | `#2E7D32` | Active states, thematic blocks |

### Surfaces (tonal layering — no borders)
| Token | Hex | Use |
|-------|-----|-----|
| `surface.background` | `#F9FAF7` | Organiser page bg |
| `sage.100` | `#F0F4EC` | Player page bg (from scorecard) |
| `sage.200` | `#E8F0E4` | Active states, score box |
| `surface.containerLowest` | `#FFFFFF` | Primary interactive cards |

### Text — never pure black
| Token | Hex | Use |
|-------|-----|-----|
| `onSurface.primary` | `#1A1C1C` | All "black" text |
| `forest.primary` | `#1A2E1A` | Player surface primary text |
| `onSurface.secondary` | `#44483E` | Secondary text |
| `onSurface.tertiary` | `#72786E` | Hints, placeholders |

### Berry tertiary — use sparingly
`#923357` — muted berry for data highlights, negative stats, contrast moments.

---

## The "No-Line" Rule

Never use 1px solid borders for sectioning. Boundaries are defined by tonal shifts:

```
#F0F4EC page → #FFFFFF card = natural lift, no border needed
```

Ghost borders for accessibility only: `rgba(26,28,28,0.20)` — 20% opacity.

---

## Elevation

Float shadow (truly floating elements only):
```css
box-shadow: 0px 8px 24px rgba(26, 28, 28, 0.06);
```

Glassmorphism: desktop overlays and tooltips only. Not on mobile/on-course — contrast is critical outdoors.

---

## Corner radius

```
sm: 0.75rem (12px) — scoring hole chips, small elements
md: 1rem    (16px) — inputs, secondary buttons  
lg: 1.5rem  (24px) — primary buttons, main cards
xl: 2rem    (32px) — large cards, modals
```

---

## Three surfaces

### Player (on-course PWA + stats web)
```
bg: #F0F4EC (sage)  |  text: #1A2E1A  |  CTA: linear-gradient(#0D631B, #2E7D32)
Active: #E8F0E4  |  Score numbers: #2E7D32
```

### Organiser (desktop event management)
```
bg: #F9FAF7  |  text: #1A1C1C  |  CTA: #0D631B  |  Border: ghost rgba only
```

### Club (white-label, customisable)
Identical to organiser. `applyClubTheme()` overrides:
- `primaryColour` → all green accents
- `logoUrl` → club logo in nav
- `darkMode` → optional

---

## Do's
- Use whitespace as a functional tool
- Use `2.75rem` page gutters for editorial feel
- Rely on typographic scale before colour
- Use Manrope 800 for large numbers and scores

## Don'ts
- Don't use `#000000` — use `#1A1C1C` or `#1A2E1A`
- Don't use 1px dividers — use `1.4rem` spacing gap instead
- Don't use default `0.5rem` radius for everything
- Don't use glassmorphism on mobile/on-course views
