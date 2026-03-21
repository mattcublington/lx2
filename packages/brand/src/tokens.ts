/**
 * LX2 Design Token System — "The Fairway Editorial"
 * ─────────────────────────────────────────────────────────────────
 * Grounded in the Stitch design system output + scorecard screenshot.
 *
 * Typography: Manrope (display) + Lexend (body)
 * Colours: Masters green palette + berry tertiary + warm surfaces
 * Philosophy: Tonal layering over borders. Whitespace as tool.
 *             No pure black. No 1px dividers. No harsh edges.
 *
 * Three surfaces:
 *   player     — on-course PWA + stats web (sage bg, green accents)
 *   organiser  — event management desktop (white bg, green CTAs)
 *   club       — club admin, white-labelable (organiser + overrides)
 */

// ─── Logo ─────────────────────────────────────────────────────────────────────

export const LOGO = {
  lxGrey:      '#666666',
  golferGreen: '#2E7D32',  // aligned to primary_container
} as const

// ─── Core palette — Stitch design system ─────────────────────────────────────

export const PALETTE = {

  // Primary greens — Masters heritage
  green: {
    primary:          '#0D631B',  // primary — critical actions, brand moments
    primaryContainer: '#2E7D32',  // primary_container — thematic blocks, active states
    50:  '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#2E7D32',  // = primaryContainer
    700: '#1B5E20',
    800: '#0D631B',  // = primary
    900: '#063D10',
  },

  // Berry tertiary — muted, used sparingly for highlights / negative data
  berry: {
    primary: '#923357',
    light:   '#F3C4D4',
    dark:    '#6B1F3E',
  },

  // Surface hierarchy — warm off-whites for tonal layering
  surface: {
    background:          '#F9FAF7',  // outermost page background
    surface:             '#F4F6F1',  // main content surface
    containerLow:        '#EDEFEA',  // subtle section backgrounds
    container:           '#E8EAE4',  // cards, list items
    containerHigh:       '#E2E4DE',  // elevated cards
    containerHighest:    '#DCDEDA',  // highest elevation (modals, overlays)
    containerLowest:     '#FFFFFF',  // primary interactive cards (lowest = whitest)
  },

  // On-surface text tokens — never pure black
  onSurface: {
    primary:   '#1A1C1C',  // on_surface — all "black" text
    secondary: '#44483E',  // secondary text
    tertiary:  '#72786E',  // placeholder, hint text
    disabled:  '#C4C7BB',  // disabled states
  },

  // Sage — scorecard background tones
  sage: {
    100: '#F0F4EC',  // scorecard page bg
    200: '#E8F0E4',  // active hole bg, score box bg
    300: '#D8E4D0',
  },

  // Forest — deep text tones from scorecard
  forest: {
    primary: '#1A2E1A',  // primary text in player surface
    active:  '#2A5E30',  // active borders, scorecard button
    accent:  '#3A7D44',  // interactive greens
  },

  white: '#FFFFFF',
  black: '#000000',

  // Player accent colours
  orange: '#E67E22',  // NTP indicator
  blue:   '#2A6DB5',
  rust:   '#B85C2A',
  purple: '#7A3AAD',
} as const

// ─── Typography — Manrope + Lexend ────────────────────────────────────────────

export const TYPOGRAPHY = {
  // Display & headlines — Manrope geometric, authoritative, modern
  fontDisplay: "'Manrope', system-ui, sans-serif",

  // Body & labels — Lexend, reduces cognitive load, legible in sunlight
  fontSans: "'Lexend', system-ui, sans-serif",

  // Monospace — scores, data, event codes
  fontMono: "'DM Mono', 'Courier New', monospace",

  googleFontsUrl: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Lexend:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap",

  scale: {
    // Display — Manrope
    displayLg:  { size: '3.5rem',   weight: 800, font: 'display' },
    displayMd:  { size: '2.5rem',   weight: 700, font: 'display' },
    headlineLg: { size: '2rem',     weight: 700, font: 'display' },
    headlineMd: { size: '1.75rem',  weight: 600, font: 'display' },
    headlineSm: { size: '1.25rem',  weight: 600, font: 'display' },
    // Body — Lexend
    titleLg:  { size: '1.125rem', weight: 500, font: 'sans' },
    titleMd:  { size: '1rem',     weight: 500, font: 'sans' },
    bodyLg:   { size: '1rem',     weight: 400, font: 'sans' },
    bodyMd:   { size: '0.875rem', weight: 400, font: 'sans' },
    labelLg:  { size: '0.875rem', weight: 500, font: 'sans' },
    labelMd:  { size: '0.75rem',  weight: 500, font: 'sans' },
    labelSm:  { size: '0.6875rem',weight: 500, font: 'sans' },
  },
} as const

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const SPACING = {
  pageGutter: '2.75rem',  // editorial feel — 44px
  cardPad:    '1.25rem',  // 20px
  gap:        '1.4rem',   // replaces divider lines
} as const

