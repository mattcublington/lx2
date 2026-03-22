/**
 * LX2 Design Token System — "The Fairway Editorial"
 * ─────────────────────────────────────────────────────────────────
 * v2 — Updated with the following fixes:
 *
 * [1] Green palette shifted from Material UI territory to ownable
 *     "Augusta + TrackMan" bottle-green. Richer, darker primary.
 * [2] applyClubTheme no longer overwrites semantic success/danger tokens.
 * [3] Responsive spacing: gutterMobile + gutterDesktop replace single
 *     pageGutter. Safe for 393px iPhone and 1440px desktop alike.
 * [4] bgDisabled token added for disabled button/input states.
 * [5] Competition colour layer added (leaderboard, match play, NTP/LD).
 * [6] Logo tokens expanded (icon, wordmark, inverse, subtle).
 * [7] Motion tokens added (fast, standard, slow, spring).
 * [8] tailwindThemeConfig wired to CSS variables (semantic-first).
 * [9] Spacing scale added for vertical rhythm.
 *
 * Typography: Manrope (display) + Lexend (body)
 * Colours: Augusta bottle-green palette + berry tertiary + warm surfaces
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
  // [6] Expanded logo token set for nav, dark mode, disabled, white-label
  icon:      '#2A7A3B',  // golfer icon — new signature green
  wordmark:  '#44483E',  // "SeventyTwo" text — secondary on-surface
  inverse:   '#FFFFFF',  // on dark backgrounds
  subtle:    '#C4C7BB',  // disabled / watermark use
  // Legacy aliases (kept for backwards compat)
  lxGrey:      '#666666',
  golferGreen: '#2A7A3B',
} as const

// ─── Core palette ─────────────────────────────────────────────────────────────

export const PALETTE = {

  // [1] Primary greens — "Augusta + TrackMan" — deeper, richer, ownable
  // Shifted away from Google Material green into bottle-green territory.
  green: {
    primary:          '#0F5A2E',  // primary — deeper than before, more Augusta
    primaryContainer: '#2A7A3B',  // primary_container — brighter signature accent
    highlight:        '#3FAF5A',  // new: bright accent for scores, CTAs
    50:  '#E8F5ED',
    100: '#C3E6CE',
    200: '#9DD6B0',
    300: '#6DC08A',
    400: '#3FAF5A',  // = highlight
    500: '#2A7A3B',  // = primaryContainer
    600: '#1F6030',
    700: '#154D26',
    800: '#0F5A2E',  // = primary
    900: '#083D1C',
  },

  // Berry tertiary — muted, used sparingly for highlights / negative data
  berry: {
    primary: '#923357',
    light:   '#F3C4D4',
    dark:    '#6B1F3E',
  },

  // [5] Competition colour layer — leaderboard, match play, NTP/LD
  competition: {
    leader:  '#D4AF37',  // gold — leader, best score
    chasing: '#2A7A3B',  // green — in contention (mirrors new primary)
    danger:  '#B43C3C',  // red — losing, over par (match play)
    neutral: '#72786E',  // grey — all square, no data
    eagle:   '#1A3E6E',  // deep blue — eagle or better
    birdie:  '#2A7A3B',  // green — birdie (mirrors chasing)
    par:     '#72786E',  // grey — par
    bogey:   '#B85C2A',  // rust — bogey
    double:  '#B43C3C',  // red — double bogey or worse
  },

  // Surface hierarchy — warm off-whites for tonal layering
  surface: {
    background:          '#F9FAF7',
    surface:             '#F4F6F1',
    containerLow:        '#EDEFEA',
    container:           '#E8EAE4',
    containerHigh:       '#E2E4DE',
    containerHighest:    '#DCDEDA',
    containerLowest:     '#FFFFFF',
    // [4] Disabled surface — between containerLow and container
    disabled:            '#EAECE7',
  },

  // On-surface text tokens — never pure black
  onSurface: {
    primary:   '#1A1C1C',
    secondary: '#44483E',
    tertiary:  '#72786E',
    disabled:  '#C4C7BB',
  },

  // Sage — scorecard / player surface background tones
  sage: {
    100: '#F0F4EC',
    200: '#E8F0E4',
    300: '#D8E4D0',
  },

  // Forest — deep text tones for player surface
  forest: {
    primary: '#1A2E1A',
    active:  '#2A5E30',
    accent:  '#3A7D44',
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
  fontDisplay: "'Manrope', system-ui, sans-serif",
  fontSans:    "'Lexend', system-ui, sans-serif",
  fontMono:    "'DM Mono', 'Courier New', monospace",

  googleFontsUrl: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Lexend:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap",

  scale: {
    displayLg:  { size: '3.5rem',    weight: 800, font: 'display' },
    displayMd:  { size: '2.5rem',    weight: 700, font: 'display' },
    headlineLg: { size: '2rem',      weight: 700, font: 'display' },
    headlineMd: { size: '1.75rem',   weight: 600, font: 'display' },
    headlineSm: { size: '1.25rem',   weight: 600, font: 'display' },
    titleLg:    { size: '1.125rem',  weight: 500, font: 'sans' },
    titleMd:    { size: '1rem',      weight: 500, font: 'sans' },
    bodyLg:     { size: '1rem',      weight: 400, font: 'sans' },
    bodyMd:     { size: '0.875rem',  weight: 400, font: 'sans' },
    labelLg:    { size: '0.875rem',  weight: 500, font: 'sans' },
    labelMd:    { size: '0.75rem',   weight: 500, font: 'sans' },
    labelSm:    { size: '0.6875rem', weight: 500, font: 'sans' },
  },
} as const

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const SPACING = {
  // [2] Responsive gutters — replaces single pageGutter
  // Use gutterMobile on player PWA; gutterDesktop on organiser/club
  gutterMobile:  '1rem',    // 16px — safe on 393px iPhone
  gutterDesktop: '2.5rem',  // 40px — editorial feel on desktop
  // [9] Vertical rhythm scale (px) — map to cards/sections/page blocks
  scale: [4, 8, 12, 16, 24, 32, 48, 64] as const,
  // Semantic aliases
  cardPad:      '1.25rem',  // 20px — inside cards (all breakpoints)
  gap:          '1.4rem',   // replaces divider lines
  sectionGap:   '2rem',     // 32px — between sections
  pageBlockGap: '3rem',     // 48px — between major page blocks
} as const

// ─── Shape ────────────────────────────────────────────────────────────────────

export const SHAPE = {
  radius: {
    sm:   '0.75rem',  // 12px — chips, scoring holes
    md:   '1rem',     // 16px — inputs, secondary buttons
    lg:   '1.5rem',   // 24px — main containers, primary buttons
    xl:   '2rem',     // 32px — cards, modals
    full: '9999px',   // pills
  },
} as const

// ─── Motion ───────────────────────────────────────────────────────────────────

// [7] Motion tokens — defines how the app feels, not just looks
export const MOTION = {
  fast:     '120ms ease-out',                    // score saves, button presses
  standard: '200ms cubic-bezier(0.4, 0, 0.2, 1)', // most transitions
  slow:     '320ms ease',                        // page transitions, modals
  spring:   '400ms cubic-bezier(0.34, 1.56, 0.64, 1)', // leaderboard shifts, celebrations
  // Usage guidance:
  //   Score saved / input feedback  → fast
  //   Leaderboard position change   → spring
  //   Modal open / page slide       → slow
  //   Button hover / chip select    → standard
} as const

// ─── Elevation ────────────────────────────────────────────────────────────────

export const ELEVATION = {
  float:       '0px 8px 24px rgba(26, 28, 28, 0.06)',
  ghostBorder: 'rgba(26, 28, 28, 0.20)',
} as const

// ─── Theme type ───────────────────────────────────────────────────────────────

export interface Theme {
  surface: 'player' | 'organiser' | 'club'

  // Tonal surface stack
  bgBackground:       string
  bgSurface:          string
  bgContainerLow:     string
  bgContainer:        string
  bgContainerHigh:    string
  bgContainerLowest:  string
  bgDisabled:         string  // [4] disabled interactive elements

  // Text
  textPrimary:   string
  textSecondary: string
  textTertiary:  string
  textDisabled:  string
  textInverse:   string

  // Actions
  accentPrimary:       string
  accentPrimaryHover:  string
  accentPrimaryText:   string
  accentContainer:     string
  accentContainerText: string

  // Tertiary (berry)
  tertiary:   string
  tertiaryBg: string

  // Borders
  borderGhost: string
  borderFocus: string

  // Semantic — never overwrite with brand colours
  success: string
  warning: string
  danger:  string
  info:    string

  // Logo
  logoIcon:     string
  logoWordmark: string
  logoInverse:  string
  logoSubtle:   string

  // Fonts
  fontDisplay: string
  fontSans:    string
  fontMono:    string

  // Spacing context — tells components which gutter to use
  gutter: string
}

// ─── Player theme ─────────────────────────────────────────────────────────────

export const playerTheme: Theme = {
  surface: 'player',

  bgBackground:      PALETTE.sage[100],
  bgSurface:         PALETTE.sage[100],
  bgContainerLow:    PALETTE.sage[200],
  bgContainer:       PALETTE.surface.containerLowest,
  bgContainerHigh:   PALETTE.surface.containerLowest,
  bgContainerLowest: PALETTE.surface.containerLowest,
  bgDisabled:        PALETTE.surface.disabled,  // [4]

  textPrimary:   PALETTE.forest.primary,
  textSecondary: '#6B8C6B',
  textTertiary:  '#8A9A8A',
  textDisabled:  PALETTE.onSurface.disabled,
  textInverse:   PALETTE.white,

  accentPrimary:       PALETTE.green.primary,          // #0F5A2E
  accentPrimaryHover:  PALETTE.green.primaryContainer,  // #2A7A3B
  accentPrimaryText:   PALETTE.white,
  accentContainer:     PALETTE.green.primaryContainer,
  accentContainerText: PALETTE.white,

  tertiary:   PALETTE.berry.primary,
  tertiaryBg: PALETTE.berry.light,

  borderGhost: PALETTE.forest.primary + '33',
  borderFocus: PALETTE.green.primary,

  success: PALETTE.green.primaryContainer,  // #2A7A3B
  warning: PALETTE.orange,
  danger:  '#B43C3C',
  info:    PALETTE.blue,

  logoIcon:     LOGO.icon,
  logoWordmark: LOGO.wordmark,
  logoInverse:  LOGO.inverse,
  logoSubtle:   LOGO.subtle,

  fontDisplay: TYPOGRAPHY.fontDisplay,
  fontSans:    TYPOGRAPHY.fontSans,
  fontMono:    TYPOGRAPHY.fontMono,

  gutter: SPACING.gutterMobile,  // player is always PWA
}

// ─── Organiser theme ──────────────────────────────────────────────────────────

export const organiserTheme: Theme = {
  surface: 'organiser',

  bgBackground:      PALETTE.surface.background,
  bgSurface:         PALETTE.surface.surface,
  bgContainerLow:    PALETTE.surface.containerLow,
  bgContainer:       PALETTE.surface.container,
  bgContainerHigh:   PALETTE.surface.containerHigh,
  bgContainerLowest: PALETTE.surface.containerLowest,
  bgDisabled:        PALETTE.surface.disabled,  // [4]

  textPrimary:   PALETTE.onSurface.primary,
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

  logoIcon:     LOGO.icon,
  logoWordmark: LOGO.wordmark,
  logoInverse:  LOGO.inverse,
  logoSubtle:   LOGO.subtle,

  fontDisplay: TYPOGRAPHY.fontDisplay,
  fontSans:    TYPOGRAPHY.fontSans,
  fontMono:    TYPOGRAPHY.fontMono,

  gutter: SPACING.gutterDesktop,  // organiser is always desktop
}

// ─── Club theme ───────────────────────────────────────────────────────────────

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
  name:          string
  primaryColour: string
  logoUrl?:      string
}

// [2] Fixed: semantic success/warning/danger/info tokens are NEVER overwritten.
// Club brand colour only affects action/accent tokens, not UX state signals.
export function applyClubTheme(base: Theme, club: ClubBrand): Theme {
  return {
    ...base,
    accentPrimary:       club.primaryColour,
    accentPrimaryHover:  club.primaryColour,
    accentContainer:     club.primaryColour,
    borderFocus:         club.primaryColour,
    // success / warning / danger / info intentionally preserved from base
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
    --bg-disabled:         ${theme.bgDisabled};

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

    --logo-icon:     ${theme.logoIcon};
    --logo-wordmark: ${theme.logoWordmark};
    --logo-inverse:  ${theme.logoInverse};
    --logo-subtle:   ${theme.logoSubtle};

    --font-display: ${theme.fontDisplay};
    --font-sans:    ${theme.fontSans};
    --font-mono:    ${theme.fontMono};

    --gutter: ${theme.gutter};

    --radius-sm: ${SHAPE.radius.sm};
    --radius-md: ${SHAPE.radius.md};
    --radius-lg: ${SHAPE.radius.lg};
    --radius-xl: ${SHAPE.radius.xl};

    --shadow-float: ${ELEVATION.float};

    --motion-fast:     ${MOTION.fast};
    --motion-standard: ${MOTION.standard};
    --motion-slow:     ${MOTION.slow};
    --motion-spring:   ${MOTION.spring};

    --spacing-card:       ${SPACING.cardPad};
    --spacing-gap:        ${SPACING.gap};
    --spacing-section:    ${SPACING.sectionGap};
    --spacing-page-block: ${SPACING.pageBlockGap};

    --competition-leader:  ${PALETTE.competition.leader};
    --competition-chasing: ${PALETTE.competition.chasing};
    --competition-danger:  ${PALETTE.competition.danger};
    --competition-neutral: ${PALETTE.competition.neutral};
    --score-eagle:  ${PALETTE.competition.eagle};
    --score-birdie: ${PALETTE.competition.birdie};
    --score-par:    ${PALETTE.competition.par};
    --score-bogey:  ${PALETTE.competition.bogey};
    --score-double: ${PALETTE.competition.double};
  `.trim()
}

// ─── Tailwind config ──────────────────────────────────────────────────────────

// [8] Semantic-first. Components use surface/text/accent/status classes.
// Raw palette exposed under `brand.*` for one-off uses only.
// Place the `colors` block in your tailwind.config.ts `theme.extend`.
export const tailwindThemeConfig = {
  colors: {
    // Raw palette — escape hatch, avoid in shared components
    brand: {
      green:  PALETTE.green,
      sage:   PALETTE.sage,
      forest: PALETTE.forest,
      berry:  PALETTE.berry,
    },

    // Semantic surfaces — these adapt across player/organiser/club themes
    surface: {
      background: 'var(--bg-background)',
      DEFAULT:    'var(--bg-surface)',
      low:        'var(--bg-container-low)',
      container:  'var(--bg-container)',
      high:       'var(--bg-container-high)',
      lowest:     'var(--bg-container-lowest)',
      disabled:   'var(--bg-disabled)',
    },

    text: {
      primary:   'var(--text-primary)',
      secondary: 'var(--text-secondary)',
      tertiary:  'var(--text-tertiary)',
      disabled:  'var(--text-disabled)',
      inverse:   'var(--text-inverse)',
    },

    accent: {
      DEFAULT: 'var(--accent-primary)',
      hover:   'var(--accent-primary-hover)',
      text:    'var(--accent-primary-text)',
    },

    status: {
      success: 'var(--success)',
      warning: 'var(--warning)',
      danger:  'var(--danger)',
      info:    'var(--info)',
    },

    // Competition layer — leaderboard, match play, score colours
    competition: {
      leader:  'var(--competition-leader)',
      chasing: 'var(--competition-chasing)',
      danger:  'var(--competition-danger)',
      neutral: 'var(--competition-neutral)',
    },
    score: {
      eagle:  'var(--score-eagle)',
      birdie: 'var(--score-birdie)',
      par:    'var(--score-par)',
      bogey:  'var(--score-bogey)',
      double: 'var(--score-double)',
    },
  },

  // Motion
  transitionDuration: {
    fast:     '120',
    standard: '200',
    slow:     '320',
    spring:   '400',
  },

  // Spacing scale
  spacing: {
    'card':       SPACING.cardPad,
    'gap':        SPACING.gap,
    'section':    SPACING.sectionGap,
    'page-block': SPACING.pageBlockGap,
    'gutter':     'var(--gutter)',  // resolves to mobile/desktop at runtime
  },

  borderRadius: {
    sm:   SHAPE.radius.sm,
    md:   SHAPE.radius.md,
    lg:   SHAPE.radius.lg,
    xl:   SHAPE.radius.xl,
    full: SHAPE.radius.full,
  },
} as const
