# LX2 Brand Overrides — The Fairway Editorial

## IMPORTANT: These overrides take absolute priority over any generated design system.

## Source of truth
All design decisions must comply with: `packages/brand/src/tokens.ts`

## Colour palette (DO NOT CHANGE)
- Primary: #0D631B (Augusta bottle-green)
- Primary hover: #0A4F15
- Primary light: #E8F5E9
- Background (marketing): #F2F5F0
- Background (app): #FFFFFF
- Text primary: #1A2E1A
- Text secondary: #4A5E4A
- Border: #E0EBE0
- Success: #2E7D32
- Warning: #F57F17
- Danger: #C62828
- Info: #1565C0

## Competition colours (DO NOT CHANGE)
- Eagle or better: #1565C0 (blue)
- Birdie: #C62828 (red)
- Par: #1A2E1A (dark green)
- Bogey: #4A5E4A (muted)
- Double+: #9E9E9E (grey)

## Typography (DO NOT CHANGE)
### Marketing surface
- Display: Manrope 800
- Body: Lexend 400
- Mono: DM Mono 400

### App surface
- Display: DM Serif Display 400
- Body: DM Sans 400

## Spacing & radius (DO NOT CHANGE)
- Button radius: 9999px (pill) on marketing, 12px on app
- Card radius: 14-20px
- Page gutter mobile: 16px
- Page gutter desktop: 24px

## Marketing homepage hero (DO NOT CHANGE)
- The hero must always be a full-bleed image (`hero.jpg` as `position: absolute; inset: 0; object-fit: cover`)
- A gradient overlay sits between the image and the text: `linear-gradient(135deg, rgba(10,31,10,0.78) 0%, rgba(10,31,10,0.52) 55%, rgba(10,31,10,0.28) 100%)`
- All hero text and CTAs are white / rgba(255,255,255,…)
- The nav header (`#0a1f0a`) is a separate sticky bar above the hero — it must never double as a hero
- Never reduce the hero to a flat-colour rectangle or a two-column split that hides the image on mobile

## Design philosophy (DO NOT CHANGE)
- Tonal layering over borders
- Whitespace as a functional tool
- No pure black (#000000)
- No 1px dividers
- No harsh edges
- Premium editorial meets athletic precision

## WHAT I AM OPEN TO SUGGESTIONS ON
- Animation and micro-interactions (within the motion token framework: fast 150ms, standard 250ms, slow 400ms)
- Component layout patterns (card arrangements, grid vs list, information hierarchy)
- Mobile interaction patterns (swipe gestures, pull-to-refresh, haptic feedback)
- Icon style recommendations
- Empty state and loading state designs
- Onboarding flow patterns
- Data visualisation approaches for stats/scores
- Accessibility improvements
- Dark mode token suggestions (not yet implemented)