// ─── Shape ────────────────────────────────────────────────────────────────────

export const SHAPE = {
  radius: {
    sm:   '0.75rem',  // 12px — small interactive elements (chips, scoring holes)
    md:   '1rem',     // 16px — inputs, secondary buttons
    lg:   '1.5rem',   // 24px — main containers, primary buttons
    xl:   '2rem',     // 32px — cards, modals
    full: '9999px',   // pills
  },
} as const

// ─── Elevation — tonal, not shadow-based ─────────────────────────────────────

export const ELEVATION = {
  // Ambient shadow for truly floating elements only
  float: '0px 8px 24px rgba(26, 28, 28, 0.06)',
  // Ghost border fallback for accessibility (inputs)
  ghostBorder: 'rgba(26, 28, 28, 0.20)',
} as const

// ─── Theme type ───────────────────────────────────────────────────────────────

export interface Theme {
  surface: 'player' | 'organiser' | 'club'

  // Tonal surface stack (use these for layering, not borders)
  bgBackground:       string  // outermost page
  bgSurface:          string  // main content area
  bgContainerLow:     string  // section backgrounds
  bgContainer:        string  // cards
  bgContainerHigh:    string  // elevated cards
  bgContainerLowest:  string  // primary interactive (white)

  // Text
  textPrimary:   string
  textSecondary: string
  textTertiary:  string
  textDisabled:  string
  textInverse:   string

  // Actions
  accentPrimary:      string  // primary CTA
  accentPrimaryHover: string
  accentPrimaryText:  string  // text ON primary
  accentContainer:    string  // active states, selected
  accentContainerText: string

  // Tertiary (berry) — use sparingly
  tertiary:     string
  tertiaryBg:   string

  // Borders — ghost only, never solid
  borderGhost: string  // accessibility borders at 20% opacity
  borderFocus: string  // focus ring

  // Semantic
  success: string
  warning: string
  danger:  string
  info:    string

  // Logo
  logoLX:     string
  logoGolfer: string

  // Fonts
  fontDisplay: string
  fontSans:    string
  fontMono:    string
}

// ─── Player theme — sage backgrounds, on-course + stats web ──────────────────

export const playerTheme: Theme = {
  surface: 'player',

  bgBackground:      PALETTE.sage[100],        // #F0F4EC
  bgSurface:         PALETTE.sage[100],
  bgContainerLow:    PALETTE.sage[200],        // #E8F0E4
  bgContainer:       PALETTE.surface.containerLowest,  // white cards
  bgContainerHigh:   PALETTE.surface.containerLowest,
  bgContainerLowest: PALETTE.surface.containerLowest,

  textPrimary:   PALETTE.forest.primary,   // #1A2E1A
  textSecondary: '#6B8C6B',
  textTertiary:  '#8A9A8A',
  textDisabled:  PALETTE.onSurface.disabled,
  textInverse:   PALETTE.white,

  accentPrimary:       PALETTE.green.primary,          // #0D631B
  accentPrimaryHover:  PALETTE.green.primaryContainer,
  accentPrimaryText:   PALETTE.white,
  accentContainer:     PALETTE.green.primaryContainer,  // #2E7D32
  accentContainerText: PALETTE.white,

  tertiary:   PALETTE.berry.primary,
  tertiaryBg: PALETTE.berry.light,

  borderGhost: PALETTE.forest.primary + '33',  // 20% opacity
  borderFocus: PALETTE.green.primary,

  success: PALETTE.green.primaryContainer,
  warning: PALETTE.orange,
  danger:  '#B43C3C',
  info:    PALETTE.blue,

  logoLX:     LOGO.lxGrey,
  logoGolfer: PALETTE.green.primaryContainer,

  fontDisplay: TYPOGRAPHY.fontDisplay,
  fontSans:    TYPOGRAPHY.fontSans,
  fontMono:    TYPOGRAPHY.fontMono,
}

// ─── Organiser theme — clean white, desktop event management ─────────────────

export const organiserTheme: Theme = {
  surface: 'organiser',

  bgBackground:      PALETTE.surface.background,    // #F9FAF7
  bgSurface:         PALETTE.surface.surface,
  bgContainerLow:    PALETTE.surface.containerLow,
  bgContainer:       PALETTE.surface.container,
  bgContainerHigh:   PALETTE.surface.containerHigh,
  bgContainerLowest: PALETTE.surface.containerLowest,

  textPrimary:   PALETTE.onSurface.primary,    // #1A1C1C
  textSecondary: PALETTE.onSurface.secondary,
  textTertiary:  PALETTE.onSurface.tertiary,
  textDisabled:  PALETTE.onSurface.disabled,
  textInverse:   PALETTE.white,

  accentPrimary:       PALETTE.green.primary,
  accentPrimaryHover:  PALETTE.green.primaryContainer,
  accentPrimaryText:   PALETTE.white,
  accentContainer:     PALETTE.green.primaryContainer,
  accentContainerText: PALETTE.white,

  tertiary:   PALETTE.berry.primary,
  tertiaryBg: PALETTE.berry.light,

  borderGhost: PALETTE.onSurface.primary + '33',
  borderFocus: PALETTE.green.primary,

  success: PALETTE.green.primaryContainer,
  warning: '#D97706',
  danger:  '#DC2626',
  info:    '#2563EB',

  logoLX:     PALETTE.onSurface.secondary,
  logoGolfer: PALETTE.green.primaryContainer,

  fontDisplay: TYPOGRAPHY.fontDisplay,
  fontSans:    TYPOGRAPHY.fontSans,
  fontMono:    TYPOGRAPHY.fontMono,
}

// ─── Club theme — customisable ────────────────────────────────────────────────

export const clubTheme: Theme = {
  ...organiserTheme,
  surface: 'club',
}

export const themes = {
  player:    playerTheme,
  organiser: organiserTheme,
  club:      clubTheme,
} as const

// ─── Club branding ────────────────────────────────────────────────────────────

export interface ClubBrand {
  name: string
  primaryColour: string
  logoUrl?: string
}

export function applyClubTheme(base: Theme, club: ClubBrand): Theme {
  return {
    ...base,
    accentPrimary:       club.primaryColour,
    accentPrimaryHover:  club.primaryColour,
    accentContainer:     club.primaryColour,
    borderFocus:         club.primaryColour,
    success:             club.primaryColour,
  }
}

// ─── CSS variables ────────────────────────────────────────────────────────────

export function getCSSVars(theme: Theme): string {
  return `
    --bg-background:       ${theme.bgBackground};
    --bg-surface:          ${theme.bgSurface};
    --bg-container-low:    ${theme.bgContainerLow};
    --bg-container:        ${theme.bgContainer};
    --bg-container-high:   ${theme.bgContainerHigh};
    --bg-container-lowest: ${theme.bgContainerLowest};

    --text-primary:   ${theme.textPrimary};
    --text-secondary: ${theme.textSecondary};
    --text-tertiary:  ${theme.textTertiary};
    --text-disabled:  ${theme.textDisabled};
    --text-inverse:   ${theme.textInverse};

    --accent-primary:        ${theme.accentPrimary};
    --accent-primary-hover:  ${theme.accentPrimaryHover};
    --accent-primary-text:   ${theme.accentPrimaryText};
    --accent-container:      ${theme.accentContainer};
    --accent-container-text: ${theme.accentContainerText};

    --tertiary:    ${theme.tertiary};
    --tertiary-bg: ${theme.tertiaryBg};

    --border-ghost: ${theme.borderGhost};
    --border-focus: ${theme.borderFocus};

    --success: ${theme.success};
    --warning: ${theme.warning};
    --danger:  ${theme.danger};
    --info:    ${theme.info};

    --logo-lx:     ${theme.logoLX};
    --logo-golfer: ${theme.logoGolfer};

    --font-display: ${theme.fontDisplay};
    --font-sans:    ${theme.fontSans};
    --font-mono:    ${theme.fontMono};

    --radius-sm: ${SHAPE.radius.sm};
    --radius-md: ${SHAPE.radius.md};
    --radius-lg: ${SHAPE.radius.lg};
    --radius-xl: ${SHAPE.radius.xl};

    --shadow-float: ${ELEVATION.float};
    --page-gutter:  ${SPACING.pageGutter};
  `.trim()
}

export const tailwindColors = {
  brand: {
    green:  PALETTE.green,
    sage:   PALETTE.sage,
    forest: PALETTE.forest,
    berry:  PALETTE.berry,
  },
} as const
